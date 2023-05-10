const express = require("express");
var https = require("https");
const axios = require("axios");
const cheerio = require("cheerio");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const data = { html: "" };

app.use(bodyParser.json({ limit: "300kb" }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/mediawiki_wikitext", (req, res) => {
  // Fetch the local Mediawiki wikitext. (Example: wikitext of Main_Page)
  title = "Main_Page";
  url = `https://localhost/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${title}&format=json`;
  axios
    .get(
      url,
      // Ignore SSL/TLS certificate verification
      {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      }
    )
    .then((response) => {
      const content =
        response.data.query.pages[0].revisions[0].slots.main.content;
      res.json(content);
    })
    .catch((error) => {
      console.log(error.response.data.error);
    });
});

app.get("/wikipedia_wikitext", (req, res) => {
  // Fetch the wikitext of a Wikipedia Article.
  title = "Hedi_Slimane";
  url = `https://wikipedia.org/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${title}&format=json`;
  axios
    .get(url)
    .then((response) => {
      const content =
        response.data.query.pages[0].revisions[0].slots.main.content;
      res.json(content);
    })
    .catch((error) => {
      console.log(error.response.data.error);
    });
});

//POST and GET the html diff of the local mediawiki
app.post("/api/html_diff", (req, res) => {
  const html = req.body.html;
  var id = 0;
  console.log("Data received:", Buffer.byteLength(html, "utf8"), "bytes");
  res.send("Data received");

  const $ = cheerio.load(html);
  const date = new Date().toLocaleString("fr");

  // Go through elements that have the attribute data-diff-action
  $("[data-diff-action]:not([data-diff-action='none'])").each(
    (index, element) => {
      const $element = $(element);
      const diffAction = $element.attr("data-diff-action");
      // Create the wrap element with the wanted metadata
      const $wrapElement = $("<span>");
      $wrapElement.attr("status", "Awaiting Reviewer Approval");

      // Append a clone of the element to the wrap element
      $wrapElement.append($element.clone());
      // Check if the element has "remove" or "change-remove" diff action
      if (diffAction === "remove" || diffAction === "change-remove") {
        const $nextElement = $element.next();

        // Check if the next element has "insert" or "change-insert" diff action
        if (
          $nextElement.attr("data-diff-action") === "insert" ||
          $nextElement.attr("data-diff-action") === "change-insert"
        ) {
          // Append the next element to the wrap element
          $wrapElement.append($nextElement.clone());
          // Remove the next element
          $nextElement.remove();
        }
      }
      $element.replaceWith($wrapElement);
    }
  );
  $("[status]").each((index, element) => {
    const $element = $(element);
    $element.attr("data-diff-id", id++);
    $element.attr("date", date);
  });
  data.html = $.html();
});

app.get("/api/html_diff", (req, res) => {
  res.send(data.html);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
