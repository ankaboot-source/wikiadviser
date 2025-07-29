import { z } from 'zod';

export const NotificationSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  record: z.any(),
  old_record: z.any().optional(),
});
export type Payload = z.infer<typeof NotificationSchema>;

export interface RecipientRow {
  user_id: string;
}

export interface Notification {
  user_id: string;
  message: string;
}