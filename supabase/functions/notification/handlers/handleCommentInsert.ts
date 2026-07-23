import { Notification, NotificationAction, NotificationType, TriggerPayload } from '../schema.ts';
import { supabase } from '../utils/db.ts';
import { safeSingle } from '../utils/safeSingle.ts';

export async function handleCommentInsert(
  payload: TriggerPayload
): Promise<Notification[]> {
  const {
    change_id,
    revision_id,
    commenter_id,
    article_id,
    id: commentId,
  } = payload.record as {
    change_id?: string | null;
    revision_id?: string | null;
    commenter_id?: string | null;
    article_id?: string | null;
    id?: string;
  };

  if (!commenter_id) return [];

  // --- Path 1: change-level comment (existing behavior) ---
  if (change_id) {
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

    if (change.contributor_id && change.contributor_id !== commenter_id) {
      notifications.push({
        user_id: change.contributor_id,
        article_id: change.article_id,
        type: NotificationType.Comment,
        action: NotificationAction.Insert,
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
      .neq('id', commentId ?? '')
      .neq('commenter_id', commenter_id);
    if (others) {
      for (const { commenter_id: cid } of others) {
        if (!cid) continue;
        if (!alreadyNotified.has(cid)) {
          notifications.push({
            user_id: cid,
            article_id: change.article_id,
            type: NotificationType.Comment,
            action: NotificationAction.Insert,
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

  // --- Path 2: revision-level comment (new) ---
  if (revision_id) {
    const revision = await safeSingle<{ article_id: string }>(
      supabase.from('revisions').select('article_id').eq('id', revision_id)
    );
    const resolvedArticleId = revision?.article_id ?? article_id;
    if (!resolvedArticleId) return [];

    // Revision owner = contributor of the most recent change in the revision.
    const ownerChange = await safeSingle<{ contributor_id: string }>(
      supabase
        .from('changes')
        .select('contributor_id')
        .eq('revision_id', revision_id)
        .order('index', { ascending: false })
        .limit(1)
    );

    const notifications: Notification[] = [];
    const alreadyNotified = new Set([commenter_id]);
    const ownerId = ownerChange?.contributor_id ?? null;

    if (ownerId && ownerId !== commenter_id) {
      notifications.push({
        user_id: ownerId,
        article_id: resolvedArticleId,
        type: NotificationType.Comment,
        action: NotificationAction.Insert,
        triggered_by: commenter_id,
        triggered_on: ownerId,
        is_read: false,
      });
      alreadyNotified.add(ownerId);
    }

    // Other commenters on the same revision (any previous revision-level
    // comment by a different user).
    const { data: others } = await supabase
      .from('comments')
      .select('commenter_id')
      .eq('revision_id', revision_id)
      .neq('id', commentId ?? '')
      .neq('commenter_id', commenter_id);
    for (const { commenter_id: cid } of others || []) {
      if (!cid) continue;
      if (alreadyNotified.has(cid)) continue;
      notifications.push({
        user_id: cid,
        article_id: resolvedArticleId,
        type: NotificationType.Comment,
        action: NotificationAction.Insert,
        triggered_by: commenter_id,
        triggered_on: ownerId,
        is_read: false,
      });
      alreadyNotified.add(cid);
    }

    return notifications;
  }

  return [];
}
