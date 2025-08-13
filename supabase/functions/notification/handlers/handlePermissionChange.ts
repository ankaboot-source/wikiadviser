import { Notification, TriggerPayload } from '../schema.ts';
import { getOwner, getEditors } from '../utils/db.ts';

export async function handlePermissionChange(
  payload: TriggerPayload
): Promise<Notification[]> {
  const { type, record } = payload;
  const { user_id: affectedUserId, article_id, role } = record;
  if (role === 'owner' || role === 'viewer') return [];
  const notifications: Notification[] = [];

  if (type === 'INSERT') {
    notifications.push({
      user_id: affectedUserId,
      article_id,
      type: 'role',
      action: 'insert',
      triggered_by: await getOwner(article_id),
      triggered_on: affectedUserId,
      is_read: false,
    });

    const ownerId = await getOwner(article_id);
    const editors = await getEditors(article_id);
    const recipients = new Set([ownerId, ...editors]);
    recipients.delete(affectedUserId);

    for (const recipientId of recipients) {
      notifications.push({
        user_id: recipientId,
        article_id,
        type: 'role',
        action: 'insert',
        triggered_by: ownerId,
        triggered_on: affectedUserId,
        is_read: false,
      });
    }
  }

  if (type === 'UPDATE') {
    notifications.push({
      user_id: affectedUserId,
      article_id,
      type: 'role',
      action: 'update',
      triggered_by: await getOwner(article_id),
      triggered_on: affectedUserId,
      is_read: false,
    });
  }

  return notifications;
}
