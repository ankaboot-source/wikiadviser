import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";
import createSupabaseClient from "../../_shared/supabaseClient.ts";

/**
 * Contract returned to the frontend. Mirrored in
 * `frontend/src/components/NotificationsBell.vue` — keep them in sync.
 *
 * - List case: `{ notifications: NotificationRow[] }` (unread, for the caller)
 * - Single case: `{ notification: NotificationRow | null }`
 */
export async function getNotifications(c: Context) {
  // Authenticate the caller so notifications are derived from the session's
  // user, never from a caller-supplied id (security: IDOR / data exposure).
  const supabaseClient = createSupabaseClient(c.req.header("Authorization"));
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  const supabaseAdmin = createSupabaseAdmin();
  const { id } = await c.req.json();

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

    // PGRST116 = no rows matched (a legitimately-missing notification). Treat
    // it as `{ notification: null }` rather than a server error.
    if (error && error.code !== "PGRST116") {
      throw new Error(error?.message ?? "Could not get notifications");
    }

    // Ownership check: the notification must belong to the caller.
    if (data?.user_id !== user.id) {
      return c.json({ notification: null });
    }

    return c.json({ notification: data });
  }

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select(select)
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error?.message ?? "Could not get notifications");
  }

  return c.json({ notifications: data ?? [] });
}
