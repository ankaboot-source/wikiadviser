import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';
import { Notification, NotificationPayload } from '../schema.ts';
import { getArticleTitle, getUserEmail } from '../utils/helpers.ts';
import { safeSingle } from '../utils/safeSingle.ts';

export async function handleCommentInsert(
  payload: NotificationPayload
): Promise<Notification[]> {
  const supabase = createSupabaseAdmin();
  const { change_id, commenter_id } = payload.record;
  const notifications: Notification[] = [];

  const change = await safeSingle<{
    article_id: string;
    contributor_id: string;
  }>(
    supabase.from('changes').select('article_id, contributor_id').eq('id', change_id)
  );
  if (!change) return notifications;

  const articleTitle = await getArticleTitle(change.article_id);
  const commenterEmail = await getUserEmail(commenter_id);

  if (change.contributor_id !== commenter_id) {
    notifications.push({
      user_id: change.contributor_id,
      article_id: change.article_id,
      type: 'comment',
      action: 'create',
      triggered_by: commenter_id,
      params: { articleTitle, commenterName: commenterEmail },
      is_read: false,
    });
  }

  // 2. Notify all other commenters on this change
  const { data: otherCommenters, error: commentError } = await supabase
    .from('comments')
    .select('commenter_id')
    .eq('change_id', change_id)
    .neq('commenter_id', commenter_id); // Exclude current commenter

  if (!commentError && otherCommenters) {
    const uniqueCommenters = [...new Set(
      otherCommenters
        .map(c => c.commenter_id)
        .filter(id => id !== change.contributor_id)
    )];

    for (const commenterId of uniqueCommenters) {
      notifications.push({
        user_id: commenterId,
        article_id: change.article_id,
        type: 'comment',
        action: 'create',
        triggered_by: commenter_id,
        params: { articleTitle, commenterName: commenterEmail },
        is_read: false,
      });
    }
  }

  const { data: editors, error: editorError } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', change.article_id)
    .in('role', ['owner', 'editor']);

  if (!editorError && editors) {
    // Get list of already notified users
    const alreadyNotified = new Set([
      commenter_id,
      change.contributor_id,
      ...(otherCommenters?.map(c => c.commenter_id) || [])
    ]);

    for (const { user_id } of editors) {
      if (!alreadyNotified.has(user_id)) {
        notifications.push({
          user_id,
          article_id: change.article_id,
          type: 'comment',
          action: 'create',
          triggered_by: commenter_id,
          params: { articleTitle, commenterName: commenterEmail },
          is_read: false,
        });
      }
    }
  }

  return notifications;
}