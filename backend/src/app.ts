import * as Sentry from '@sentry/node';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import express, { json } from 'express';
import MediawikiClient from './helpers/MediawikiClient';
import WikipediaApiInteractor from './helpers/WikipediaApiInteractor';
import {
  getArticleParsedContent,
  getChangesAndParsedContent
} from './helpers/parsingHelper';
import {
  deleteArticle,
  getArticle,
  hasPermission,
  insertArticle,
  updateChange
} from './helpers/supabaseHelper';
import logger from './logger';
import authorizationMiddlware from './middleware/auth';
import corsMiddleware from './middleware/cors';
import initializeSentry from './middleware/sentry';
import { PlayAutomatorFactory } from './helpers/PlaywrightHelper';

const { WIKIADVISER_API_PORT, SENTRY_DSN } = process.env;

const app = express();

const port = WIKIADVISER_API_PORT ? parseInt(WIKIADVISER_API_PORT) : 3000;

const WikipediaApi = new WikipediaApiInteractor();

if (SENTRY_DSN) {
  initializeSentry(app, SENTRY_DSN);
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(json({ limit: '10mb' }));
app.use(corsMiddleware);
app.use(cookieParser());
app.use(authorizationMiddlware);

app.put('/article/changes', async (req, res) => {
  try {
    const { articleId } = req.body;
    const { user } = res.locals;

    const { language } = await getArticle(articleId);
    const mediawiki = new MediawikiClient(
      language,
      WikipediaApi,
      await PlayAutomatorFactory(language)
    );
    await mediawiki.updateChanges(articleId, user.id);

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
    logger.debug(`Getting Parsed Changes for article: ${articleId}`);
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

  const articleId = await insertArticle(title, userId, language, description);
  try {
    const mediawiki = new MediawikiClient(
      language,
      WikipediaApi,
      await PlayAutomatorFactory(language)
    );
    await mediawiki.importNewArticle(articleId, title);

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
    const response = await WikipediaApi.getWikipediaArticles(term, language);
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
    logger.info('Deleting', { articleId });

    const { language } = await getArticle(articleId);
    const mediawiki = new MediawikiClient(
      language,
      WikipediaApi,
      await PlayAutomatorFactory(language)
    );
    await mediawiki.deleteArticleMW(articleId);
    await deleteArticle(articleId);

    logger.info('Deleted article');
    res.status(200).json({ message: 'Deleting article succeeded.' });
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error(error);
    }
    logger.info('Deleting article');
    res.status(500).json({ message: 'Deleting article failed.' });
  }
});

app.get('/authenticate', async (req, res) => {
  try {
    const { user } = res.locals;
    const forwardedUri = req.headers['x-forwarded-uri'];
    const forwardedMethod = req.headers['x-forwarded-method'];

    const articleIdRegEx = new RegExp(
      `^/(${JSON.parse(process.env.WIKIADVISER_LANGUAGES!).join(
        '|'
      )}/index.php/([0-9a-f-]{1,36})([?/]|$))`,
      'i'
    );
    const allowedPrefixRegEx = new RegExp(
      `
      ^(favicon.ico|(/(${JSON.parse(process.env.WIKIADVISER_LANGUAGES!).join(
        '|'
      )})/(load.php?|(skins|resources)/)));
      `,
      'i'
    );

    if (!user || !(typeof forwardedUri === 'string')) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const forwardUriAllowedPrefixes = JSON.parse(
      process.env.WIKIADVISER_LANGUAGES!
    ).map((lang: string) => `/${lang}/api.php`);
    const forwardUriStartsWith = JSON.parse(
      process.env.WIKIADVISER_LANGUAGES!
    ).map((lang: string) => `/${lang}/api.php?`);

    const hasAllowedPrefixes =
      (forwardedMethod === 'POST' &&
        forwardUriAllowedPrefixes.some(
          (prefix: string) => forwardedUri === prefix
        )) ||
      forwardedUri.match(allowedPrefixRegEx);

    if (!hasAllowedPrefixes) {
      const isRequestFromVisualEditor =
        forwardUriStartsWith.some((prefix: string) =>
          forwardedUri.startsWith(prefix)
        ) && req.query.action === 'visualeditor';

      const articleId = isRequestFromVisualEditor
        ? (req.query.page as string)
        : forwardedUri.match(articleIdRegEx)?.[2];

      const permission = articleId
        ? await hasPermission(articleId, user.id)
        : null;

      if (!permission) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }
    return res.sendStatus(200);
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
