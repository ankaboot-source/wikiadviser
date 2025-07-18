import { Payload } from '../schema.ts';
import { safeSingle } from '../utils/safeSingle.ts';
import { insertNotifications } from '../utils/insertNotifications.ts';
import createSupabaseClient from '../../_shared/supabaseClient.ts';
import { RecipientRow } from "../types.ts";

export async function handleRevisionInsert(payload: Payload) {
  const supabase = createSupabaseClient();
  const { article_id, created_by } = payload.record as {
    article_id: string;
    created_by: string;
  };

  const article = await safeSingle<{ title: string }>(
    supabase.from('articles').select('title').eq('id', article_id)
  );
  if (!article) return;

  const { data: recipients, error } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', article_id)
    .in('role', ['owner', 'editor']);

  if (error) return console.error('Error fetching recipients:', error);

  const notifications = (recipients || [])
  .filter(({ user_id }: RecipientRow) => user_id !== created_by)
  .map(({ user_id }: RecipientRow) => ({
    user_id,
    message: `A new revision to ${article.title} has been made.`,
  }));

  await insertNotifications(notifications);
}