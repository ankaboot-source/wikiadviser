import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../_shared/supabaseAdmin.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";

// Updates the authenticated user's `last_seen` timestamp. Uses the admin client
// because the browser RLS grant on profiles is column-restricted and does not
// include last_seen (see migrations/20260807120000_add_last_seen_to_profiles.sql).
export async function setLastSeen(c: Context) {
  const supabaseClient = createSupabaseClient(c.req.header("Authorization"));
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return c.text("Unauthorized", { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return c.json({ ok: true });
}
