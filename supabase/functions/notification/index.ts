import { Hono } from 'hono';
import { NotificationPayloadSchema } from './schema.ts';
import { handleDbChange } from './handlers/handleDbChange.ts';

const app = new Hono();

app.post('/notification', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = NotificationPayloadSchema.safeParse(body);
    
    if (!parsed.success) {
      console.error('Validation error', parsed.error);
      return c.text('Invalid payload', 400);
    }

    await handleDbChange(parsed.data);
    return c.text('OK');
  } catch (e) {
    console.error('Error handling notification:', e);
    return c.text('Internal Server Error', 500);
  }
});

export default app;