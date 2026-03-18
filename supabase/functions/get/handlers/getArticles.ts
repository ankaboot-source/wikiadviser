import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";
import createSupabaseClient from "../../_shared/supabaseClient.ts";

export async function getArticles(c: Context) {
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

  // check if user has permission on that Article
  const { data, error } = await supabaseAdmin
    .from("permissions")
    .select(
      `
      id,
      article_id,
      role,
      articles(
        title,
        description,
        created_at,
        language,
        web_publication,
        imported,
        changes!changes_article_id_fkey(
          created_at,
          profiles_view(display_name, email)
        )
      )
    `,
    )
    .eq("user_id", user.id)
    // Sort articles by created_at
    .order("articles(created_at)", {
      ascending: false,
    })
    // Keep only the first change in that sorted list
    .limit(1, { foreignTable: "articles.changes" });

  if (error) {
    throw new Error(error.message);
  }
  if (data.length === 0) {
    return c.json([]);
  }

  return c.json(data);
}
