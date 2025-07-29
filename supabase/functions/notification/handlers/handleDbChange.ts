import { Notification, Payload } from '../schema.ts';
import { insertNotifications } from '../utils/insertNotifications.ts';
import { handleRevisionInsert } from './handleRevisionInsert.ts';
import { handlePermissionChange } from './handlePermissionChange.ts';
import { handleCommentInsert } from './handleCommentInsert.ts';

export async function handleDbChange(payload: Payload) {
  try {
    let notifications: Notification[] = [];

    switch (true) {
      case payload.table === 'changes' && payload.type === 'INSERT':
        notifications = await handleRevisionInsert(payload);
        break;
      
      case payload.table === 'permissions' && 
          (payload.type === 'INSERT' || payload.type === 'UPDATE'):
        notifications = await handlePermissionChange(payload);
        break;
      
      case payload.table === 'comments' && payload.type === 'INSERT':
        notifications = await handleCommentInsert(payload);
        break;
      
      case payload.table === 'notifications' && 
          payload.type === 'UPDATE' && 
          payload.old_record?.is_read !== payload.record.is_read:
        console.log(`Notification marked as read for user ${payload.record.user_id}`);
        break;
    }

    if (notifications.length > 0) {
      await insertNotifications(notifications);
    }
  } catch (error) {
    console.error('Error in handleDbChange:', error);
    throw error;
  }
}