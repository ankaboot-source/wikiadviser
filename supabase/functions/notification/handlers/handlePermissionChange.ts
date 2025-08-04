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
  const supabase = createSupabaseAdmin();

  if (type === 'INSERT') {
    notifications.push({
      user_id,
      article_id,
      type: 'role',
      action: 'create',
      triggered_by: granted_by ?? user_id,
      params: { role, articleTitle },
      is_read: false,
    });

    
    const { data: existingUsers, error } = await supabase
      .from('permissions')
      .select('user_id')
      .eq('article_id', article_id)
      .in('role', ['owner', 'editor'])
      .neq('user_id', user_id);

    if (!error && existingUsers) {
      const usersToNotify = existingUsers.filter(u => u.user_id !== granted_by);

      for (const { user_id: existing_user_id } of usersToNotify) {
        notifications.push({
          user_id: existing_user_id,
          article_id,
          type: 'role',
          action: 'create_others',
          triggered_by: granted_by ?? user_id,
          params: { userName: userEmail, role, articleTitle },
          is_read: false,
        });
      }
    }
  }

  if (type === 'UPDATE' && old_record?.role && old_record.role !== role) {
    // 1. Notify the user whose role was updated
    notifications.push({
      user_id,
      article_id,
      type: 'role',
      action: 'update',
      triggered_by: granted_by ?? user_id,
      params: { role, articleTitle },
      is_read: false,
    });

    
    const { data: existingUsers, error } = await supabase
      .from('permissions')
      .select('user_id')
      .eq('article_id', article_id)
      .in('role', ['owner', 'editor'])
      .neq('user_id', user_id); 

    if (!error && existingUsers) {
      const usersToNotify = existingUsers.filter(u => u.user_id !== granted_by);

      for (const { user_id: existing_user_id } of usersToNotify) {
        notifications.push({
          user_id: existing_user_id,
          article_id,
          type: 'role',
          action: 'update_others',
          triggered_by: granted_by ?? user_id,
          params: { userName: userEmail, role, articleTitle },
          is_read: false,
        });
      }
    }
  }

  return notifications;
}