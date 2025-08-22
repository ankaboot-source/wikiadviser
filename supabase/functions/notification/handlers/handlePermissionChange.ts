import {
  Notification,
  NotificationAction,
  NotificationType,
  TriggerPayload,
} from '../schema.ts';
import { getOwner } from '../utils/db.ts';

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
      type: NotificationType.Role,
      action: NotificationAction.Insert,
      triggered_by: await getOwner(article_id),
      triggered_on: affectedUserId,
      is_read: false,
    });

    const ownerId = await getOwner(article_id);

    notifications.push({
      user_id: ownerId,
      article_id,
      type: NotificationType.Role,
      action: NotificationAction.Insert,
      triggered_by: ownerId,
      triggered_on: affectedUserId,
      is_read: false,
    });
  }

  if (type === 'UPDATE') {
    notifications.push({
      user_id: affectedUserId,
      article_id,
      type: NotificationType.Role,
      action: NotificationAction.Update,
      triggered_by: await getOwner(article_id),
      triggered_on: affectedUserId,
      is_read: false,
    });
  }

  return notifications;
}
