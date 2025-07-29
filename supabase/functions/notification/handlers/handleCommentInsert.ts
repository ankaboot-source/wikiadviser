import { safeSingle } from '../utils/safeSingle.ts';
import  createSupabaseAdmin  from '../../_shared/supabaseAdmin.ts';
import { Notification, Payload } from '../schema.ts';

interface CommentParticipant {
  commenter_id: string;
}

export async function handleCommentInsert(
  payload: Payload
): Promise<Notification[]> {
  const supabase = createSupabaseAdmin();
  const { change_id, commenter_id } = payload.record;
  const notifications: Notification[] = [];

  const change = await safeSingle<{
    article_id: string;
    contributor_id: string;
  }>(supabase.from('changes').select('article_id, contributor_id').eq('id', change_id));
  if (!change) return [];

  const article = await safeSingle<{ title: string }>(
    supabase.from('articles').select('title').eq('id', change.article_id)
  );
  if (!article) return [];

  const commenterProfile = await safeSingle<{ email: string }>(
    supabase.from('profiles').select('email').eq('id', commenter_id)
  );
  const commenterName = commenterProfile?.email || 'A user';

  const { data: participants, error } = await supabase
    .from('comments')
    .select('commenter_id')
    .eq('change_id', change_id);

  if (error) return [];

  // Type the participants array
  const participantList = participants as CommentParticipant[] | null;
  
  const ids = new Set<string>([
    change.contributor_id,
    ...(participantList?.map(p => p.commenter_id) || []),
  ]);

  ids.forEach(uid => {
    if (uid !== commenter_id) {
      const message = uid === change.contributor_id
        ? `${commenterName} has replied to your change on article ${article.title}.`
        : `A new comment has been made to a change on ${article.title}.`;
      
      notifications.push({
        user_id: uid,
        message,
      });
    }
  });

  return notifications;
}