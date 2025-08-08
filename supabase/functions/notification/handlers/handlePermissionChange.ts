import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";
import { Notification, TriggerPayload } from "../schema.ts";

async function getOwner(articleId: string): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const { data: owner, error } = await supabase
    .from("permissions")
    .select("user_id")
    .eq("article_id", articleId)
    .eq("role", "owner")
    .single();

  return error ? null : owner.user_id;
}

export async function handlePermissionChange(
  payload: TriggerPayload,
): Promise<Notification | undefined> {
  const { type, record } = payload;
  const { user_id, article_id, role } = record;
  const triggered_by = await getOwner(article_id);
  const triggered_on = user_id;

  if (role === "owner" || role === "viewer" || !triggered_by) return;

  const notification: Notification = {
    article_id,
    action: type.toLowerCase() as "insert" | "update" | "delete",
    triggered_by,
    triggered_on,
    type: "role",
  };
  return notification;
}
