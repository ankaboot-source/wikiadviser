const { chromium } = require('playwright'); // Or 'firefox' or 'webkit'.

export async function setupNewArticle(
  mwArticleUrl: string,
  wpArticleWikitext: string
) {
  const startEditingButton =
    'span.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed';

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  await page.goto(mwArticleUrl, { waitUntil: 'networkidle' });
  await page.click(startEditingButton);
  await page.waitForTimeout(500);
  await page.fill('#wpTextbox1', wpArticleWikitext);
  await page.click('#wpSave');
  await browser.close();
}

export async function deleteArticle(articleId: string) {
  const username = 'Topadmin';
  const password = 'Topadmin2001';

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  const page = await context.newPage();

  await page.goto(
    `https://localhost/w/index.php?title=Special:UserLogin&returnto=${articleId}&returntoquery=action=delete`,
    { waitUntil: 'networkidle' }
  );
  await page.fill('#wpName1', username);
  await page.fill('#wpPassword1', password);
  await page.click('#wpLoginAttempt');
  await page.click('#wpConfirmB');
  await browser.close();
}
