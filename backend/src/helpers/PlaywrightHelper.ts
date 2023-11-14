import { BrowserContext, chromium } from 'playwright';
import logger from '../logger';

const { MEDIAWIKI_ENDPOINT, MW_ADMIN_USERNAME, MW_ADMIN_PASSWORD } = process.env;

class PlaywrightAutomator {
  private context: BrowserContext | null = null;

  private async ensureContext() {
    if (!this.context) {
      const browser = await chromium.launch();
      this.context = await browser.newContext({
        ignoreHTTPSErrors: true
      });
    }
  }

  async startPage() {
    await this.ensureContext();
    if (!this.context) {
      throw new Error('Context not properly initialized');
    }
    const page = await this.context.newPage();
    return page;
  }

  async importPage(articleId: string, exportData: string) {
    const page = await this.startPage();

    try {
      // Automate Login
      const usernameField = '#wpName1';
      const passwordField = '#wpPassword1';
      const loginButton = '#wpLoginAttempt';
      if (!this.context) {
        throw new Error('Context not properly initialized');
      }
      await page.goto(
        `${MEDIAWIKI_ENDPOINT}/w/index.php?title=Special:UserLogin&returnto=Special:Import`,
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
      await page.click(submitButton, { timeout: 10 * 60 * 1000 }); // 10 Minutes
      await page.waitForLoadState('networkidle');
    } catch (error) {
      logger.error('Error during page import:', error);
    } finally {
      await page.close();
    }
  }

  async getDiffHtml(
    articleId: string,
    originalRevid: string,
    latestRevid: string
  ) {
    const page = await this.startPage();

    try {
      await page.goto(
        `${MEDIAWIKI_ENDPOINT}/w/index.php?title=${articleId}&diff=${latestRevid}&oldid=${originalRevid}&diffmode=visual&diffonly=1`,
        { waitUntil: 'networkidle' }
      );
      const diffPage = await page.$eval(
        '.ve-init-mw-diffPage-diff',
        (el) => el.outerHTML
      );
      return diffPage;
    } catch (error) {
      logger.error('Error during Diffing:', error);
      return '';
    } finally {
      await page.close();
    }
  }
}

const Automator = new PlaywrightAutomator();

export default Automator;
