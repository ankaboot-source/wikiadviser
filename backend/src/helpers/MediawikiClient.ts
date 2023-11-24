import { AxiosInstance } from 'axios';
import mediawikiApiInstances from '../api/mediawikiApiInstances';
import logger from '../logger';
import PlayrightAutomator from './PlaywrightHelper';
import WikipediaApiInteractor from './WikipediaApiInteractor';
import { refineArticleChanges } from './parsingHelper';
import { updateCurrentHtmlContent, upsertChanges } from './supabaseHelper';

const wikipediaApi = new WikipediaApiInteractor();

const { MW_BOT_USERNAME, MW_BOT_PASSWORD } = process.env;

class MediawikiClient {
  private readonly mediawikiApiInstance: AxiosInstance;

  constructor(private readonly language: string) {
    this.mediawikiApiInstance = mediawikiApiInstances.get(this.language)!;
  }

  private static extractCookies(setCookieHeaders: any) {
    const cookies = setCookieHeaders.reduce((acc: any, header: any) => {
      const cookieKeyValue = header.split(';')[0];
      const [key, value] = cookieKeyValue.split('=');
      acc[key.trim()] = value.trim();
      return acc;
    }, {});

    return cookies;
  }

  private setCookies(response: any) {
    const setCookieHeaders = response.headers['set-cookie'];
    const cookies = MediawikiClient.extractCookies(setCookieHeaders);
    const cookieHeader = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    if (typeof cookieHeader !== 'string') {
      throw new Error('Type mismatch: set-cookie is not string');
    }

    // Assign session to the current axios instance
    this.mediawikiApiInstance.defaults.headers.Cookie = cookieHeader;
  }

  private async loginAndGetCsrf() {
    const tokenResponse = await this.mediawikiApiInstance.get('', {
      params: {
        action: 'query',
        meta: 'tokens',
        type: 'login',
        format: 'json'
      }
    });
    const { logintoken } = tokenResponse.data.query.tokens;
    this.setCookies(tokenResponse);

    const loginResponse = await this.mediawikiApiInstance.post(
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
    this.setCookies(loginResponse);

    const { data } = await this.mediawikiApiInstance.get('', {
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

  private async logout(csrftoken: string) {
    const { data } = await this.mediawikiApiInstance.post(
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

  async deleteArticleMW(articleId: string) {
    const csrftoken = await this.loginAndGetCsrf();

    const { data } = await this.mediawikiApiInstance.post(
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
      this.logout(csrftoken);
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
    this.logout(csrftoken);
  }

  private async renameArticle(title: string, articleId: string): Promise<void> {
    const csrftoken = await this.loginAndGetCsrf();

    logger.info(
      `Renaming Article ${title} to its corresponding id: ${articleId}`
    );

    const { data } = await this.mediawikiApiInstance.post(
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
      this.logout(csrftoken);
      throw new Error(`Failed to rename article with id ${articleId}`);
    }
    this.logout(csrftoken);
  }

  async importNewArticle(articleId: string, title: string): Promise<void> {
    try {
      // Export
      logger.info(`Exporting file ${title}`);
      const exportData = await wikipediaApi.exportArticleData(
        title,
        this.language
      );
      logger.info(`Successfully exported file ${title}`);

      // Import
      logger.info(`Importing into our instance file ${title}`);
      const mediawikiAutomator = new PlayrightAutomator(this.language);
      await mediawikiAutomator.importMediaWikiPage(articleId, exportData);
      logger.info(`Successfully imported file ${title}`);

      // Rename
      await this.renameArticle(title, articleId);
    } catch (error) {
      logger.error(`Error importing article ${title}`, error);
      throw error;
    }
  }

  private async getRevisionId(articleId: string, sort: 'older' | 'newer') {
    const response = await this.mediawikiApiInstance.get('', {
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

  async updateChanges(articleId: string, userId: string) {
    const originalRevid = await this.getRevisionId(articleId, 'newer');
    const latestRevid = await this.getRevisionId(articleId, 'older');

    logger.info('Getting the Diff HTML of Revids:', {
      originalRevid,
      latestRevid
    });

    const mediawikiAutomator = new PlayrightAutomator(this.language);
    const diffPage = await mediawikiAutomator.getMediaWikiDiffHtml(
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
}

export default MediawikiClient;
