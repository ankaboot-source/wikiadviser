import { Payload } from '../schema.ts';
import { safeSingle } from '../utils/safeSingle.ts';
import { insertNotifications } from '../utils/insertNotifications.ts';
import createSupabaseClient from '../../_shared/supabaseClient.ts';
import { CommentRow } from '../types.ts';

export async function handleCommentInsert(payload: Payload) {
  const supabase = createSupabaseClient();
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
  if (!change) return;

  const article = await safeSingle<{ title: string }>(
    supabase.from('articles').select('title').eq('id', change.article_id)
  );
  if (!article) return;

  const commenterProfile = await safeSingle<{ email: string }>(
    supabase.from('profiles').select('email').eq('id', commenter_id)
  );
  const userName = commenterProfile?.email || 'Unknown User';

  const { data: participants } = await supabase
    .from('comments')
    .select('commenter_id')
    .eq('change_id', change_id);

  const ids = new Set<string>([
    change.contributor_id,
    ...(participants?.map((p: CommentRow) => p.commenter_id) || []),
  ]);

  const notifications = Array.from(ids)
    .filter((uid: string) => uid !== commenter_id)
    .map((user_id: string) => ({
      user_id,
      message: `${userName} has replied to your change on article ${article.title}`,
    }));

  await insertNotifications(notifications);
}