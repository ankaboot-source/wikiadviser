import 'dotenv/config';
import express, { json } from 'express';
import deleteArticleMW from './helpers/MediawikiApiHelper';
import WikipediaApiInteractor from './helpers/WikipediaApiInteractor';
import {
  decomposeArticle,
  getArticleParsedContent,
  getChangesAndParsedContent
} from './helpers/parsingHelper';
import setupNewArticle from './helpers/playwrightHelper';
import {
  deleteArticle,
  insertArticle,
  removeChanges,
  updateChange
} from './helpers/supabaseHelper';
import logger from './logger';
import corsMiddleware from './middleware/cors';

const app = express();
const { MEDIAWIKI_HOST, WIKIADVISER_API_PORT } = process.env;
const port = WIKIADVISER_API_PORT ? parseInt(WIKIADVISER_API_PORT) : 3000;
const data = { html: '' };
const wikiApi = new WikipediaApiInteractor();

app.use(json({ limit: '10mb' }));
app.use(corsMiddleware);

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
  try {
    // The wikitext of the Wikipedia article
    const wpArticleWikitext = await wikiApi.getWikipediaArticleWikitext(title);

    // The article in our Mediawiki
    const mwArticleUrl = `${MEDIAWIKI_HOST}/wiki/${articleId}?action=edit`;

    // Automate setting up the new article
    await setupNewArticle(mwArticleUrl, wpArticleWikitext);

    res
      .status(201)
      .json({ message: 'Creating new article succeeded.', articleId });
  } catch (error: any) {
    await deleteArticle(articleId);
    logger.error(error.message);
    res.status(500).json({ message: 'Creating new article failed.' });
  }
});

app.get('/api/wikipedia/articles', async (req, res) => {
  try {
    const term = req.query.term as string;
    const response = await wikiApi.getWikipediaArticles(term);
    logger.info('Getting Wikipedia articles succeeded.', response);
    res.status(200).json({
      message: 'Getting Wikipedia articles succeeded.',
      results: response
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error);
    }
    res.status(500).json({ message: 'Getting Wikipedia articles failed.' });
  }
});

app.delete('/api/article', async (req, res) => {
  try {
    const { articleId } = req.body;

    await deleteArticleMW(articleId);
    await deleteArticle(articleId);

    res.status(200).json({ message: 'Deleting article succeeded.', articleId });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Deleting article failed.' });
  }
});

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
