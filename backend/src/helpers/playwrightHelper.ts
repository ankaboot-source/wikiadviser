import { chromium } from 'playwright';

export async function setupNewArticle(
  mwArticleUrl: string,
  wpArticleWikitext: string
) {
  const startEditingButton =
    'span.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed';
  const textBoxFieldId = 'wpTextbox1';
  const saveButton = '#wpSave';

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  const stringifiedWikitext = JSON.stringify(wpArticleWikitext);

  await page.goto(mwArticleUrl, { waitUntil: 'networkidle' });
  await page.click(startEditingButton);
  await page.waitForTimeout(500);
  await page.evaluate(
    `document.getElementById("${textBoxFieldId}").value=${stringifiedWikitext}`
  );
  await page.click(saveButton);
  await browser.close();
}

export async function deleteArticleMW(articleId: string) {
  const { MEDIAWIKI_HOST, MW_ADMIN_USERNAME, MW_ADMIN_PASSWORD } = process.env;
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
    `${MEDIAWIKI_HOST}/w/index.php?title=Special:UserLogin&returnto=${articleId}&returntoquery=action=delete`,
    { waitUntil: 'networkidle' }
  );
  await page.fill(usernameField, MW_ADMIN_USERNAME!);
  await page.fill(passwordField, MW_ADMIN_PASSWORD!);
  await page.click(loginButton);
  await page.click(confirmButton);
  await browser.close();
}
