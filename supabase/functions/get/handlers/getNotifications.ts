import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

/**
 * Contract returned to the frontend. Mirrored in
 * `frontend/src/components/NotificationsBell.vue` — keep them in sync.
 *
 * - List case (userId provided): `{ notifications: NotificationRow[] }`
 * - Single case (id provided): `{ notification: NotificationRow | null }`
 */
export interface GetNotificationsResponse {
  notifications?: unknown[];
  notification?: unknown;
}

export async function getNotifications(c: Context) {
  const supabaseAdmin = createSupabaseAdmin();
  const { userId, id } = await c.req.json();

  if (!userId && !id) {
    return c.json({ message: "userId or id is required" }, 400);
  }

  // NOTE: `notifications` has TWO FKs to profiles
  // (`notifications_triggered_by_fkey`, `notifications_triggered_on_fkey`), so
  // embedding `profiles_view` WITHOUT FK hints fails with PGRST201 ambiguity.
  // The explicit FK hints below pin each embed to its constraint. If either
  // constraint is ever renamed or dropped, the embed will silently break or 400.
  const select = `
    id,
    user_id,
    type,
    action,
    article_id,
    triggered_by,
    triggered_on,
    is_read,
    created_at,
    article:articles ( title ),
    triggered_by_profile:profiles_view!notifications_triggered_by_fkey(id, email, display_name),
    triggered_on_profile:profiles_view!notifications_triggered_on_fkey(id, email, display_name)
  `;

  if (id) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select(select)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error?.message ?? "Could not get notifications");
    }

    return c.json({ notification: data });
  }

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select(select)
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error?.message ?? "Could not get notifications");
  }

  return c.json({ notifications: data ?? [] });
}