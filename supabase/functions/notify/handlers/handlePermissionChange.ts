import { Payload } from '../schema.ts';
import { safeSingle } from '../utils/safeSingle.ts';
import { insertNotifications } from '../utils/insertNotifications.ts';
import createSupabaseClient from '../../_shared/supabaseClient.ts';
import { RecipientRow } from "../types.ts";

export async function handlePermissionChange(payload: Payload) {
  const supabase = createSupabaseClient();
  const { article_id, user_id, role } = payload.record as {
    article_id: string;
    user_id: string;
    role: string;
  };

  const article = await safeSingle<{ title: string }>(
    supabase.from('articles').select('title').eq('id', article_id)
  );
  if (!article) return;

  const userProfile = await safeSingle<{ email: string }>(
    supabase.from('profiles').select('email').eq('id', user_id)
  );
  const userName = userProfile?.email || 'Unknown User';

  const notifications: { user_id: string; message: string }[] = [];

  // notify the affected user
  notifications.push({
    user_id,
    message:
      payload.type === 'INSERT'
        ? `You have been granted ${role} permission to ${article.title}.`
        : `Your permission for ${article.title} has been changed to ${role}.`,
  });

  // notify other owners/editors
  const { data: others, error } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', article_id)
    .in('role', ['owner', 'editor'])
    .neq('user_id', user_id);

  if (error) return console.error('Error fetching other recipients:', error);

  (others || []).forEach(({ user_id: uid }: RecipientRow) => {
    notifications.push({
      user_id: uid,
      message: `${userName} has been granted access to ${article.title}`,
    });
  });

  await insertNotifications(notifications);
}