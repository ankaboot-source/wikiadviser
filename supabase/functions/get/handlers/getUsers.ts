import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";
import createSupabaseClient from "../../_shared/supabaseClient.ts";

export async function getUsers(c: Context) {
  // Authenticate the caller.
  const supabaseClient = createSupabaseClient(c.req.header("Authorization"));
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return c.text("Unauthorized", { status: 401 });
  }

  const { articleId } = await c.req.json();

  if (!articleId) {
    return c.json({ message: "articleId is required" }, 400);
  }

  const supabaseAdmin = createSupabaseAdmin();

  // Authorize: the caller must hold a permission on this article. Without this
  // check, anyone with the anon key could enumerate collaborator emails and
  // last_seen for guessable article ids (security review H2).
  const { data: callerPermission, error: permissionError } = await supabaseAdmin
    .from("permissions")
    .select("id")
    .eq("article_id", articleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (permissionError) {
    throw new Error(permissionError.message);
  }
  if (!callerPermission) {
    return c.text("Forbidden", { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    // Fetch permissions of users of a specific article id
    .from('permissions')
    .select(
      `
      id,
      article_id,
      role,
      user: profiles_view(id, email, avatar_url, display_name, last_seen)
      `,
    )
    .order('created_at')
    .eq('article_id', articleId);

  if (error) {
    throw new Error(error.message);
  }

  return c.json(data);
}
