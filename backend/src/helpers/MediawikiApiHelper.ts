import axios from 'axios';
import fs from 'fs';
import https from 'https';
import logger from '../logger';

// Generate a bot password from here
// http://localhost:8080/wiki/Special:BotPasswords
const { MEDIAWIKI_HOST, MW_BOT_USERNAME, MW_BOT_PASSWORD, WIKIPEDIA_PROXY } =
  process.env;
const wpLang = 'en';

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
  logger.info(logoutResponse.data);
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

export async function importNewArticle(articleId: string, title: string) {
  // Export
  const exportResponse = await axios.get(`${WIKIPEDIA_PROXY}/w/index.php`, {
    params: {
      title: 'Special:Export',
      pages: title,
      templates: 'true',
      lang: wpLang
    },
    responseType: 'stream'
  });
  exportResponse.data.pipe(fs.createWriteStream(`imports/${articleId}.xml`));
  logger.info(exportResponse.status);

  // Login
  const csrftoken = await loginAndGetCsrf();

  // Import
  // const importResponse = await api.post(
  //   '',
  //   {
  //     xml: fs.createReadStream(`imports/${articleId}.xml`)
  //   },
  //   {
  //     params: {
  //       action: 'import',
  //       token: csrftoken,
  //       format: 'json'
  //     },
  //     headers: {
  //       'Content-Type': 'application/x-www-form-urlencoded'
  //     }
  //   }
  // );
  // logger.info(importResponse.data);

  // Delete Export file

  // Rename
  // const renameResponse = await api.post(
  //   '',
  //   {
  //     action: 'move',
  //     from: title,
  //     to: articleId,
  //     noredirect: true,
  //     token: csrftoken,
  //     format: 'json'
  //   },
  //   {
  //     headers: {
  //       'Content-Type': 'application/x-www-form-urlencoded'
  //     }
  //   }
  // );
  // logger.info(renameResponse.data);

  // Logout
  logout(csrftoken);
}
