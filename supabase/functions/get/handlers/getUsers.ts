import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

export async function getUsers(c: any) {
  const supabaseAdmin = createSupabaseAdmin();
  const { articleId } = await c.req.json();

  if (!articleId) {
    return c.json({ message: "articleId is required" }, 400);
  }

  const { data: permissionsData, error: permissionsError } = await supabaseAdmin
    .from("permissions")
    .select("id, article_id, role, user_id")
    .order("created_at")
    .eq("article_id", articleId);

  if (permissionsError) {
    return c.json({ message: permissionsError.message }, 500);
  }

  if (!permissionsData || permissionsData.length === 0) {
    return c.json({ users: [] });
  }

  const userIds = permissionsData.map((p) => p.user_id);

  const { data: profiles } = await supabaseAdmin
    .from("profiles_view")
    .select("id, email, avatar_url, display_name")
    .in("id", userIds);

  const profilesMap = new Map(profiles?.map((p) => [p.id, p]));

  const users = permissionsData.map((permission) => {
    const profile = profilesMap.get(permission.user_id);
    return {
      id: profile?.id,
      picture: profile?.avatar_url,
      name: profile?.display_name || profile?.email,
      role: permission.role,
      permissionId: permission.id,
    };
  });

  return c.json({ users });
}
