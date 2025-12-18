import { z } from 'npm:zod@3.24.2';

export const TriggerPayloadSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  schema: z.string(),
  record: z.record(z.any()),
  old_record: z.any().nullable().optional(),
});

export type TriggerPayload = z.infer<typeof TriggerPayloadSchema>;
export enum NotificationType {
  Role = 'role',
  Revision = 'revision',
  Comment = 'comment',
}
export enum NotificationAction {
  Insert = 'insert',
  Update = 'update',
  Delete = 'delete',
}
export type Notification = {
  user_id: string; 
  article_id: string;
  type: NotificationType;
  action: NotificationAction;
  triggered_by: string; // the one who caused the action
  triggered_on?: string | null; // the one who was affected by the action 
  is_read?: boolean;
};