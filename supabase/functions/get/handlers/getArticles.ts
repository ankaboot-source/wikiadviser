import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

export type Article = {
  article_id: string;
  title: string;
  description: string;
  permission_id: string;
  role: any;
  created_at: Date;
  language: string;
  web_publication: boolean;
  imported: boolean;
  latest_change: {
    created_at: Date;
    name: string;
  };
};

export async function getArticles(c: any) {
  const supabaseAdmin = createSupabaseAdmin();
  const { userId } = await c.req.json();

  if (!userId) {
    return c.json({ message: "userId is required" }, 400);
  }

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
    .eq("user_id", userId)
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
    return [];
  }

  return c.json(data);
}
