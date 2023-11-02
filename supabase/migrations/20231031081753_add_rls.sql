-- RLS for TABLE articles --

-- Policy to allow authenticated users to read articles
CREATE POLICY read_articles_policy
ON articles
FOR SELECT
TO authenticated
USING (
    -- Check if the authenticated user has permissions to read the article
    auth.uid() = (
        SELECT user_id
        FROM permissions p
        WHERE p.article_id = articles.id
        AND p.user_id = auth.uid()
    )
);

-- RLS for TABLE changes --

-- Policy to allow updates to changes by owners, editors, and reviewers.
CREATE POLICY update_changes_policy
ON changes
FOR UPDATE
TO authenticated
USING (
    -- Check if the authenticated user has appropriate permissions
    auth.uid() = (
        SELECT user_id
        FROM permissions
        WHERE 
            permissions.user_id = auth.uid()
            AND permissions.article_id = changes.article_id
            AND changes.contributor_id = auth.uid()
            AND permissions.role IN (0, 1, 2)
    )
);

-- RLS for table permissions AND change role to enum--

CREATE TYPE Role AS ENUM ('owner', 'editor', 'reviewer', 'viewer');

ALTER TABLE permissions
  DROP COLUMN role;
ALTER TABLE permissions
  ADD COLUMN role Role;

-- Policy to allow authenticated users to read permissions
CREATE POLICY read_permissions_policy 
ON permissions
FOR SELECT
TO authenticated
USING ( true );

-- Create a policy to allow inserting permissions
CREATE POLICY insert_permissions_policy
ON permissions
FOR INSERT
TO authenticated
WITH CHECK (
    permissions.user_id = auth.uid()
    AND (
        -- Check if no other permissions exist for the same article
        NOT EXISTS (
            SELECT 1
            FROM permissions p
            WHERE p.article_id = permissions.article_id
        )
        OR
        permissions.role = 3
        OR
        -- Check if the user is the owner of the article
        auth.uid() = (
            SELECT p.user_id
            FROM permissions p
            WHERE permissions.user_id = p.user_id
            AND permissions.article_id = p.article_id
            AND p.role = 0
        )
    )
);

CREATE POLICY update_permissions_policy
ON permissions
FOR UPDATE
TO authenticated
USING (
    permissions.user_id = auth.uid()
    AND
    -- Check if the user is the owner of the article
    auth.uid() = (
        SELECT p.user_id
        FROM permissions p
        WHERE permissions.user_id = p.user_id
        AND permissions.article_id = p.article_id
        AND p.role = 0
    )
);

CREATE POLICY delete_permissions_policy
ON permissions
FOR DELETE
TO authenticated
USING (
    permissions.user_id = auth.uid()
    AND
    -- Check if the user is the owner of the article
    auth.uid() = (
        SELECT p.user_id
        FROM permissions p
        WHERE permissions.user_id = p.user_id
        AND permissions.article_id = p.article_id
        AND p.role = 0
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
    auth.uid() = (
        SELECT p.user_id
        FROM changes c
        INNER JOIN permissions p ON p.article_id = c.article_id
        WHERE
            c.id = comments.change_id
            AND p.role IN (0, 1, 2)
    )
);

-- Enable row-level security 
ALTER TABLE public.changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;