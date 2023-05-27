import express from 'express';
import cors from 'cors';
import axios from 'axios';
import logger from './logger';
import 'dotenv/config';
import setupNewArticle from './helpers/puppeteerHelper';
import getArticleWikiText from './helpers/wikipediaApiHelper';
import {
  insertArticle,
  getUsersWithPermissions,
  getArticles,
  createNewPermission,
  updatePermission,
  removeChanges,
  updateChange,
  insertComment,
  getArticle
} from './helpers/supabaseHelper';
import {
  decomposeArticle,
  getArticleParsedContent,
  getChangesAndParsedContent,
  getInnerText
} from './helpers/parsingHelper';

const app = express();
const port = 3000;
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
  // post permissionId
  logger.info(permissionId);
  await removeChanges(permissionId);
  data.html = await decomposeArticle(html, permissionId);
  res.status(201).json({ message: 'Diff HTML created.' });
});

app.get('/api/article/parsedContent', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const content = await getArticleParsedContent(articleId);
    logger.info('Get Parsed Article');
    res
      .status(200)
      .json({ message: 'Getting article changes succeeded.', content });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Getting article changes failed.' });
  }
});

app.get('/api/article/changes', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const changes = await getChangesAndParsedContent(articleId);
    logger.info('Parsed Changes recieved:', changes);
    res
      .status(200)
      .json({ message: 'Getting article changes succeeded.', changes });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Getting article changes failed.' });
  }
});

app.put('/api/article/change', async (req, res) => {
  try {
    const { changeId, status, description } = req.body;
    console.log(req.body);
    await updateChange(changeId, undefined, status, description);

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
    const mwArticleUrl = `https://localhost/wiki/${title}?action=edit`;

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

// Check Users with Permission of an articleId
app.get('/api/users', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const users = await getUsersWithPermissions(articleId);
    logger.info(
      {
        articleId,
        users
      },
      'Users with permissions'
    );
    res
      .status(200)
      .json({ message: 'Fetching users with permissions succeeded.', users });
  } catch (error: any) {
    logger.error(error.message);
    res
      .status(500)
      .json({ message: 'Fetching users with permissions failed.' });
  }
});

// Fetch Articles owned by a user
app.get('/api/articles', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const articles = await getArticles(userId);

    logger.info('Get articles');
    res
      .status(200)
      .json({ message: 'Checking article existence succeeded.', articles });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Checking article existence failed.' });
  }
});

// New permission
app.post('/api/permission', async (req, res) => {
  try {
    const { articleId, userId } = req.body;
    logger.info(
      {
        articleId,
        userId
      },
      'New Permission request'
    );
    // Insert a new permission request.
    await createNewPermission(articleId, userId);

    res
      .status(201)
      .json({ message: 'Creating new article succeeded.', articleId });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Creating new article failed.' });
  }
});

// Update permission
app.put('/api/permission', async (req, res) => {
  try {
    const { permissionId, role } = req.body;
    logger.info(
      {
        permissionId,
        role
      },
      'New Permission request'
    );
    // Insert a new permission request.
    await updatePermission(permissionId, role);

    res.status(201).json({ message: 'Updating permission article succeeded.' });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Updating permission article failed.' });
  }
});

app.post('/api/change/comment', async (req, res) => {
  try {
    const { changeId, commenterId, content } = req.body;
    logger.info(
      {
        changeId,
        commenterId,
        content
      },
      'New Permission request'
    );
    // Insert a new comment.
    await insertComment(changeId, commenterId, content);

    res.status(201).json({ message: 'Inserting comment succeeded.' });
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: 'Inserting comment failed.' });
  }
});
app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

// Get sentiments
app.get('/api/article/sentiment_analysis', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const article = await getArticle(articleId);
    const innerText = await getInnerText(article.current_html_content);
    const response = await axios.get(
      'http://localhost:8000/sentiment_analysis',
      {
        params: {
          text: innerText.toString()
        }
      }
    );
    const { scores } = response.data;
    logger.info({ scores }, 'Get sentiment scores.');
    res
      .status(200)
      .json({ message: 'Getting article sentiment scores succeeded.', scores });
  } catch (error: any) {
    logger.error(error.message);
    res
      .status(500)
      .json({ message: 'Getting article sentiment scores failed.' });
  }
});
