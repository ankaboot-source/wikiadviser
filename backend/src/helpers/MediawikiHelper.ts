import axios from 'axios';
import https from 'https';
import logger from '../logger';
import MediaWikiAutomator from './PlaywrightHelper';
import { refineArticleChanges } from './parsingHelper';
import { updateCurrentHtmlContent, upsertChanges } from './supabaseHelper';

const {
  MEDIAWIKI_ENDPOINT,
  WIKIPEDIA_PROXY,
  MW_BOT_USERNAME,
  MW_BOT_PASSWORD
} = process.env;

const api = axios.create({ baseURL: `${MEDIAWIKI_ENDPOINT}/w/api.php` });
// Use to bypass https validation
api.defaults.httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

function setCookies(response: any) {
  const setCookieHeaders = response.headers['set-cookie'];
  api.defaults.headers.Cookie = setCookieHeaders;
}

async function loginAndGetCsrf() {
  const loginTokenResponse = await api.get('', {
    params: {
      action: 'query',
      meta: 'tokens',
      type: 'login',
      format: 'json'
    }
  });
  const { logintoken } = loginTokenResponse.data.query.tokens;
  setCookies(loginTokenResponse);

  const loginResponse = await api.post(
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
  setCookies(loginResponse);

  const csrfResponse = await api.get('', {
    params: {
      action: 'query',
      meta: 'tokens',
      format: 'json'
    }
  });
  const { csrftoken } = csrfResponse.data.query.tokens;

  if (csrftoken === '+\\') {
    throw Error('Could not get CSRF token');
  }
  return csrftoken;
}

async function logout(csrftoken: string) {
  const logoutResponse = await api.post(
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
  logger.info({ Logout: logoutResponse.status });
}

export async function deleteArticleMW(articleId: string) {
  const csrftoken = await loginAndGetCsrf();

  const deleteResponse = await api.post(
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
  logger.info(deleteResponse.data);

  logout(csrftoken);
}

async function exportArticleData(
  title: string,
  language: string
): Promise<string> {
  const exportResponse = await axios.get(`${WIKIPEDIA_PROXY}/w/index.php`, {
    params: {
      title: 'Special:Export',
      pages: title,
      templates: true,
      lang: language,
      curonly: true
    },
    responseType: 'stream'
  });

  return new Promise<string>((resolve, reject) => {
    let exportData = '';
    exportResponse.data.on('data', (chunk: string) => {
      exportData += chunk;
    });

    exportResponse.data.on('end', () => {
      // Add missing </base> into the file. (Exported files from proxies only)
      exportData = exportData.replace(
        '\n    <generator>',
        '</base>\n    <generator>'
      );
      resolve(exportData);
    });

    exportResponse.data.on('error', (error: Error) => {
      reject(error);
    });
  });
}

async function renameArticle(title: string, articleId: string): Promise<void> {
  const csrftoken = await loginAndGetCsrf();

  logger.info(`Renaming Article ${title} to its corresponding id`);

  await api.post(
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
  logout(csrftoken);
}

export async function importNewArticle(
  articleId: string,
  title: string,
  language: string
): Promise<void> {
  try {
    // Export
    logger.info(`Exporting file ${title}`);
    const exportData = await exportArticleData(title, language);
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
    await renameArticle(title, articleId);
  } catch (error) {
    logger.error(`Error importing article ${title}`, error);
    throw error;
  }
}

async function getRevisionId(articleId: string, sort: 'older' | 'newer') {
  const response = await api.get('', {
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

export async function updateChanges(articleId: string, userId: string) {
  const originalRevid = await getRevisionId(articleId, 'newer');
  const latestRevid = await getRevisionId(articleId, 'older');

  logger.info(
    { originalRevid, latestRevid },
    'Getting the Diff HTML of Revids:'
  );
  const diffPage = await MediaWikiAutomator.getMediaWikiDiffHtml(
    articleId,
    originalRevid,
    latestRevid
  );

  const { changesToUpsert, htmlContent } = await refineArticleChanges(
    articleId,
    diffPage,
    userId
  );

  await upsertChanges(changesToUpsert);
  await updateCurrentHtmlContent(articleId, htmlContent);
}
