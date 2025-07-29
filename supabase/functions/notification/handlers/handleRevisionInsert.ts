import { safeSingle } from '../utils/safeSingle.ts';
import  createSupabaseAdmin  from '../../_shared/supabaseAdmin.ts';
import { Notification, Payload, RecipientRow } from '../schema.ts';

export async function handleRevisionInsert(
  payload: Payload
): Promise<Notification[]> {
  const supabase = createSupabaseAdmin();
  const { article_id, contributor_id } = payload.record;
  const notifications: Notification[] = [];

  const article = await safeSingle<{ title: string }>(
    supabase.from('articles').select('title').eq('id', article_id)
  );
  if (!article) return [];

  // Fetch all users with permissions for this article (owners, editors, reviewers)
  const { data: recipients, error } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', article_id);

  if (error) return [];

  recipients?.forEach(({ user_id }: RecipientRow ) => {
    // Only notify if user didn't create the revision
    if (user_id !== contributor_id) {
      notifications.push({
        user_id,
        message: `A new revision to "${article.title}" has been made.`,
      });
    }
  });

  return notifications;
}