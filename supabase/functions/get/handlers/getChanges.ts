import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

export async function getChanges(c: Context) {
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
        comments: comments!comments_change_id_fkey(content,created_at,id,revision_id, user: profiles_view(id, email, avatar_url, display_name)),
        revision: revisions(id, summary, revid)
        `,
    )
    .order('index')
    .eq(single ? 'id' : 'article_id', id);

  if (!data || error) {
    throw new Error(error?.message ?? 'Could not get parsed changes');
  }

  // Also fetch revision-level comments (where change_id IS NULL).
  // Keyed by revision id (uuid) so the frontend can attach them to
  // the matching revision group.
  const revisionIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => {
          const rev = row.revision as
            | { id?: string }
            | Array<{ id?: string }>
            | null
            | undefined;
          if (Array.isArray(rev)) return rev[0]?.id;
          return rev?.id;
        })
        .filter((rid): rid is string => typeof rid === 'string'),
    ),
  );

  let revisionComments: Array<{
    id: string;
    revision_id: string;
    content: string | null;
    created_at: string | null;
    user: unknown;
  }> = [];

  if (revisionIds.length > 0) {
    const { data: revComments } = await supabaseAdmin
      .from('comments')
      .select(
        'id, revision_id, content, created_at, user: profiles_view(id, email, avatar_url, display_name)',
      )
      .in('revision_id', revisionIds)
      .is('change_id', null)
      .order('created_at', { ascending: true });

    revisionComments = (revComments ?? []) as typeof revisionComments;
  }

  return c.json({ changes: data, revisionComments });
}
