ALTER TABLE articles
  ADD COLUMN web_publication boolean not null default false;

-- RLS for TABLE articles --
-- Policy to owners users to update articles
CREATE POLICY update_articles_policy
  ON articles
  FOR UPDATE
  TO authenticated
  USING (
      -- Check if the user is the owner of the article
      auth.uid() = (
        SELECT user_id
        FROM private.get_all_permissions_by_article_id(id) p
        WHERE p.role = 'owner' 
      )
  );