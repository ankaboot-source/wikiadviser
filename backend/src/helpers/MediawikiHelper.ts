import axios from 'axios';
import https from 'https';
import logger from '../logger';
import PlaywrightAutomator from './PlaywrightHelper';
import { refineArticleChanges } from './parsingHelper';
import { updateCurrentHtmlContent, upsertChanges } from './supabaseHelper';

const { MEDIAWIKI_HOST, WIKIPEDIA_PROXY, MW_BOT_USERNAME, MW_BOT_PASSWORD } =
  process.env;

const automate = new PlaywrightAutomator();

const api = axios.create({ baseURL: `${MEDIAWIKI_HOST}/w/api.php` });
// Use to bypass https validation
api.defaults.httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

function extractCookies(setCookieHeaders: any) {
  const cookies = setCookieHeaders.reduce((acc: any, header: any) => {
    const cookieKeyValue = header.split(';')[0];
    const [key, value] = cookieKeyValue.split('=');
    acc[key.trim()] = value.trim();
    return acc;
  }, {});

  return cookies;
}
function setCookies(response: any) {
  const setCookieHeaders = response.headers['set-cookie'];
  const cookies = extractCookies(setCookieHeaders);
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
  // We set a cookie header for upcoming requests
  api.defaults.headers.Cookie = cookieHeader;
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

export async function importNewArticle(
  articleId: string,
  title: string,
  language = 'en'
): Promise<void> {
  // Export
  logger.info(`Exporting file  ${title}`);
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
  let exportData = '';
  exportResponse.data.on('data', (chunk: string) => {
    exportData += chunk;
  });
  await new Promise<void>((resolve, reject) => {
    exportResponse.data.on('end', async () => {
      // Add missing </base> into the file. (Exported files from proxies only)
      exportData = exportData.replace(
        '\n    <generator>',
        '</base>\n    <generator>'
      );
      logger.info(`Succesfuly exported file ${title}`);
      logger.info(`Importing into our instance file ${title}`);

      await automate.importPage(articleId, exportData);

      logger.info(`Succesfuly imported file ${title}`);

      // Login
      const csrftoken = await loginAndGetCsrf();
      // Rename
      logger.info(`Renaming Article ${title} to its corresponding id`);
      const renameResponse = await api.post(
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
      logger.info(renameResponse.data);
      // Logout
      logout(csrftoken);
      resolve();
    });

    exportResponse.data.on('error', (error: Error) => {
      reject(error);
    });
  });
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

export async function updateChanges(articleId: string, permissionId: string) {
  const originalRevid = await getRevisionId(articleId, 'newer');
  const latestRevid = await getRevisionId(articleId, 'older');

  logger.info(
    { originalRevid, latestRevid },
    'Getting the Diff HTML of Revids:'
  );
  const diffPage = await automate.getDiffHtml(
    articleId,
    originalRevid,
    latestRevid
  );

  const { changesToUpsert, htmlContent } = await refineArticleChanges(
    articleId,
    diffPage,
    permissionId
  );

  await upsertChanges(changesToUpsert);
  await updateCurrentHtmlContent(articleId, htmlContent);
}
