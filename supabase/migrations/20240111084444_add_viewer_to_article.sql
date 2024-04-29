-- add viewer function
CREATE OR REPLACE FUNCTION add_viewer_to_article(token uuid) RETURNS uuid
LANGUAGE plpgsql
security definer set search_path = public AS $$
DECLARE
  share_record share_links %ROWTYPE;
  permission_record permissions %ROWTYPE;
BEGIN
  SELECT * INTO share_record
  FROM share_links
  WHERE id = token
  AND expired_at >= NOW()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share link not found or expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM permissions
    WHERE user_id = auth.uid()
    AND article_id = share_record.article_id
  ) THEN
    INSERT INTO permissions(user_id, article_id, role)
    VALUES (
      auth.uid(),
      share_record.article_id,
      share_record.role
    );
  END IF;

  RETURN share_record.article_id;
END;
$$;
