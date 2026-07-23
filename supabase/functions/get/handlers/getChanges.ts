import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

/**
 * Contract returned to the frontend. Mirrored in
 * `frontend/src/api/supabaseHelper.ts::getParsedChanges` — keep them in sync.
 */
export interface GetChangesResponse {
  changes: unknown[];
  revisionComments: RevisionCommentRow[];
}

export interface RevisionCommentRow {
  id: string;
  revision_id: string;
  content: string | null;
  created_at: string | null;
  user: unknown;
}

export async function getChanges(c: Context) {
  const supabaseAdmin = createSupabaseAdmin();
  const { id, single = false } = await c.req.json();

  if (!id) {
    return c.json({ message: "id is required" }, 400);
  }

  // NOTE: The `comments!comments_change_id_fkey` embed below pins the
  // change-level comment join to the original FK constraint from
  // 20230515153031_init.sql. If that constraint is ever renamed or dropped,
  // this embed will silently break or 400.
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

  const revisionComments: RevisionCommentRow[] = [];

  if (revisionIds.length > 0) {
    const { data: revComments } = await supabaseAdmin
      .from('comments')
      .select(
        'id, revision_id, content, created_at, user: profiles_view(id, email, avatar_url, display_name)',
      )
      .in('revision_id', revisionIds)
      .is('change_id', null)
      .order('created_at', { ascending: true });

    for (const row of revComments ?? []) {
      revisionComments.push(row as RevisionCommentRow);
    }
  }

  const response: GetChangesResponse = { changes: data ?? [], revisionComments };
  return c.json(response);
}
