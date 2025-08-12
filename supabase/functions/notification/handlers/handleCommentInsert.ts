import { Notification, TriggerPayload } from '../schema.ts';
import { supabase } from '../utils/db.ts';
import { safeSingle } from '../utils/safeSingle.ts';

export async function handleCommentInsert(
  payload: TriggerPayload
): Promise<Notification[]> {
  const { change_id, commenter_id } = payload.record;

  const change = await safeSingle<{
    article_id: string;
    contributor_id: string;
  }>(
    supabase
      .from('changes')
      .select('article_id, contributor_id')
      .eq('id', change_id)
  );
  if (!change) return [];

  const notifications: Notification[] = [];
  const alreadyNotified = new Set([commenter_id]);

  if (change.contributor_id !== commenter_id) {
    notifications.push({
      user_id: change.contributor_id,
      article_id: change.article_id,
      type: 'comment',
      action: 'insert',
      triggered_by: commenter_id,
      triggered_on: change.contributor_id,
      is_read: false,
    });
    alreadyNotified.add(change.contributor_id);
  }

  const { data: others } = await supabase
    .from('comments')
    .select('commenter_id')
    .eq('change_id', change_id)
    .neq('commenter_id', commenter_id);
  if (others) {
    for (const { commenter_id: cid } of others) {
      if (!alreadyNotified.has(cid)) {
        notifications.push({
          user_id: cid,
          article_id: change.article_id,
          type: 'comment',
          action: 'insert',
          triggered_by: commenter_id,
          triggered_on: change.contributor_id,
          is_read: false,
        });
        alreadyNotified.add(cid);
      }
    }
  }

  return notifications;
}
