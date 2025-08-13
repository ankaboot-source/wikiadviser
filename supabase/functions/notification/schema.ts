import { z } from 'zod';

export const TriggerPayloadSchema = z.object({
  type: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  table: z.string(),
  schema: z.string(),
  record: z.record(z.any()),
  old_record: z.any().nullable().optional(),
});

export type TriggerPayload = z.infer<typeof TriggerPayloadSchema>;

export type Notification = {
  user_id: string; 
  article_id: string;
  type: 'revision' | 'comment' | 'role';
  action: 'insert' | 'update' | 'delete';
  triggered_by: string; // the one who caused the action
  triggered_on?: string | null; // the one who was affected by the action 
  is_read?: boolean;
};