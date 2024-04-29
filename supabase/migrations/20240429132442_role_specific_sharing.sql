-- Add new column specifying the role for the shared link
ALTER TABLE share_links
    ADD COLUMN role Role NOT NULL DEFAULT 'viewer',
    ADD CONSTRAINT check_role_not_owner CHECK (role <> 'owner');

-- Drop redundant function
DROP FUNCTION IF EXISTS add_viewer_to_article(uuid);
