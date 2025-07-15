import { Hono } from 'hono';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import { z } from 'zod';

// Schema & types
const NotificationSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  record: z.any(),
  old_record: z.any().optional(),
});
type Payload = z.infer<typeof NotificationSchema>;

// Helpers
interface RecipientRow {
  user_id: string;
}

async function safeSingle<T>(query: any): Promise<T | null> {
  const { data, error } = await query.single();
  if (error) {
    console.error('Query error:', JSON.stringify(error, null, 2));
    return null;
  }
  return data;
}

async function handleDbChange(payload: Payload) {
  const supabase = createSupabaseClient();
  const notifications: { user_id: string; message: string }[] = [];

  try {
    console.log(
      'Processing payload for table:',
      payload.table,
      'type:',
      payload.type
    );

    /* 1. New revision */
    if (payload.table === 'revisions' && payload.type === 'INSERT') {
      const { article_id, created_by } = payload.record as {
        article_id: string;
        created_by: string;
      };

      const article = await safeSingle<{ title: string }>(
        supabase.from('articles').select('title').eq('id', article_id)
      );
      if (!article) {
        console.error('Article not found for article_id:', article_id);
        return;
      }

      const { data: recipients, error } = await supabase
        .from('permissions')
        .select('user_id')
        .eq('article_id', article_id)
        .in('role', ['owner', 'editor']);

      if (error) {
        console.error(
          'Error fetching recipients:',
          JSON.stringify(error, null, 2)
        );
        return;
      }

      recipients?.forEach(({ user_id }: RecipientRow) => {
        if (user_id !== created_by) {
          notifications.push({
            user_id,
            message: `A new revision to ${article.title} has been made.`,
          });
        }
      });
    }

    /* 2. User added to article (INSERT) or role changed (UPDATE) */
    if (
      payload.table === 'permissions' &&
      (payload.type === 'INSERT' || payload.type === 'UPDATE')
    ) {
      const { article_id, user_id, role } = payload.record as {
        article_id: string;
        user_id: string;
        role: string;
      };

      const article = await safeSingle<{ title: string }>(
        supabase.from('articles').select('title').eq('id', article_id)
      );
      if (!article) {
        console.error('Article not found for article_id:', article_id);
        return;
      }

      // Fetch user_name from profiles
      const userProfile = await safeSingle<{ email: string }>(
        supabase.from('profiles').select('email').eq('id', user_id)
      );
      const userName = userProfile?.email || 'Unknown User';

      notifications.push({
        user_id,
        message:
          payload.type === 'INSERT'
            ? `You have been granted ${role} permission to ${article.title}.`
            : `Your permission for ${article.title} has been changed to ${role}.`,
      });

      const { data: others, error } = await supabase
        .from('permissions')
        .select('user_id')
        .eq('article_id', article_id)
        .in('role', ['owner', 'editor'])
        .neq('user_id', user_id);

      if (error) {
        console.error(
          'Error fetching other recipients:',
          JSON.stringify(error, null, 2)
        );
        return;
      }

      others?.forEach(({ user_id: uid }: RecipientRow) => {
        notifications.push({
          user_id: uid,
          message:
            payload.type === 'INSERT'
              ? `${userName} has been granted ${role} access to ${article.title}.`
              : `${userName}'s permission for ${article.title} has been changed to ${role}.`,
        });
      });
    }

    /* 3. New comment on a change */
    if (payload.table === 'comments' && payload.type === 'INSERT') {
      const { change_id, commenter_id } = payload.record as {
        change_id: string;
        commenter_id: string;
      };

      const change = await safeSingle<{
        article_id: string;
        contributor_id: string;
      }>(
        supabase
          .from('changes')
          .select('article_id, contributor_id')
          .eq('id', change_id)
      );
      if (!change) {
        console.error('Change not found for change_id:', change_id);
        return;
      }

      const article = await safeSingle<{ title: string }>(
        supabase.from('articles').select('title').eq('id', change.article_id)
      );
      if (!article) {
        console.error('Article not found for article_id:', change.article_id);
        return;
      }

      const { data: participants, error } = await supabase
        .from('comments')
        .select('commenter_id')
        .eq('change_id', change_id);

      if (error) {
        console.error(
          'Error fetching comment participants:',
          JSON.stringify(error, null, 2)
        );
        return;
      }

      const ids = new Set<string>([
        change.contributor_id,
        ...(participants?.map(
          (p: { commenter_id: string }) => p.commenter_id
        ) || []),
      ]);

      ids.forEach((uid: string) => {
        if (uid !== commenter_id) {
          notifications.push({
            user_id: uid,
            message: `A new comment has been made to a change on ${article.title}.`,
          });
        }
      });
    }

    /* 4. Notification marked as read */
    if (
      payload.table === 'notifications' &&
      payload.type === 'UPDATE' &&
      payload.old_record.is_read !== payload.record.is_read
    ) {
      const { user_id, message } = payload.record as {
        user_id: string;
        message: string;
      };
      console.log(
        `Notification marked as read for user ${user_id}: ${message}`
      );
    }

    if (notifications.length) {
      console.log(
        'Attempting to insert notifications:',
        JSON.stringify(notifications, null, 2)
      );
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);
      if (error) {
        console.error(
          'Error inserting notifications:',
          JSON.stringify(error, null, 2)
        );
        return;
      }
      console.log(
        'Inserted notifications:',
        JSON.stringify(notifications, null, 2)
      );
    } else if (payload.table !== 'notifications') {
      console.log(
        'No notifications to insert for payload:',
        JSON.stringify(payload, null, 2)
      );
    }
  } catch (error) {
    console.error('Error in handleDbChange:', JSON.stringify(error, null, 2));
    throw error;
  }
}

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
