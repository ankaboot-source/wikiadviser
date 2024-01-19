-- add trigger to table
CREATE OR REPLACE FUNCTION create_share_links(p_article_id uuid, expired_at timestamp with time zone) RETURNS uuid
LANGUAGE plpgsql
SECURITY definer SET search_path = public AS $$
DECLARE
  token uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM permissions
    WHERE user_id = auth.uid()
    AND article_id = p_article_id
    AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Cannot create a share link.';
  END IF;

  INSERT INTO share_links (article_id, expired_at)
  VALUES (p_article_id, expired_at)
  RETURNING id INTO token;

  RETURN token;
END;
$$;
