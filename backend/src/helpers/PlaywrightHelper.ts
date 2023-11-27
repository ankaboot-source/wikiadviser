import { BrowserContext, Page, chromium } from 'playwright';
import logger from '../logger';

const { MEDIAWIKI_ENDPOINT, MW_ADMIN_USERNAME, MW_ADMIN_PASSWORD } =
  process.env;

class PlaywrightAutomator {
  private static instance: PlaywrightAutomator | null;

  private readonly browserContext: Promise<BrowserContext>;

  private readonly MediawikiEndpoint = MEDIAWIKI_ENDPOINT!;

  private readonly MediawikiAdminUsername = MW_ADMIN_USERNAME!;

  private readonly MediawikiAdminPassword = MW_ADMIN_PASSWORD!;

  private mediawikiBaseURL!: string;

  private language!: string;

  constructor() {
    this.browserContext = PlaywrightAutomator.setContext();
  }

  public static getInstance(language: string): PlaywrightAutomator {
    if (!PlaywrightAutomator.instance) {
      PlaywrightAutomator.instance = new PlaywrightAutomator();
    }
    PlaywrightAutomator.instance.language = language;
    PlaywrightAutomator.instance.mediawikiBaseURL = `${PlaywrightAutomator.instance.MediawikiEndpoint}/${language}`;

    return PlaywrightAutomator.instance;
  }

  private static async setContext(): Promise<BrowserContext> {
    try {
      const browser = await chromium.launch();
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      return context;
    } catch (error) {
      logger.error('Error when setting browser context', error);
      throw error;
    }
  }

  private async getPageInContext(): Promise<Page> {
    const loggedInResponse = await (
      await this.browserContext
    ).request.get(
      `${this.mediawikiBaseURL}/api.php?action=query&meta=userinfo&format=json`
    );
    const data = await loggedInResponse.json();
    const isLoggedIn = !!data.query.userinfo.id;

    const page = await (await this.browserContext).newPage();
    if (!isLoggedIn) {
      await page.goto(
        `${this.mediawikiBaseURL}/index.php?title=Special:UserLogin`,
        { waitUntil: 'networkidle' }
      );
      await page.fill('#wpName1', this.MediawikiAdminUsername);
      await page.fill('#wpPassword1', this.MediawikiAdminPassword);
      await page.click('#wpRemember');
      await page.click('#wpLoginAttempt');
    }

    return page;
  }

  /**
   * Imports an article to Mediawiki.
   * @param articleId - The ID of the article.
   * @param exportData - The export data in XML format.
   */
  async importMediaWikiPage(
    articleId: string,
    exportData: string
  ): Promise<void> {
    const page = await this.getPageInContext();

    await page.goto(`${this.mediawikiBaseURL}/index.php?title=Special:Import`, {
      waitUntil: 'networkidle'
    });

    await page.locator('#ooui-php-2').setInputFiles([
      {
        name: `${articleId}.xml`,
        mimeType: 'application/xml',
        buffer: Buffer.from(exportData, 'utf-8')
      }
    ]);

    await page.fill('#ooui-php-3', ' ');
    await page.click('#ooui-php-21 button[type=submit]', {
      timeout: 10 * 60 * 1000
    }); // 10 Minutes
    await page.waitForLoadState('networkidle');
    await page.close();
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
    latestRevid: string
  ): Promise<string> {
    const page = await this.getPageInContext();
    await page.goto(
      `${this.mediawikiBaseURL}/index.php?title=${articleId}&diff=${latestRevid}&oldid=${originalRevid}&diffmode=visual&diffonly=1`,
      { waitUntil: 'networkidle' }
    );

    const diffPage = await page.$eval(
      '.ve-init-mw-diffPage-diff',
      (el) => el.outerHTML
    );
    await page.close();

    return diffPage;
  }
}

export default PlaywrightAutomator;
