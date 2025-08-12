import { Notification, TriggerPayload } from '../schema.ts';
import { handleRevisionInsert } from './handleRevisionInsert.ts';
import { handleCommentInsert } from './handleCommentInsert.ts';
import { handlePermissionChange } from './handlePermissionChange.ts';
import { insertNotification } from '../utils/insertNotifications.ts';

export async function handleDbChange(payload: TriggerPayload) {
  let notifications: Notification[] = [];

  switch (payload.table) {
    case 'changes':
      notifications = await handleRevisionInsert(payload);
      break;
    case 'comments':
      notifications = await handleCommentInsert(payload);
      break;
    case 'permissions':
      notifications = await handlePermissionChange(payload);
      break;
    default:
      return;
  }

  if (!notifications.length) return;
  for (const n of notifications) {
    await insertNotification(n);
  }
}
