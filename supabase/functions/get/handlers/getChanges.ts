import createSupabaseAdmin from "../_shared/supabaseAdmin.ts";

export async function getChanges(c: any) {
  const supabaseAdmin = createSupabaseAdmin();
  const { id, single = false } = await c.req.json();

  if (!id) {
    return c.json({ message: "id is required" }, 400);
  }

  const { data: changesData, error } = await supabaseAdmin
    .from("changes")
    .select(
      "id, content, created_at, description, status, type_of_edit, index, article_id, contributor_id, revision_id, archived, hidden, comments:comments(content, created_at, commenter_id, id), revision: revisions(summary, revid)"
    )
    .order("index")
    .eq(single ? "id" : "article_id", id);

  if (error) {
    return c.json({ message: error.message }, 500);
  }

  if (!changesData || changesData.length === 0) {
    return c.json({ changes: [] });
  }

  const contributorIds = [
    ...new Set(
      changesData
        .map((c) => c.contributor_id)
        .filter(Boolean),
    ),
  ];

  const commenterIds = [
    ...new Set(
      changesData.flatMap((c) =>
        c.comments?.map((cm: any) => cm.commenter_id) ?? []
      ).filter(Boolean),
    ),
  ];

  const allUserIds = [...new Set([...contributorIds, ...commenterIds])];

  let profilesMap = new Map();
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles_view")
      .select("id, email, avatar_url, display_name")
      .in("id", allUserIds);

    if (profiles) {
      profilesMap = new Map(profiles.map((p) => [p.id, p]));
    }
  }

  const merged = changesData.map((change) => ({
    ...change,
    user: profilesMap.get(change.contributor_id) ?? null,
    comments: change.comments?.map((comment: any) => ({
      ...comment,
      user: profilesMap.get(comment.commenter_id) ?? null,
    })),
  }));

  return c.json({ changes: merged });
}
