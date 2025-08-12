import { Notification, TriggerPayload } from '../schema.ts';
import { getOwner } from '../utils/db.ts';

export async function handlePermissionChange(
  payload: TriggerPayload
): Promise<Notification[]> {
  const { type, record } = payload;
  const { user_id, article_id, role } = record;

  const ownerId = await getOwner(article_id);
  if (!ownerId || role === 'owner' || role === 'viewer') return [];

  return [
    {
      user_id,
      article_id,
      type: 'role',
      action: type.toLowerCase() as Notification['action'],
      triggered_by: ownerId,
      triggered_on: user_id,
      is_read: false,
    },
  ];
}
