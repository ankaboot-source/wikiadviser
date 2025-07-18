import { Payload } from '../schema.ts';
import { handleRevisionInsert } from './handleRevisionInsert.ts';
import { handlePermissionChange } from './handlePermissionChange.ts';
import { handleCommentInsert } from './handleCommentInsert.ts';
import { handleNotificationRead } from './handleNotificationRead.ts';

export async function handleDbChange(payload: Payload) {
  switch (payload.table) {
    case 'revisions':
      if (payload.type === 'INSERT') await handleRevisionInsert(payload);
      break;

    case 'permissions':
      if (payload.type === 'INSERT' || payload.type === 'UPDATE')
        await handlePermissionChange(payload);
      break;

    case 'comments':
      if (payload.type === 'INSERT') await handleCommentInsert(payload);
      break;

    case 'notifications':
      if (payload.type === 'UPDATE') await handleNotificationRead(payload);
      break;

    default:
      console.log(
        'No handler for table:',
        payload.table,
        'type:',
        payload.type
      );
  }
}