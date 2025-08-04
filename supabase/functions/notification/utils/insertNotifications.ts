import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';
import { Notification } from '../schema.ts';

export async function insertNotifications(notifications: Notification[]) {
  if (!notifications.length) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('notifications')
    .insert(notifications);

  if (error) throw error;
  console.log(`Inserted ${notifications.length} notification(s).`);
}