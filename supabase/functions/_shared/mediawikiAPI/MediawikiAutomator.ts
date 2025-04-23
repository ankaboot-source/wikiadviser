import { BrowserContext, chromium, Page } from "playwright";
import logger from "../../logger";
import ENV from "../../schema/env.schema";

const { MEDIAWIKI_INTERNAL_ENDPOINT, MW_ADMIN_USERNAME, MW_ADMIN_PASSWORD } =
  ENV;

export class MediawikiAutomator {
  private mediawikiBaseURL: string;

  private readonly MediawikiEndpoint = MEDIAWIKI_INTERNAL_ENDPOINT;

  private readonly MediawikiAdminUsername = MW_ADMIN_USERNAME;

  private readonly MediawikiAdminPassword = MW_ADMIN_PASSWORD;

  constructor(
    private readonly browserContext: BrowserContext,
    private readonly language: string,
  ) {
    this.mediawikiBaseURL = `${this.MediawikiEndpoint}/${this.language}`;
  }

  private async getPageInContext(): Promise<Page> {
    // Check if logged in
    const loggedInResponse = await this.browserContext.request.get(
      `${this.mediawikiBaseURL}/api.php?action=query&meta=userinfo&format=json`,
    );
    const loggedInData = await loggedInResponse.json();
    const isLoggedIn = !!loggedInData.query.userinfo.id;
    const page = await this.browserContext.newPage();

    if (!isLoggedIn) {
      // Get login token
      const loginTokenResponse = await this.browserContext.request.get(
        `${this.mediawikiBaseURL}/api.php?action=query&meta=tokens&type=login&format=json`,
      );
      const loginTokenData = await loginTokenResponse.json();
      const { logintoken } = loginTokenData.query.tokens;

      // Login
      const loginResponse = await this.browserContext.request.post(
        `${this.mediawikiBaseURL}/api.php?action=login&lgname=${this.MediawikiAdminUsername}&format=json`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          form: {
            lgpassword: this.MediawikiAdminPassword,
            lgtoken: logintoken,
          },
        },
      );
      const loginData = await loginResponse.json();
      if (loginData.login.result !== "Success") {
        logger.error(loginData.login.reason);
      }
    }

    return page;
  }

  /**
   * Gets the HTML content of the visual diff between two revisions of a MediaWiki article.
   * @param articleId - The ID of the article.
   * @param originalRevid - The revision ID of the original version.
   * @param latestRevid - The revision ID of the latest version.
   * @returns The HTML content of the visual diff.
   */
  async getMediaWikiDiffHtml(
    articleId: string,
    originalRevid: string,
    latestRevid: string,
  ): Promise<string> {
    const page = await this.getPageInContext();

    await page.goto(
      `${this.mediawikiBaseURL}/index.php?title=${articleId}&diff=${latestRevid}&oldid=${originalRevid}&diffmode=visual&diffonly=1`,
    );

    const timeoutInMinutes = 4;
    const timeoutInMillis = timeoutInMinutes * 60 * 1000;
    const diffSelector = ".ve-init-mw-diffPage-diff";

    logger.info(
      `Waiting for selector '${diffSelector}' to appear. Timeout = ${timeoutInMinutes} minutes.`,
    );
    performance.mark("diff-start");
    // wait until all html is loaded
    await page.waitForSelector(diffSelector, { timeout: timeoutInMillis });
    logger.info(
      `Selector '${diffSelector}' resolved in ${
        performance.measure("diff-start").duration
      } milliseconds.`,
    );

    const diffPage = await page.$eval(
      ".ve-init-mw-diffPage-diff",
      (el) => el.outerHTML,
    );
    await page.close();

    return diffPage;
  }
}

const browser =
  (async () => (await chromium.launch({ headless: true })).newContext())();

export const PlayAutomatorFactory = async (language: string) => {
  const context = await browser;
  const playAutomator = new MediawikiAutomator(context, language);
  return playAutomator;
};
