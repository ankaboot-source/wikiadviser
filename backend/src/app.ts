import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import {
  decomposeArticle,
  getArticleParsedContent,
  getChangesAndParsedContent
} from './helpers/parsingHelper';
import setupNewArticle from './helpers/puppeteerHelper';
import {
  insertArticle,
  removeChanges,
  updateChange
} from './helpers/supabaseHelper';
import getArticleWikiText from './helpers/wikipediaApiHelper';
import logger from './logger';

const app = express();
const { MW_SITE_SERVER, WIKIADVISER_API_PORT } = process.env;
const port = WIKIADVISER_API_PORT ? parseInt(WIKIADVISER_API_PORT) : 3000;
const data = { html: '' };

app.use(express.json({ limit: '300kb' }));
app.use(
  cors({
    origin: '*'
  })
);

// POST and GET the html diff of the local mediawiki
app.post('/api/rawArticle', async (req, res) => {
  const { html, permissionId } = req.body;
  logger.info('Data received:', { size: Buffer.byteLength(html, 'utf8') });
  await removeChanges(permissionId);
  data.html = await decomposeArticle(html, permissionId);
  res.status(201).json({ message: 'Diff HTML created.' });
});

// Get the Article current content HTML Parsed
app.get('/api/article/parsedContent', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const content = await getArticleParsedContent(articleId); // parsingHelper.ts
    logger.info('Get Parsed Article');
    res
      .status(200)
      .json({ message: 'Getting article changes succeeded.', content });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Getting article changes failed.' });
  }
});

// Get Article Changes
app.get('/api/article/changes', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const changes = await getChangesAndParsedContent(articleId); // parsingHelper.ts
    logger.info('Parsed Changes recieved:', changes);
    res
      .status(200)
      .json({ message: 'Getting article changes succeeded.', changes });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Getting article changes failed.' });
  }
});

// Update a Change
app.put('/api/article/change', async (req, res) => {
  try {
    const { changeId, status, description } = req.body;
    await updateChange({ changeId, status, description });

    logger.info('Updated Changes of the article:', changeId);
    res.status(201).json({ message: 'Updating change succeeded.' });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Updating change failed.' });
  }
});

// New Article
app.post('/api/article', async (req, res) => {
  try {
    const { title, userId, description } = req.body;
    logger.info(
      {
        title,
        userId,
        description
      },
      'New article title received'
    );
    // Insert into supabase: Articles, Permissions.
    const articleId = await insertArticle(title, userId, description);

    // The wikitext of the Wikipedia article
    const wpArticleWikitext = await getArticleWikiText(title);

    // The article in our Mediawiki
    const mwArticleUrl = `${MW_SITE_SERVER}/wiki/${articleId}?action=edit`;

    // Automate setting up the new article using puppeteer
    await setupNewArticle(mwArticleUrl, wpArticleWikitext);

    res
      .status(201)
      .json({ message: 'Creating new article succeeded.', articleId });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Creating new article failed.' });
  }
});

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
