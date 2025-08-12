import { Notification, TriggerPayload } from '../schema.ts';
import { getArticleParticipants } from '../utils/db.ts';

export async function handleRevisionInsert(
  payload: TriggerPayload
): Promise<Notification[]> {
  const { article_id, contributor_id } = payload.record;
  const participants = await getArticleParticipants(article_id);

  return participants
    .filter((uid) => uid !== contributor_id)
    .map((uid) => ({
      user_id: uid,
      article_id,
      type: 'revision',
      action: 'insert',
      triggered_by: contributor_id,
      triggered_on: uid,
      is_read: false,
    }));
}
