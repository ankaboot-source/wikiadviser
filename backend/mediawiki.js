const express = require("express");
const request = require("request");
const app = express();

app.get("/mediawiki", (req, res) => {
  // Fetch the MediaWiki data.
  request(
    "http://localhost:80/api.php?action=query&prop=revisions&titles=Main_Page",
    (err, response, body) => {
      if (err) {
        return res.status(500).send("Error fetching MediaWiki data.");
      } // Parse the MediaWiki data.
      const data = JSON.parse(body);

      // Send the MediaWiki data to the client.
      res.json(data);
      console.log(data);
    }
  );
});
