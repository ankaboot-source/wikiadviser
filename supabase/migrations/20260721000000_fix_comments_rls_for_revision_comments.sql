-- Recreate comments RLS policies to support revision-level comments
-- (where change_id is NULL and revision_id is set). The previous versions
-- always joined through changes, which silently denied revision-level
-- inserts/selects because `c.id = NULL` is never TRUE.

DROP POLICY IF EXISTS insert_comments_policy ON public.comments;
CREATE POLICY insert_comments_policy
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = comments.commenter_id
    AND (
      -- Path 1: change-level comment. User must have owner/reviewer/editor
      -- on the change's article.
      auth.uid() IN (
        SELECT p.user_id
        FROM changes c
        INNER JOIN permissions p ON
            p.article_id = c.article_id
            AND p.role IN ('owner', 'reviewer', 'editor')
        WHERE c.id = comments.change_id
      )
      OR
      -- Path 2: revision-level comment. User must have owner/reviewer/editor
      -- on the revision's article.
      auth.uid() IN (
        SELECT p.user_id
        FROM revisions r
        INNER JOIN permissions p ON
            p.article_id = r.article_id
            AND p.role IN ('owner', 'reviewer', 'editor')
        WHERE r.id = comments.revision_id
      )
    )
  );

DROP POLICY IF EXISTS select_comments_policy ON public.comments;
CREATE POLICY select_comments_policy
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    -- Path 1: change-level comment (owner/reviewer/editor/viewer).
    auth.uid() IN (
      SELECT p.user_id
      FROM changes c
      INNER JOIN permissions p ON
          p.article_id = c.article_id
          AND p.role IN ('owner', 'reviewer', 'editor', 'viewer')
      WHERE c.id = comments.change_id
    )
    OR
    -- Path 2: revision-level comment (owner/reviewer/editor/viewer).
    auth.uid() IN (
      SELECT p.user_id
      FROM revisions r
      INNER JOIN permissions p ON
          p.article_id = r.article_id
          AND p.role IN ('owner', 'reviewer', 'editor', 'viewer')
      WHERE r.id = comments.revision_id
    )
  );
