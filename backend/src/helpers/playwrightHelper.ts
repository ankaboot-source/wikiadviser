import { chromium } from 'playwright';

export default async function setupNewArticle(
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
