import { Hono } from 'hono';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import { NotificationSchema } from './schema.ts';
import { handleDbChange } from './handlers/handleDbChange.ts';

const app = new Hono().basePath('/notify');
app.use('*', corsMiddleware);

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received payload:', JSON.stringify(body, null, 2));

    const parse = NotificationSchema.safeParse(body);
    if (!parse.success) {
      console.error('Invalid payload:', JSON.stringify(parse.error, null, 2));
      return c.text('Bad payload', 400);
    }

    await handleDbChange(parse.data);
    return c.text('ok', 200);
  } catch (err) {
    console.error('Notify error:', JSON.stringify(err, null, 2));
    return c.text('internal error', 500);
  }
});

Deno.serve(app.fetch);