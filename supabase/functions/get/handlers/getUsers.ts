import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

export async function getUsers(c: Context) {
  const supabaseAdmin = createSupabaseAdmin();
  const { articleId } = await c.req.json();

  if (!articleId) {
    return c.json({ message: "articleId is required" }, 400);
  }

  const { data, error } = await supabaseAdmin
    // Fetch permissions of users of a specific article id
    .from('permissions')
    .select(
      `
      id,
      article_id,
      role,
      user: profiles_view(id, email, avatar_url, display_name)
      `,
    )
    .order('created_at')
    .eq('article_id', articleId);

  if (error) {
    throw new Error(error.message);
  }

  return c.json(data);
}
