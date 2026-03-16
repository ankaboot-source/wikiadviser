import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

export async function getChanges(c: any) {
  const supabaseAdmin = createSupabaseAdmin();
  const { id, single = false } = await c.req.json();

  if (!id) {
    return c.json({ message: "id is required" }, 400);
  }

  const { data, error } = await supabaseAdmin
    .from('changes')
    .select(
      `
        id,
        content,
        created_at,
        description,
        status,
        type_of_edit,
        index,
        article_id,
        contributor_id,
        revision_id,
        archived,
        hidden,
        user: profiles_view(id, email, avatar_url, display_name), 
        comments: comments(content,created_at, user: profiles_view(id, email, avatar_url, display_name)),
        revision: revisions(summary, revid)
        `,
    )
    .order('index')
    .eq(single ? 'id' : 'article_id', id);

  if (!data || error) {
    throw new Error(error?.message ?? 'Could not get parsed changes');
  }
  return c.json(data);
}
