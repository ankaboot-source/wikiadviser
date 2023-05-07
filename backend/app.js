const express = require("express");
var https = require("https");
const axios = require("axios");
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.get("/mediawiki", (req, res) => {
  // Fetch the local Mediawiki data. (Example: wikitext of Main_Page)
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

app.get("/wikipedia", (req, res) => {
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
