import { BrowserContext, chromium, Page } from 'playwright';
import logger from '../logger';

const { MEDIAWIKI_ENDPOINT, MW_ADMIN_USERNAME, MW_ADMIN_PASSWORD } = process.env;

class PlaywrightMediaWikiAutomation {
  private static instance: PlaywrightMediaWikiAutomation | null;

  private readonly browserContext: Promise<BrowserContext>;

  constructor(
    private readonly MediawikiHost: string,
    private readonly MediawikiAdminUsername: string,
    private readonly MediawikiAdminPassword: string
  ) {
    if (PlaywrightMediaWikiAutomation.instance) {
      throw new Error(
        'PlaywrightMediaWikiAutomation class cannot be instantiated more than once.'
      );
    }

    if (!MediawikiHost || !MediawikiAdminPassword || !MediawikiAdminUsername) {
      throw new Error(
        'Incomplete instantiation: Please provide valid values for MediawikiHost, MediawikiAdminPassword, and MediawikiAdminUsername.'
      );
    }

    PlaywrightMediaWikiAutomation.instance = this;

    this.browserContext = this.setContext();
  }

  private async setContext(): Promise<BrowserContext> {
    try {
      const browser = await chromium.launch();
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await page.goto(
        `${this.MediawikiHost}/w/index.php?title=Special:UserLogin`,
        { waitUntil: 'networkidle' }
      );

      await page.fill('#wpName1', this.MediawikiAdminUsername);
      await page.fill('#wpPassword1', this.MediawikiAdminPassword);
      await page.click('#wpLoginAttempt');
      await page.close();
      return context;
    } catch (error) {
      logger.error('Error when setting browser context', error);
      throw error;
    }
  }

  private async getBrowserContext(): Promise<BrowserContext> {
    await this.browserContext;
    return this.browserContext;
  }

  private async getPageInContext(): Promise<Page> {
    const page = await (await this.getBrowserContext()).newPage();
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

    await page.goto(`${this.MediawikiHost}/w/index.php?title=Special:Import`, {
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
    await page.click('button[value^="Upload file"]', {
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
      `${this.MediawikiHost}/w/index.php?title=${articleId}&diff=${latestRevid}&oldid=${originalRevid}&diffmode=visual&diffonly=1`,
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

const MediaWikiAutomator = new PlaywrightMediaWikiAutomation(
  // TODO: Remove string type when Zod is implemented
  MEDIAWIKI_ENDPOINT as string,
  MW_ADMIN_USERNAME as string,
  MW_ADMIN_PASSWORD as string
);

export default MediaWikiAutomator;
