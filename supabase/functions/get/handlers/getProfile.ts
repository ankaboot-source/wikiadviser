import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";
import createSupabaseClient from "../../_shared/supabaseClient.ts";

export async function getProfile(c: Context) {
  const supabaseClient = createSupabaseClient(
    c.req.header("Authorization"),
  );

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return new Response("", {
      status: 401,
    });
  }

  const supabaseAdmin = createSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("profiles_view")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return c.json({ message: error.message }, 500);
  }

  return c.json({ profile: data });
}
