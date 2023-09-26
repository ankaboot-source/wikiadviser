import 'dotenv/config';
import express, { json } from 'express';
import {
  deleteArticleMW,
  importNewArticle,
  updateChanges
} from './helpers/MediawikiApiHelper';
import WikipediaApiInteractor from './helpers/WikipediaApiInteractor';
import {
  getArticleParsedContent,
  getChangesAndParsedContent
} from './helpers/parsingHelper';
import {
  deleteArticle,
  insertArticle,
  updateChange
} from './helpers/supabaseHelper';
import logger from './logger';
import corsMiddleware from './middleware/cors';

const app = express();
const { WIKIADVISER_API_PORT } = process.env;
const port = WIKIADVISER_API_PORT ? parseInt(WIKIADVISER_API_PORT) : 3000;
const wikiApi = new WikipediaApiInteractor();

app.use(json({ limit: '10mb' }));
app.use(corsMiddleware);

app.put('/article/changes', async (req, res) => {
  try {
    const { articleId, permissionId } = req.body;
    await updateChanges(articleId, permissionId);
    logger.info('Updated Changes of the article:', articleId);
    res.status(204);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error);
    }
    res.status(500).json({ message: 'Updating changes failed.' });
  }
});

app.get('/article/parsedContent', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const content = await getArticleParsedContent(articleId); // parsingHelper.ts
    logger.info('Get Parsed Article');
    res
      .status(200)
      .json({ message: 'Getting article changes succeeded.', content });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error);
    }
    res.status(500).json({ message: 'Getting article changes failed.' });
  }
});

// Get Article Changes
app.get('/article/changes', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const changes = await getChangesAndParsedContent(articleId); // parsingHelper.ts
    logger.info('Parsed Changes recieved:', changes);
    res
      .status(200)
      .json({ message: 'Getting article changes succeeded.', changes });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error);
    }
    res.status(500).json({ message: 'Getting article changes failed.' });
  }
});

// Update a Change
app.put('/article/change', async (req, res) => {
  try {
    const { changeId, status, description } = req.body;
    await updateChange({ id: changeId, status, description });

    logger.info('Updated Changes of the article:', changeId);
    res.status(201).json({ message: 'Updating change succeeded.' });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error);
    }
    res.status(500).json({ message: 'Updating change failed.' });
  }
});

// New Article
app.post('/article', async (req, res) => {
  const { title, userId, language, description } = req.body;
  logger.info(
    {
      title,
      userId,
      language,
      description
    },
    'New article title received'
  );

  const articleId = await insertArticle(title, userId, description);
  try {
    await importNewArticle(articleId, title, language);

    res
      .status(201)
      .json({ message: 'Creating new article succeeded.', articleId });
  } catch (error: any) {
    await deleteArticle(articleId);
    logger.error(error.message);
    res.status(500).json({ message: 'Creating new article failed.' });
  }
});

app.get('/wikipedia/articles', async (req, res) => {
  try {
    const term = req.query.term as string;
    const language = req.query.language as string;
    const response = await wikiApi.getWikipediaArticles(term, language);
    logger.info('Getting Wikipedia articles succeeded.', response);
    res.status(200).json({
      message: 'Getting Wikipedia articles succeeded.',
      searchResults: response
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

app.delete('/article', async (req, res) => {
  try {
    const { articleId } = req.body;

    await deleteArticleMW(articleId);
    await deleteArticle(articleId);

    res.status(204);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error);
    }
    res.status(500).json({ message: 'Deleting article failed.' });
  }
});

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
