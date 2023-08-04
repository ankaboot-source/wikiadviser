import puppeteer from 'puppeteer';

export async function setupNewArticle(
  mwArticleUrl: string,
  wpArticleWikitext: string
) {
  const startEditingButton =
    'span.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed';
  const browser = await puppeteer.launch({
    headless: 'new',
    ignoreHTTPSErrors: true
  });
  const page = await browser.newPage();
  await page.goto(mwArticleUrl, { waitUntil: 'networkidle0' });
  await page.click(startEditingButton);
  await page.$eval(
    '#wpTextbox1',
    // eslint-disable-next-line no-return-assign, no-param-reassign
    (el: any, value: string) => (el.value = value),
    wpArticleWikitext
  );
  await page.waitForTimeout(500);
  await page.click('input[name="wpSave"]');
  await browser.close();
}

export async function deleteArticle(articleId: string) {
  const browser = await puppeteer.launch({
    headless: 'new',
    ignoreHTTPSErrors: true
  });
  const username = 'Topadmin';
  const password = 'Topadmin2001';
  const page = await browser.newPage();
  await page.goto(
    `https://localhost/w/index.php?title=Special:UserLogin&returnto=${articleId}&returntoquery=action=delete`,
    {
      waitUntil: 'networkidle0'
    }
  );
  await page.$eval(
    '#wpName1',
    // eslint-disable-next-line no-return-assign, no-param-reassign
    (el: any, value: string) => (el.value = value),
    username
  );
  await page.$eval(
    '#wpPassword1',
    // eslint-disable-next-line no-return-assign, no-param-reassign
    (el: any, value: string) => (el.value = value),
    password
  );
  await page.click('#wpLoginAttempt');
  await page.click('#wpConfirmB');
  await browser.close();
}
