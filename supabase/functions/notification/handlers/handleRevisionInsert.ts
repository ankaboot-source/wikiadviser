import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';
import { Notification, NotificationPayload } from '../schema.ts';
import { getArticleTitle } from '../utils/helpers.ts';

export async function handleRevisionInsert(
  payload: NotificationPayload
): Promise<Notification[]> {
  const supabase = createSupabaseAdmin();
  const { article_id, contributor_id } = payload.record;
  const notifications: Notification[] = [];
  const articleTitle = await getArticleTitle(article_id);

  const { data: recipients, error } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', article_id);

  if (error) throw error;

  for (const { user_id } of recipients || []) {
    if (user_id !== contributor_id) {
      notifications.push({
        user_id,
        article_id,
        type: 'revision',
        action: 'create',
        triggered_by: contributor_id,
        params: { articleTitle },
        is_read: false,
      });
    }
  }

  return notifications;
}