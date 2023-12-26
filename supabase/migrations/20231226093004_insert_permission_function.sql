CREATE OR REPLACE FUNCTION insert_permission(user_id uuid, token uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  share_record share_links%ROWTYPE; ;
BEGIN
  SELECT *
  INTO share_record
  FROM share_links
  WHERE id = insert_permission.token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO permissions(user_id, article_id, role)
  VALUES (
    user_id,
    share_record.article_id,
    'viewer'
  );

  RETURN true;
END;
$$;