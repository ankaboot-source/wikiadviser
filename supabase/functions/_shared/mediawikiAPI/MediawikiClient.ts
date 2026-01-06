import { AxiosInstance, AxiosResponse } from 'npm:axios@^1.8.4';
import FormData from 'npm:form-data@^4.0.2';
import { refineArticleChanges } from '../helpers/parsingHelper.ts';
import {
  insertRevision,
  updateCurrentHtmlContent,
  upsertChanges,
} from '../helpers/supabaseHelper.ts';
import mediawikiApiInstances from './mediawikiApiInstances.ts';
import ENV from '../schema/env.schema.ts';
import { Account } from '../types/index.ts';
import { WikipediaApi } from '../wikipedia/WikipediaApi.ts';

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
        format: 'json',
      },
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
        format: 'json',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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
        format: 'json',
      },
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
        format: 'json',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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
        format: 'json',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    if (data.error) {
      if (data.error.code === 'missingtitle') {
        /**
         * This code block handles synchronization issues between the database and MediaWiki during
         * article deletion. Skips error code 'missingtitle' to continue with the deletion process.
         */
        console.error(
          `Article '${articleId}' does not exist. The error is skipped,likely due to synchronization issues.`
        );
      } else {
        await this.logout(csrftoken);
        throw new Error(
          `Failed to delete article with id ${articleId}: ${data.error.info}`
        );
      }
    }
    await this.logout(csrftoken);
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
        formatversion: 2,
      },
    });
    return response.data.query.pages[0].revisions[0];
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
          format: 'json',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
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

  async updateChanges(
    articleId: string,
    userId: string,
    diff: string,
    hideChanges: boolean = false
  ) {
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
    if (hideChanges && changesToUpsert.length > 0) {
      changesToUpsert.forEach((change) => {
        change.archived = true;
        change.hidden = true;
      });
    }

    await upsertChanges(changesToUpsert);
    await updateCurrentHtmlContent(articleId, htmlContent);
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
        format: 'json',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.logout(csrftoken);
    const error = data.error?.info;

    if (error) {
      throw new Error(`Failed to create new article id ${articleId}: ${error}`);
    }

    return data;
  }
  async importArticle(articleId: string, title: string): Promise<void> {
    try {
      // Export
      console.info(`Exporting file ${title}`);
      const exportData = await this.wikipediaApi.exportArticleData(
        title,
        articleId,
        this.language
      );
      console.info(`Successfully exported file ${title}`);

      // Import
      console.info(`Importing into our instance file ${title}`);
      const csrftoken = await this.loginAndGetCsrf();

      const importForm = new FormData();
      importForm.append('xml', exportData, {
        filename: `${articleId}.xml`,
        contentType: 'application/xml',
      });
      importForm.append('action', 'import');
      importForm.append('interwikiprefix', ' ');
      importForm.append('token', csrftoken);
      importForm.append('format', 'json');
      const headers = {
        ...importForm.getHeaders(),
        connection: 'close',
        timeout: 60000,
      };

      const importResponse = await this.mediawikiApiInstance.post(
        '',
        importForm,
        {
          headers,
        }
      );
      if (importResponse.data.error) {
        const errorText = `Error while importing article ${articleId} ${title}: ${JSON.stringify(
          importResponse.data.error
        )}`;

        if (
          importResponse.data.error.info.includes(
            'XML error' // Blocking error
          )
        ) {
          this.logout(csrftoken);
          throw Error(errorText);
        }

        console.error(errorText);
      }

      this.logout(csrftoken);
      console.info(`Successfully imported file ${title}`);
    } catch (error) {
      console.error(`Failed to import article ${title}`);
      throw error;
    }
  }
  async getCurrentArticleWikitext(articleId: string): Promise<string> {
    const { data } = await this.mediawikiApiInstance.get('', {
      params: {
        action: 'query',
        prop: 'revisions',
        titles: articleId,
        rvprop: 'content',
        rvslots: 'main',
        format: 'json',
        formatversion: 2,
      },
    });

    const page = data?.query?.pages?.[0];
    if (!page || page.missing) {
      throw new Error(`Article ${articleId} not found`);
    }

    const wikitext = page.revisions?.[0]?.slots?.main?.content;
    if (!wikitext) {
      throw new Error(`No wikitext found for article ${articleId}`);
    }

    console.log(`Wikitext fetched, length: ${wikitext.length}`);
    return wikitext;
  }

  /**
   * Edits an article as the bot user, creating a NEW revision
   * @returns The old and new revision IDs
   */
  async editArticleAsBot(
    articleId: string,
    wikitext: string,
    summary: string
  ): Promise<{ oldrevid: number; newrevid: number }> {
    const csrftoken = await this.loginAndGetCsrf();

    const { data } = await this.mediawikiApiInstance.post(
      '',
      {
        action: 'edit',
        title: articleId,
        text: wikitext,
        summary,
        token: csrftoken,
        bot: true,
        format: 'json',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    await this.logout(csrftoken);

    if (data.error) {
      throw new Error(`Failed to edit article: ${data.error.info}`);
    }

    if (!data.edit || !data.edit.newrevid || !data.edit.oldrevid) {
      throw new Error('Edit response missing revision IDs');
    }

    console.log(
      `Article edited successfully. Old rev: ${data.edit.oldrevid}, New rev: ${data.edit.newrevid}`
    );

    return {
      oldrevid: data.edit.oldrevid,
      newrevid: data.edit.newrevid,
    };
  }

  /**
   * Gets wikitext for a specific revision (used for comparison)
   */
  async getArticleWikitextAtRevision(
    articleId: string,
    revid: number
  ): Promise<string> {
    const response = await this.mediawikiApiInstance.get('', {
      params: {
        action: 'query',
        prop: 'revisions',
        titles: articleId,
        rvprop: 'content',
        rvstartid: revid,
        rvlimit: 1,
        format: 'json',
        formatversion: 2,
      },
    });

    const page = response.data.query.pages[0];
    if (!page || !page.revisions || !page.revisions[0]) {
      throw new Error(
        `Could not fetch wikitext for article ${articleId} at revision ${revid}`
      );
    }

    return page.revisions[0].content || '';
  }
}
