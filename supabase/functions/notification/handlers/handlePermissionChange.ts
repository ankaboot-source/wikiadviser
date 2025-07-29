import { safeSingle } from '../utils/safeSingle.ts';
import  createSupabaseAdmin  from '../../_shared/supabaseAdmin.ts';
import { Notification, Payload, RecipientRow } from '../schema.ts';

export async function handlePermissionChange(
  payload: Payload
): Promise<Notification[]> {
  const supabase = createSupabaseAdmin();
  const { article_id, user_id, role } = payload.record;
  const notifications: Notification[] = [];

  const article = await safeSingle<{ title: string }>(
    supabase.from('articles').select('title').eq('id', article_id)
  );
  if (!article) return [];

  const userProfile = await safeSingle<{ email: string }>(
    supabase.from('profiles').select('email').eq('id', user_id)
  );
  const userName = userProfile?.email || 'a user';

  // Notification for the affected user
  if (['owner', 'editor', 'reviewer'].includes(role)) {
    notifications.push({
      user_id,
      message: `You have been granted ${role} permission to ${article.title}.`,
    });
  }

  // Notifications for other editors/owners
  const { data: others, error } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', article_id)
    .in('role', ['owner', 'editor'])
    .neq('user_id', user_id);

  if (!error && others) {
    others.forEach(({ user_id: uid }: RecipientRow) => {
      notifications.push({
        user_id: uid,
        message: `${userName} has been granted ${role} access to ${article.title}.`,
      });
    });
  }

  return notifications;
}