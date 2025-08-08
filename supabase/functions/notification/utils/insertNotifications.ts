import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";
import { Notification } from "../schema.ts";

export async function insertNotification(notification: Notification) {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("notifications")
    .insert(notification);

  if (error) throw error;
  console.log('Inserted notification.');
}
