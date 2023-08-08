import { chromium } from 'playwright';

export async function setupNewArticle(
  mwArticleUrl: string,
  wpArticleWikitext: string
) {
  const startEditingButton =
    'span.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed';
  const textBoxField = '#wpTextbox1';
  const saveButton = '#wpSave';

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  await page.goto(mwArticleUrl, { waitUntil: 'networkidle' });
  await page.click(startEditingButton);
  await page.waitForTimeout(500);
  await page.fill(textBoxField, wpArticleWikitext);
  await page.click(saveButton);
  await browser.close();
}

export async function deleteArticleMW(articleId: string) {
  const { MW_SITE_SERVER, MW_ADMIN_USERNAME, MW_ADMIN_PASSWORD } = process.env;
  const usernameField = '#wpName1';
  const passwordField = '#wpPassword1';
  const loginButton = '#wpLoginAttempt';
  const confirmButton = '#wpConfirmB';

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  await page.goto(
    `${MW_SITE_SERVER}/w/index.php?title=Special:UserLogin&returnto=${articleId}&returntoquery=action=delete`,
    { waitUntil: 'networkidle' }
  );
  await page.fill(usernameField, MW_ADMIN_USERNAME!);
  await page.fill(passwordField, MW_ADMIN_PASSWORD!);
  await page.click(loginButton);
  await page.click(confirmButton);
  await browser.close();
}
