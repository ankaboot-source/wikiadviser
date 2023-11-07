import * as Sentry from '@sentry/node';
import 'dotenv/config';
import express, { json } from 'express';
import {
  deleteArticleMW,
  importNewArticle,
  updateChanges
} from './helpers/MediawikiHelper';
import WikipediaApiInteractor from './helpers/WikipediaApiInteractor';
import {
  getArticleParsedContent,
  getChangesAndParsedContent
} from './helpers/parsingHelper';
import {
  deleteArticle,
  getUserByToken,
  hasPermission,
  insertArticle,
  updateChange
} from './helpers/supabaseHelper';
import logger from './logger';
import corsMiddleware from './middleware/cors';
import initializeSentry from './middleware/sentry';
import { WikiAdviserJWTcookie } from './types';

const { WIKIADVISER_API_PORT, WIKIADVISER_API_IP, SENTRY_DSN } = process.env;

const app = express();

const port = WIKIADVISER_API_PORT ? parseInt(WIKIADVISER_API_PORT) : 3000;
const wikiApi = new WikipediaApiInteractor();

if (SENTRY_DSN) {
  initializeSentry(app, SENTRY_DSN);
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(json({ limit: '10mb' }));
app.use(corsMiddleware);

app.put('/article/changes', async (req, res) => {
  try {
    const { articleId, permissionId } = req.body;
    await updateChanges(articleId, permissionId);

    logger.info({ articleId }, 'Updated Changes of article');
    res.status(200).json({ message: 'Updating changes succeeded.' });
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
    const content = await getArticleParsedContent(articleId);
    logger.info({ articleId }, 'Get Parsed Article');
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

app.get('/article/changes', async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const changes = await getChangesAndParsedContent(articleId);
    logger.info({ articleId }, 'Parsed Changes recieved');
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

app.put('/article/change', async (req, res) => {
  try {
    const { changeId, status, description } = req.body;
    await updateChange({ id: changeId, status, description });

    logger.info({ changeId }, 'Updated Change');
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
    logger.info('Getting Wikipedia articles succeeded.');
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

    res.status(200).json({ message: 'Deleting article succeeded.' });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error);
    }
    res.status(500).json({ message: 'Deleting article failed.' });
  }
});

app.get('/authenticate', async (req, res) => {
  try {
    // Authorize backend
    if (req.headers['x-real-ip'] === WIKIADVISER_API_IP) {
      logger.info({ name: 'Authorized Backend', headers: req.headers });
      return res.sendStatus(200);
    }
    // forwardedUri verification
    const forwardedUri = req.headers['x-forwarded-uri'];
    if (!(typeof forwardedUri === 'string')) {
      return res
        .status(403)
        .json({ message: 'Unauthorized: Missing x-forwarded-uri' });
    }

    const JWTcookie: WikiAdviserJWTcookie = {
      name: 'WikiAdviserJWTcookie',
      value: ''
    };
    const { cookie } = req.headers;
    JWTcookie.value =
      cookie
        ?.split(';')
        .find((singleCookie) => singleCookie.includes(JWTcookie.name))
        ?.split('=')[1] || '';

    // Cookie verification
    if (!JWTcookie.value) {
      return res.status(403).json({ message: 'Unauthorized: Missing cookies' });
    }

    // User verification
    const userResponse = await getUserByToken(JWTcookie.value);
    if (userResponse.error) {
      return res.status(403).json({
        message: `Unauthorized: User ${userResponse.error.message}`
      });
    }

    // Allow POST api calls until there is a way to verify the payload (POST FORM)
    if (
      req.headers['x-forwarded-method'] !== 'POST' ||
      forwardedUri !== '/w/api.php'
    ) {
      const articleIdRegEx = /^\/w(?:iki)?\/([0-9a-f-]{36})([?/]|$)/i;
      const allowedPrefixRegEx =
        /^(favicon.ico|(\/w\/(load\.php\?|(skins|resources)\/)))/i;

      if (!forwardedUri?.match(allowedPrefixRegEx)) {
        const articleId =
          forwardedUri.startsWith('/w/api.php?') &&
          req?.query?.action === 'visualeditor'
            ? (req?.query?.page as string)
            : forwardedUri?.match(articleIdRegEx)?.[1];
        if (!articleId) {
          return res.status(403).json({
            message: 'Unauthorized: Missing articleId'
          });
        }

        const { permissionError } = await hasPermission(
          articleId,
          userResponse.data.user?.id
        );
        if (permissionError) {
          return res.status(403).json({
            message: 'Unauthorized: Permission denied'
          });
        }
      }
    }

    logger.info({ name: 'Authorized', headers: req.headers });
    return res.status(200).json({
      message: 'Authorized'
    });
  } catch (error) {
    let message = 'Something unexpected happened!';
    logger.error({ name: 'Unauthorized', error, headers: req.headers });

    if (error instanceof Error) {
      message = error.message;
    }
    return res.status(500).json({ message });
  }
});

if (SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
