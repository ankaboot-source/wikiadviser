import { Payload } from '../schema.ts';

export function handleNotificationRead(payload: Payload) {
  if (payload.old_record.is_read !== payload.record.is_read) {
    const { user_id, message } = payload.record as {
      user_id: string;
      message: string;
    };
    console.log(
      `Notification marked as read for user ${user_id}: ${message}`
    );
  }
}