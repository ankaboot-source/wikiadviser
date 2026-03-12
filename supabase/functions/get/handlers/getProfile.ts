import createSupabaseAdmin from "../_shared/supabaseAdmin.ts";

export async function getProfile(c: any) {
  const supabaseAdmin = createSupabaseAdmin();
  const { userId } = await c.req.json();

  if (!userId) {
    return c.json({ message: "userId is required" }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from("profiles_view")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return c.json({ message: error.message }, 500);
  }

  return c.json({ profile: data });
}
