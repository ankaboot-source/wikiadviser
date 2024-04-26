-- Alter select_changes_policy to allow selects to changes by owners, editors, reviewers and viewers.
ALTER POLICY select_changes_policy
  ON changes
  TO authenticated
  USING (
      -- Check if the authenticated user has appropriate permissions
      auth.uid() IN (
        SELECT user_id
        FROM private.get_all_permissions_by_article_id(article_id) p
        WHERE p.role IN ('owner', 'editor', 'reviewer','viewer')
      )
  );