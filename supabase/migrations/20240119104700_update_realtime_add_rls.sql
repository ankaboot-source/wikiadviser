-- Add realtime for table changes
ALTER publication supabase_realtime ADD TABLE public.changes;

-- Add read policy for revisions
CREATE POLICY select_revisions_policy
  ON changes
  FOR SELECT
  TO authenticated
  USING (
      auth.uid() IN (
        SELECT user_id
        FROM private.get_all_permissions_by_article_id(article_id) p
        WHERE p.role IN ('owner', 'editor', 'reviewer', 'viewer')
      )
  );

-- Add read policy for comments
CREATE POLICY select_comments_policy
  ON comments
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
          SELECT user_id
          FROM changes c
          INNER JOIN permissions p ON 
              p.article_id = c.article_id
              AND p.role IN ('owner', 'reviewer', 'editor', 'viewer')
          WHERE c.id = change_id
    )
  );