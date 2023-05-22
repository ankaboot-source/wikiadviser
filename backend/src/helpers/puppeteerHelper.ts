import puppeteer from "puppeteer";

export async function setupNewArticle(
  articleMediawiki: string,
  articleWikitext: string
) {
  const browser = await puppeteer.launch({
    headless: "new",
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  await page.goto(articleMediawiki, { waitUntil: "networkidle0" });
  await page.click(
    "body > div.oo-ui-windowManager.oo-ui-windowManager-modal.oo-ui-windowManager-floating > div > div.oo-ui-window-frame > div.oo-ui-window-content.oo-ui-dialog-content.oo-ui-messageDialog-content.oo-ui-window-content-setup.oo-ui-window-content-ready > div.oo-ui-window-foot > div > span.oo-ui-widget.oo-ui-widget-enabled.oo-ui-buttonElement.oo-ui-labelElement.oo-ui-flaggedElement-progressive.oo-ui-flaggedElement-primary.oo-ui-buttonWidget.oo-ui-actionWidget.oo-ui-buttonElement-framed"
  );
  await page.$eval(
    "#wpTextbox1",
    (el: any, value: any) => (el.value = value),
    articleWikitext
  );
  await page.waitForTimeout(500);
  await page.click('input[name="wpSave"]');
  await browser.close();
}
