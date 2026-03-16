import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

export async function getArticles(c: any) {
  const supabaseAdmin = createSupabaseAdmin();
  const { userId } = await c.req.json();

  if (!userId) {
    return c.json({ message: "userId is required" }, 400);
  }

  const { data: articleData, error: articleError } = await supabaseAdmin
    .from("permissions")
    .select(
      `
      id,
      article_id,
      role,
      user_id,
      articles!inner(
        title,
        description,
        created_at,
        language,
        web_publication,
        imported,
        changes!changes_article_id_fkey(created_at,contributor_id,id)
      )
      `
    )
    .eq("user_id", userId)
    .order("articles(created_at)", { ascending: false })
    .limit(1, { foreignTable: "articles.changes" });

  if (articleError) {
    return c.json({ message: articleError.message }, 500);
  }

  if (!articleData || articleData.length === 0) {
    return c.json({ articles: [] });
  }

  const contributorIds = [
    ...new Set(
      articleData
        .flatMap((a) => a.articles?.changes?.map((c: any) => c.contributor_id) ?? [])
        .filter(Boolean),
    ),
  ];

  let profilesMap = new Map();
  if (contributorIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles_view")
      .select("id, email, display_name")
      .in("id", contributorIds);

    if (profiles) {
      profilesMap = new Map(profiles.map((p) => [p.id, p]));
    }
  }

  const articles = articleData
    .filter((article) => article.role !== null)
    .map((article) => {
      const latestChange: any = article.articles?.changes?.[0];
      const author = latestChange?.contributor_id
        ? profilesMap.get(latestChange.contributor_id)
        : null;

      return {
        article_id: article.article_id,
        title: article.articles?.title,
        description: article.articles?.description,
        permission_id: article.id,
        role: article.role,
        language: article.articles?.language,
        created_at: article.articles?.created_at,
        web_publication: article.articles?.web_publication,
        imported: article.articles?.imported,
        latest_change: {
          created_at: latestChange?.created_at ?? null,
          name: author?.display_name || author?.email || "Unknown",
        },
      };
    })
    .sort((a: any, b: any) => {
      const aDate = a.latest_change?.created_at
        ? new Date(a.latest_change.created_at).getTime()
        : 0;
      const bDate = b.latest_change?.created_at
        ? new Date(b.latest_change.created_at).getTime()
        : 0;
      return bDate - aDate;
    });

  return c.json({ articles });
}
