import createSupabaseClient from '../../_shared/supabaseClient.ts';
export async function insertNotifications(
  notifications: { user_id: string; message: string }[]
) {
  if (!notifications.length) return;

  console.log(
    'Attempting to insert notifications:',
    JSON.stringify(notifications, null, 2)
  );

  const supabase = createSupabaseClient();
  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error('Error inserting notifications:', error);
  } else {
    console.log(
      'Inserted notifications:',
      JSON.stringify(notifications, null, 2)
    );
  }
}