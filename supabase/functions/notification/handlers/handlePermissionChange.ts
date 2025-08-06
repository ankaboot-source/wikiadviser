import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';
import { Notification, NotificationPayload } from '../schema.ts';
import { getArticleTitle, getUserEmail } from '../utils/helpers.ts';

export async function handlePermissionChange(
  payload: NotificationPayload
): Promise<Notification[]> {
  const { type, record, old_record } = payload;
  const { user_id, article_id, role, granted_by } = record;
  const notifications: Notification[] = [];
  const articleTitle = await getArticleTitle(article_id);
  const userEmail = await getUserEmail(user_id);

  if (type === 'INSERT') {
    notifications.push({
      user_id,
      article_id,
      type: 'role',
      action: 'create', 
      triggered_by: granted_by ?? user_id,
      params: {
        role,
        articleTitle,
        isForSelf: true,
      },
      is_read: false,
    });

    const supabase = createSupabaseAdmin();
    const { data: others, error } = await supabase
      .from('permissions')
      .select('user_id')
      .eq('article_id', article_id)
      .in('role', ['owner', 'editor'])
      .neq('user_id', user_id);

    if (!error && others) {
      for (const { user_id: other_id } of others) {
        notifications.push({
          user_id: other_id,
          article_id,
          type: 'role',
          action: 'create',
          triggered_by: granted_by ?? user_id,
          params: {
            userName: userEmail,
            role,
            articleTitle,
            isForSelf: false,
          },
          is_read: false,
        });
      }
    }
  }

  if (type === 'UPDATE' && old_record?.role && old_record.role !== role) {
    notifications.push({
      user_id,
      article_id,
      type: 'role',
      action: 'update',
      triggered_by: granted_by ?? user_id,
      params: {
        role,
        articleTitle,
        isForSelf: true,
      },
      is_read: false,
    });
  }

  return notifications;
}
