import  createSupabaseAdmin  from '../../_shared/supabaseAdmin.ts';
import { Notification } from '../schema.ts';

export async function insertNotifications(
  notifications: Notification[]
) {
  if (!notifications.length) return;

  const supabase = createSupabaseAdmin();
  console.log('Inserting notifications:', JSON.stringify(notifications, null, 2));
  
  const { error } = await supabase
    .from('notifications')
    .insert(notifications);
  
  if (error) {
    console.error('Error inserting notifications:', JSON.stringify(error, null, 2));
    throw error;
  }
}