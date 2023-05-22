import express from "express";
import https from "https";
import axios from "axios";
import cheerio, { load } from "cheerio";
import cors from "cors";
import bodyParser from "body-parser";
import { setupNewArticle } from "./helpers/puppeteerHelper";
import { getArticleWikiText } from "./helpers/wikipediaApiHelper";
const app = express();
const port = 3000;
const data = { html: "" };

app.use(bodyParser.json({ limit: "300kb" }));
app.use(
  cors({
    origin: "*",
  })
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//POST and GET the html diff of the local mediawiki
app.post("/api/html_diff", (req, res) => {
  const html = req.body.html;
  console.log("Data received:", Buffer.byteLength(html, "utf8"), "bytes");

  let typeOfEdit = "";
  let id = 0;
  let changeid = 0;
  const userid = "User1";
  const date = new Date().toLocaleString("fr");

  const $ = load(html);

  // Go through elements that have the attribute data-diff-action
  $("[data-diff-action]:not([data-diff-action='none'])").each(
    (index, element) => {
      const $element = $(element);
      const diffAction = $element.data("diff-action");

      // Create the wrap element with the wanted metadata
      const $wrapElement = $("<span>");
      $wrapElement.attr("data-status", "Awaiting Reviewer Approval");
      $wrapElement.attr("data-description", "");

      // Append a clone of the element to the wrap element
      $wrapElement.append($element.clone());

      let typeOfEdit: any = diffAction;

      // Wrapping related changes: Check if next node is an element (Not a text node) AND if the current element has "change-remove" diff
      const node: any = $element[0].next;
      if (!node?.data?.trim() && diffAction === "change-remove") {
        const $nextElement = $element.next();
        // Check if the next element has "change-insert" diff action
        if ($nextElement.data("diff-action") === "change-insert") {
          // Append the next element to the wrap element
          $wrapElement.append($nextElement.clone());

          // change-remove is always succeeded by a change-insert
          typeOfEdit = "change";
          // Add description attribute
          const list: any[] = [];
          const listItems = $(".ve-ui-diffElement-sidebar >")
            .children()
            .eq(changeid++)
            .children()
            .children();
          listItems.each(function (i, elem) {
            list.push($(elem).text());
          });
          // Delimiter <|> since it is unlikely to be present in any of the array elements
          $wrapElement.attr("data-description", list.join("<|>"));

          // Remove the last element
          $nextElement.remove();
        }
      }
      $wrapElement.attr("data-type-of-edit", typeOfEdit);
      $element.replaceWith($wrapElement);
    }
  );

  // Remove sidebar
  $(".ve-ui-diffElement-sidebar").remove();
  $(".ve-ui-diffElement-hasDescriptions").removeClass(
    "ve-ui-diffElement-hasDescriptions"
  );

  // Add more data
  $("[data-status]").each((index, element) => {
    const $element = $(element);
    $element.attr("data-id", `${id++}`);
    $element.attr("data-user", userid);
    $element.attr("data-date", date);
  });
  data.html = $.html();
});

app.get("/api/html_diff", (req, res) => {
  res.send(data.html);
});

//New Article
app.post("/api/new_article", async (req, res) => {
  try {
    const title = req.body.title;
    console.log("New article title received:", title);

    // The wikitext of the Wikipedia article
    const wpArticleWikitext = await getArticleWikiText(title);

    // The article in our Mediawiki
    const mwArticleUrl = `https://localhost/wiki/${title}?action=edit`;

    // Automate setting up the new article using puppeteer
    await setupNewArticle(mwArticleUrl, wpArticleWikitext);

    res.status(201).json({ message: "Creating new article succeeded." });
  } catch (error) {
    console.error(error);
    res.sendStatus(500).json({ message: "Creating new article failed." });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
