-- Policy to allow deletes to unindexed changes by owners
CREATE POLICY delete_unindexed_changes_policy
  ON changes
  FOR DELETE
  TO authenticated
  USING (
      index is NULL
      AND
      auth.uid() IN (
            SELECT user_id
        FROM private.get_all_permissions_by_article_id(article_id) p
        WHERE p.role IN ('owner')
    )
);