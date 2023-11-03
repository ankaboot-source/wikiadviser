-- Security Using security definer function to bypass RLS

CREATE FUNCTION get_permissions_for_article(article_id uuid)
RETURNS SETOF uuid
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
SELECT user_id
FROM permissions p
WHERE p.article_id = article_id;
$$;

-- RLS for TABLE articles --

-- Policy to allow authenticated users to read articles
CREATE POLICY read_articles_policy
  ON articles
  FOR SELECT
  TO authenticated
  USING (
      -- Check if the authenticated user has permissions to read the article
      auth.uid() IN (
          SELECT user_id
          FROM permissions p
          WHERE p.article_id = articles.id
      )
  );

-- RLS for table permissions AND change role to enum--

CREATE TYPE Role AS ENUM ('owner', 'editor', 'reviewer', 'viewer');

ALTER TABLE permissions
  DROP COLUMN role CASCADE;
ALTER TABLE permissions
  ADD COLUMN role Role;

-- Policy to allow authenticated users to read permissions
CREATE POLICY read_permissions_policy 
  ON permissions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() in (
        SELECT * FROM get_permissions_for_article(article_id) 
    )
  );

-- Create a policy to allow inserting permissions
CREATE POLICY insert_permissions_policy
  ON permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
      permissions.user_id = auth.uid() AND permissions.role = 'viewer'
  );

CREATE POLICY update_permissions_policy
  ON permissions
  FOR UPDATE
  TO authenticated
  USING (
      -- Check if the user is the owner of the article
      auth.uid() = (
          SELECT p.user_id
          FROM permissions p
          WHERE p.user_id = auth.uid()
          AND p.article_id = permissions.article_id
          AND p.role = 'owner'
      )
  );

CREATE POLICY delete_permissions_policy
  ON permissions
  FOR DELETE
  TO authenticated
  USING (
      -- Check if the user is the owner of the article
      auth.uid() = (
          SELECT p.user_id
          FROM permissions p
          WHERE p.user_id = auth.uid()
          AND p.article_id = permissions.article_id
          AND p.role = 'owner'
      )
  );

-- RLS for TABLE changes --

-- Policy to allow selects to changes by owners, editors, and reviewers.
CREATE POLICY select_changes_policy
  ON changes
  FOR SELECT
  TO authenticated
  USING (
      -- Check if the authenticated user has appropriate permissions
      auth.uid() IN (
          SELECT user_id
          FROM permissions
          WHERE 
              permissions.user_id = auth.uid()
              AND permissions.article_id = changes.article_id
              AND permissions.role IN ('owner', 'editor', 'reviewer')
      )
  );

-- Policy to allow updates to changes by owners, editors, and reviewers.
CREATE POLICY update_changes_policy
  ON changes
  FOR UPDATE
  TO authenticated
  USING (
      -- Check if the authenticated user has appropriate permissions
      auth.uid() IN (
          SELECT user_id
          FROM permissions
          WHERE 
              permissions.user_id = auth.uid()
              AND permissions.article_id = changes.article_id
              AND permissions.role IN ('owner', 'editor', 'reviewer')
      )
  );

-- RLS for table comments --

-- Create a policy to restrict comment insertion based on article permissions
CREATE POLICY insert_comments_policy
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = comments.commenter_id
    AND
    -- Check if the authenticated user has appropriate permissions for the article
    auth.uid() IN (
          SELECT user_id
          FROM changes c
          INNER JOIN permissions p ON 
              p.article_id = c.article_id
              AND p.role IN ('owner', 'reviewer', 'editor')
          WHERE c.id = change_id
    )
  );

-- Enable row-level security 
ALTER TABLE public.changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
