import axios from 'axios';
import https from 'https';
import { chromium } from 'playwright';
import logger from '../logger';

const {
  MEDIAWIKI_HOST,
  WIKIPEDIA_PROXY,
  MW_BOT_USERNAME,
  MW_BOT_PASSWORD,
  MW_ADMIN_USERNAME,
  MW_ADMIN_PASSWORD
} = process.env;

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
  logger.info('Exporting file ', title);
  const exportResponse = await axios.get(`${WIKIPEDIA_PROXY}/w/index.php`, {
    params: {
      title: 'Special:Export',
      pages: title,
      templates: true,
      lang: language
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
      // Automate Login
      const usernameField = '#wpName1';
      const passwordField = '#wpPassword1';
      const loginButton = '#wpLoginAttempt';

      const browser = await chromium.launch()
      const context = await browser.newContext({
        ignoreHTTPSErrors: true
      });
      const page = await context.newPage();

      await page.goto(
        `${MEDIAWIKI_HOST}/w/index.php?title=Special:UserLogin&returnto=Special:Import`,
        { waitUntil: 'networkidle' }
      );
      await page.fill(usernameField, MW_ADMIN_USERNAME!);
      await page.fill(passwordField, MW_ADMIN_PASSWORD!);
      await page.click(loginButton);

      // Automate Import
      const submitButton = 'button[value^="Upload file"]';
      const fileChooserButton = '#ooui-php-2';
      const textBoxInterwikiprefix = '#ooui-php-3';

      await page.locator(fileChooserButton).setInputFiles([
        {
          name: `${articleId}.xml`,
          mimeType: 'application/xml',
          buffer: Buffer.from(exportData, 'utf-8')
        }
      ]);

      await page.fill(textBoxInterwikiprefix, ' ');
      await page.click(submitButton, { timeout: 5 * 60 * 1000 }); // 5 Minutes
      await page.waitForLoadState('networkidle');
      await browser.close();
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
