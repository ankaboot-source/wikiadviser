import { corsMiddleware } from '../_shared/middleware/cors.ts';
import { Hono } from 'hono';
import { createShareLink } from './createShareLink.ts';
import { verifyShareLink } from './verifyShareLink.ts';

const functionName = 'share-link';
const app = new Hono().basePath(`/${functionName}`);
// Middleware to handle CORS
app.use('*', corsMiddleware);
// Add routes
app.post('/', createShareLink);
app.get('/:token', verifyShareLink);

Deno.serve((req) => {
  return app.fetch(req);
});
