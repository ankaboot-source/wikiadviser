import { AxiosInstance, AxiosResponse } from "axios";
import mediawikiApiInstances from "../_shared/mediawikiAPI/mediawikiApiInstances.ts";
import ENV from "../_shared/schema/env.schema.ts";
import { Account } from "../_shared/types/index.ts";
import { WikipediaApi } from "../_shared/wikipedia/WikipediaApi.ts";

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
    private readonly wikipediaApi: WikipediaApi,
  ) {
    this.mediawikiApiInstance = mediawikiApiInstances.get(
      this.language,
    ) as AxiosInstance;
  }

  private static extractCookies(setCookieHeaders: string[]) {
    const cookies = setCookieHeaders.reduce((acc: Account, header) => {
      const cookieKeyValue = header.split(";")[0];
      const [key, value] = cookieKeyValue.split("=");
      acc[key.trim()] = value.trim();
      return acc;
    }, {});

    return cookies;
  }

  private setCookies(response: AxiosResponse) {
    const setCookieHeaders = response.headers["set-cookie"];
    const cookies = MediawikiClient.extractCookies(
      setCookieHeaders as string[],
    );
    const cookieHeader = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");

    if (typeof cookieHeader !== "string") {
      throw new Error("Type mismatch: set-cookie is not string");
    }

    // Assign session to the current axios instance
    this.mediawikiApiInstance.defaults.headers.Cookie = cookieHeader;
  }

  private async loginAndGetCsrf() {
    const tokenResponse = await this.mediawikiApiInstance.get("", {
      params: {
        action: "query",
        meta: "tokens",
        type: "login",
        format: "json",
      },
    });
    const { logintoken } = tokenResponse.data.query.tokens;
    this.setCookies(tokenResponse);

    const loginResponse = await this.mediawikiApiInstance.post(
      "",
      {
        action: "login",
        lgname: MW_BOT_USERNAME,
        lgpassword: MW_BOT_PASSWORD,
        lgtoken: logintoken,
        format: "json",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { login: loginstatus } = loginResponse.data;

    if (loginstatus.result !== "Success") {
      throw new Error(
        loginstatus.reason ??
          `Failed to login to mediawiki as Bot:${MW_BOT_USERNAME}`,
      );
    }
    this.setCookies(loginResponse);

    const { data } = await this.mediawikiApiInstance.get("", {
      params: {
        action: "query",
        meta: "tokens",
        format: "json",
      },
    });

    const { csrftoken } = data.query.tokens;

    if (csrftoken === "+\\") {
      throw new Error("Failed to get csrftoken");
    }

    return csrftoken;
  }

  private async logout(csrftoken: string) {
    const { data } = await this.mediawikiApiInstance.post(
      "",
      {
        action: "logout",
        token: csrftoken,
        format: "json",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { error } = data;

    if (error) {
      throw new Error(error.info);
    }
  }
  async getCurrentArticleWikitext(articleId: string): Promise<string> {
  
  const { data } = await this.mediawikiApiInstance.get("", {
    params: {
      action: "query",
      prop: "revisions",
      titles: articleId,
      rvprop: "content",
      rvslots: "main",
      format: "json",
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
    "",
    {
      action: "edit",
      title: articleId,
      text: wikitext,
      summary: summary,
      token: csrftoken,
      bot: true,
      format: "json",
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  await this.logout(csrftoken);

  if (data.error) {
    throw new Error(`Failed to edit article: ${data.error.info}`);
  }

  if (!data.edit || !data.edit.newrevid || !data.edit.oldrevid) {
    throw new Error('Edit response missing revision IDs');
  }

  console.log(`Article edited successfully. Old rev: ${data.edit.oldrevid}, New rev: ${data.edit.newrevid}`);
  
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
  const response = await this.mediawikiApiInstance.get("", {
    params: {
      action: "query",
      prop: "revisions",
      titles: articleId,
      rvprop: "content",
      rvstartid: revid,
      rvlimit: 1,
      format: "json",
      formatversion: 2,
    },
  });

  const page = response.data.query.pages[0];
  if (!page || !page.revisions || !page.revisions[0]) {
    throw new Error(
      `Could not fetch wikitext for article ${articleId} at revision ${revid}`
    );
  }

  return page.revisions[0].content || "";
}
  
}
