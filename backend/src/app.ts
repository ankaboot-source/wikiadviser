import * as Sentry from '@sentry/node';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import express, { json } from 'express';
import logger from './logger';
import authorizationMiddlware from './middleware/auth';
import corsMiddleware from './middleware/cors';
import errorHandler from './middleware/errorHandler';
import initializeSentry from './middleware/sentry';
import articleRouter from './routes/article.routes';
import authRouter from './routes/auth.routes';
import wikipediaRouter from './routes/wikipedia.routes';
import ENV from './schema/env.schema';

const { WIKIADVISER_API_PORT, SENTRY_DSN, SENTRY_ENV_BACKEND } = ENV;
const port = WIKIADVISER_API_PORT;

const app = express();

if (SENTRY_DSN) {
  initializeSentry(app, SENTRY_DSN, SENTRY_ENV_BACKEND);
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(json({ limit: '10mb' }));
app.use(corsMiddleware);
app.use(cookieParser());
app.use(authRouter);
app.use(authorizationMiddlware);

app.use(articleRouter);
app.use(wikipediaRouter);

if (SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
