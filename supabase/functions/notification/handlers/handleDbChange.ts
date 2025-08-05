import { Notification, NotificationPayload } from '../schema.ts';
import { handleRevisionInsert } from './handleRevisionInsert.ts';
import { handleCommentInsert } from './handleCommentInsert.ts';
import { handlePermissionChange } from './handlePermissionChange.ts';
import { insertNotifications } from '../utils/insertNotifications.ts';

export async function handleDbChange(
  payload: NotificationPayload
): Promise<void> {
  let notifications: Notification[] = [];

  switch (payload.table) {
    case 'changes':
      if (payload.type === 'INSERT') {
        notifications = await handleRevisionInsert(payload);
      }
      break;
    case 'comments':
      if (payload.type === 'INSERT') {
        notifications = await handleCommentInsert(payload);
      }
      break;
    case 'permissions':
      if (payload.type === 'INSERT' || payload.type === 'UPDATE') {
        notifications = await handlePermissionChange(payload);
      }
      break;
    default:
    console.warn(`Unhandled table: ${payload.table}`);
    break;
  }

  if (notifications.length) {
    await insertNotifications(notifications);
  } else {
    console.log('No notifications to insert.');
  }
}