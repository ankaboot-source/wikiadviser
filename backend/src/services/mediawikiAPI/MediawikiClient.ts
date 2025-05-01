import { AxiosInstance, AxiosResponse } from 'axios';
import FormData from 'form-data';
import mediawikiApiInstances from '../../api/mediawikiApiInstances';
import { refineArticleChanges } from '../../helpers/parsingHelper';
import {
  insertRevision,
  updateCurrentHtmlContent,
  upsertChanges
} from '../../helpers/supabaseHelper';
import logger from '../../logger';
import ENV from '../../schema/env.schema';
import { Account } from '../../types';
import { WikipediaApi } from '../wikipedia/WikipediaApi';

const { MW_BOT_USERNAME, MW_BOT_PASSWORD } = ENV;

type RevisionDeleted = {
  error?: {
    info: string;
  };
  edit: {
    result: string;
    pageid: number;
    title: string;
    contentmodel: string;
    oldrevid: number;
    newrevid: number;
    newtimestamp: string;
    watched: string;
  };
};
export default class MediawikiClient {
  private readonly mediawikiApiInstance: AxiosInstance;

  constructor(
    private readonly language: string,
    private readonly wikipediaApi: WikipediaApi
  ) {
    this.mediawikiApiInstance = mediawikiApiInstances.get(
      this.language
    ) as AxiosInstance;
  }

  private static extractCookies(setCookieHeaders: string[]) {
    const cookies = setCookieHeaders.reduce((acc: Account, header) => {
      const cookieKeyValue = header.split(';')[0];
      const [key, value] = cookieKeyValue.split('=');
      acc[key.trim()] = value.trim();
      return acc;
    }, {});

    return cookies;
  }

  private setCookies(response: AxiosResponse) {
    const setCookieHeaders = response.headers['set-cookie'];
    const cookies = MediawikiClient.extractCookies(
      setCookieHeaders as string[]
    );
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
      if (data.error.code === 'missingtitle') {
        /**
         * This code block handles synchronization issues between the database and MediaWiki during
         * article deletion. Skips error code 'missingtitle' to continue with the deletion process.
         */
        logger.error(
          `Article '${articleId}' does not exist. The error is skipped, likely due to synchronization issues.`
        );
      } else {
        await this.logout(csrftoken);
        throw new Error(
          `Failed to delete article with id ${articleId}: ${data.error.info}`
        );
      }
    }
    this.logout(csrftoken);
  }

  async importArticle(articleId: string, title: string): Promise<void> {
    try {
      // Export
      logger.info(`Exporting file ${title}`);
      const exportData = await this.wikipediaApi.exportArticleData(
        title,
        articleId,
        this.language
      );
      logger.info(`Successfully exported file ${title}`);

      // Import
      logger.info(`Importing into our instance file ${title}`);
      const csrftoken = await this.loginAndGetCsrf();

      const importForm = new FormData();
      importForm.append('xml', exportData, {
        filename: `${articleId}.xml`,
        contentType: 'application/xml'
      });
      importForm.append('action', 'import');
      importForm.append('interwikiprefix', ' ');
      importForm.append('token', csrftoken);
      importForm.append('format', 'json');
      const headers = {
        ...importForm.getHeaders(),
        connection: 'close',
        timeout: 60000
      };

      const importResponse = await this.mediawikiApiInstance.post(
        '',
        importForm,
        {
          headers
        }
      );
      if (importResponse.data.error) {
        logger.error(
          `Failed to import article ${articleId} ${title}: ${importResponse.data}`
        );
      }

      this.logout(csrftoken);
      logger.info(`Successfully imported file ${title}`);
    } catch (error) {
      logger.error(error, `Error importing article ${title}`);
      throw error;
    }
  }

  private async getRevisionData(articleId: string, sort: 'older' | 'newer') {
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
    return response.data.query.pages[0].revisions[0];
  }

  async updateChanges(articleId: string, userId: string, diff: string) {
    const { revid: latestRevid, comment: latestRevSummary } =
      await this.getRevisionData(articleId, 'older');

    const revisionSummary = latestRevSummary.includes('[[Special:Diff')
      ? latestRevSummary.split('[[')[0]
      : latestRevSummary;

    const revisionId = await insertRevision(
      articleId,
      latestRevid,
      revisionSummary
    );

    const { changesToUpsert, htmlContent } = await refineArticleChanges(
      articleId,
      diff,
      userId,
      revisionId
    );

    await upsertChanges(changesToUpsert);
    await updateCurrentHtmlContent(articleId, htmlContent);
  }

  /**
   * Deletes a specific revision using its ID.
   *
   * @param revisionId - The ID of the revision to be deleted.
   * @returns The response data after attempting to delete the revision.
   * @throws An error if the deletion fails.
   */
  async deleteRevision(articleId: string, revisionId: string) {
    const csrftoken = await this.loginAndGetCsrf();
    const { data }: { data: RevisionDeleted } =
      await this.mediawikiApiInstance.post(
        '',
        {
          action: 'edit',
          title: articleId,
          undo: revisionId,
          token: csrftoken,
          format: 'json'
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

    this.logout(csrftoken);
    const error = data.error?.info;

    if (error) {
      throw new Error(
        `Failed to delete revision with id ${revisionId}: ${error}`
      );
    }

    return data;
  }

  async createArticle(articleId: string, title: string) {
    const csrftoken = await this.loginAndGetCsrf();

    const { data } = await this.mediawikiApiInstance.post(
      '',
      {
        action: 'edit',
        title: articleId,
        appendtext: `{{DISPLAYTITLE:${title}}}`,
        token: csrftoken,
        createonly: true,
        format: 'json'
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    this.logout(csrftoken);
    const error = data.error?.info;

    if (error) {
      throw new Error(`Failed to create new article id ${articleId}: ${error}`);
    }

    return data;
  }
}
