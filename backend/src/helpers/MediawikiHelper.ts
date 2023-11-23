import axios, { AxiosInstance } from 'axios';
import https from 'https';
import logger from '../logger';
import MediaWikiAutomator from './PlaywrightHelper';
import WikipediaApiInteractor from './WikipediaApiInteractor';
import { refineArticleChanges } from './parsingHelper';
import { updateCurrentHtmlContent, upsertChanges } from './supabaseHelper';

const wikiApi = new WikipediaApiInteractor();

const wikiadviserLanguages = ['en', 'fr'];
const mediaWikiApi: Record<string, AxiosInstance> = {};
for (const language of wikiadviserLanguages) {
  mediaWikiApi[language] = axios.create({
    baseURL: `${process.env.MEDIAWIKI_ENDPOINT}/${language}/api.php`,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });
}

const { MW_BOT_USERNAME, MW_BOT_PASSWORD } = process.env;

function extractCookies(setCookieHeaders: any) {
  const cookies = setCookieHeaders.reduce((acc: any, header: any) => {
    const cookieKeyValue = header.split(';')[0];
    const [key, value] = cookieKeyValue.split('=');
    acc[key.trim()] = value.trim();
    return acc;
  }, {});

  return cookies;
}

function setCookies(response: any, language: string) {
  const setCookieHeaders = response.headers['set-cookie'];
  const cookies = extractCookies(setCookieHeaders);
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');

  if (typeof cookieHeader !== 'string') {
    throw new Error('Type mismatch: set-cookie is not string');
  }

  // Assign session to the current axios instance
  mediaWikiApi[language].defaults.headers.Cookie = cookieHeader;
}

async function loginAndGetCsrf(language: string) {
  const tokenResponse = await mediaWikiApi.get('', {
    params: {
      action: 'query',
      meta: 'tokens',
      type: 'login',
      format: 'json'
    }
  });
  const { logintoken } = tokenResponse.data.query.tokens;
  setCookies(tokenResponse, language);

  const loginResponse = await mediaWikiApi[language].post(
    '',
    {
      action: 'login',
      lgname: MW_BOT_USERNAME,
      lgpassword: MW_BOT_PASSWORD,
      lgtoken: logintoken,
      format: 'json'
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const { login: loginstatus } = loginResponse.data;

  if (loginstatus.result !== 'Success') {
    throw new Error(
      loginstatus.reason ??
        `Failed to login to mediawiki as Bot:${MW_BOT_USERNAME}`
    );
  }
  setCookies(loginResponse, language);

  const { data } = await mediaWikiApi[language].get('', {
    params: {
      action: 'query',
      meta: 'tokens',
      format: 'json'
    }
  });

  const { csrftoken } = data.query.tokens;

  if (csrftoken === '+\\') {
    throw new Error('Failed to get csrftoken');
  }

  return csrftoken;
}

async function logout(csrftoken: string, language: string) {
  const { data } = await mediaWikiApi[language].post(
    '',
    {
      action: 'logout',
      token: csrftoken,
      format: 'json'
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const { error } = data;

  if (error) {
    throw new Error(error.info);
  }
}

export async function deleteArticleMW(articleId: string, language: string) {
  const csrftoken = await loginAndGetCsrf(language);

  const { data } = await mediaWikiApi[language].post(
    '',
    {
      action: 'delete',
      title: articleId,
      token: csrftoken,
      format: 'json'
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  if (data.error) {
    logout(csrftoken, language);
    if (data.error.code !== 'missingtitle') {
      // Throw error only when its other than "The page you specified doesn't exist." else log error.
      throw new Error(
        `Failed to delete article with id ${articleId}: ${data.error.info}`
      );
    } else {
      logger.error(
        `Failed to delete article with id ${articleId}: ${data.error.info}`
      );
    }
  }
  logout(csrftoken, language);
}

async function renameArticle(
  title: string,
  articleId: string,
  language: string
): Promise<void> {
  const csrftoken = await loginAndGetCsrf(language);

  logger.info(
    `Renaming Article ${title} to its corresponding id: ${articleId}`
  );

  const { data } = await mediaWikiApi[language].post(
    '',
    {
      action: 'move',
      from: title,
      to: articleId,
      noredirect: true,
      token: csrftoken,
      format: 'json'
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  if (data.error) {
    logger.error(`Failed to rename article: ${data.error.info}`);
    logout(csrftoken, language);
    throw new Error(`Failed to rename article with id ${articleId}`);
  }
  logout(csrftoken, language);
}

export async function importNewArticle(
  articleId: string,
  title: string,
  language: string
): Promise<void> {
  try {
    // Export
    logger.info(`Exporting file ${title}`);
    const exportData = await wikiApi.exportArticleData(title, language);
    logger.info(`Successfully exported file ${title}`);

    // Import
    logger.info(`Importing into our instance file ${title}`);
    await MediaWikiAutomator.importMediaWikiPage(
      articleId,
      exportData,
      language
    );
    logger.info(`Successfully imported file ${title}`);

    // Rename
    await renameArticle(title, articleId, language);
  } catch (error) {
    logger.error(`Error importing article ${title}`, error);
    throw error;
  }
}

async function getRevisionId(
  articleId: string,
  sort: 'older' | 'newer',
  language: string
) {
  const response = await mediaWikiApi[language].get('', {
    params: {
      action: 'query',
      prop: 'revisions',
      titles: articleId,
      rvlimit: 1,
      rvdir: sort,
      format: 'json',
      formatversion: 2
    }
  });
  return response.data.query.pages[0].revisions[0].revid;
}

export async function updateChanges(
  articleId: string,
  userId: string,
  language: string
) {
  const originalRevid = await getRevisionId(articleId, 'newer', language);
  const latestRevid = await getRevisionId(articleId, 'older', language);

  logger.info('Getting the Diff HTML of Revids:', {
    originalRevid,
    latestRevid
  });
  const diffPage = await MediaWikiAutomator.getMediaWikiDiffHtml(
    articleId,
    originalRevid,
    latestRevid,
    language
  );

  const { changesToUpsert, htmlContent } = await refineArticleChanges(
    articleId,
    diffPage,
    userId
  );

  await upsertChanges(changesToUpsert);
  await updateCurrentHtmlContent(articleId, htmlContent);
}
