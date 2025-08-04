import { z } from 'zod';

export const NotificationPayloadSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  schema: z.string(),
  record: z.record(z.any()),
  old_record: z.any().nullable().optional(),
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

export type Notification = {
  user_id: string;
  article_id: string;
  type: 'revision' | 'comment' | 'role';
  action: string;
  triggered_by: string;
  params: Record<string, unknown>;
  is_read: boolean;
};