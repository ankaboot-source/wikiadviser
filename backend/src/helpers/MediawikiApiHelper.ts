import axios from 'axios';
import https from 'https';
import logger from '../logger';

// Generate a bot password from here
// http://localhost:8080/wiki/Special:BotPasswords
const { MEDIAWIKI_HOST, MW_BOT_USERNAME, MW_BOT_PASSWORD } = process.env;
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
export default async function deleteArticleMW(articleId: string) {
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
}
