import * as Sentry from '@sentry/node';
import { Router } from 'express';
import logger from '../logger';

export default function initializeSentry(
  app: Router,
  dsn: string,
  environment?: string
) {
  Sentry.init({
    dsn,
    environment,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations()
    ],
    tracesSampleRate: 1.0
  });

  logger.info('Sentry integrated to the server ✔️.');
}
