import {
  Notification,
  NotificationAction,
  NotificationType,
  TriggerPayload,
} from '../schema.ts';
import { getArticleParticipants, getRevisionContributor } from '../utils/db.ts';

export async function handleRevisionInsert(
  payload: TriggerPayload
): Promise<Notification[]> {
  const { article_id, id: revision_id } = payload.record;

  const contributor_id = await getRevisionContributor(revision_id);

  if (!contributor_id) {
    return [];
  }

  const participants = await getArticleParticipants(article_id);

  return participants
    .filter((uid) => uid !== contributor_id)
    .map((uid) => ({
      user_id: uid,
      article_id,
      type: NotificationType.Revision,
      action: NotificationAction.Insert,
      triggered_by: contributor_id,
      triggered_on: uid,
      is_read: false,
    }));
}
