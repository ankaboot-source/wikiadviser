CREATE OR REPLACE FUNCTION insert_permission(user_id uuid, token uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  share_link_id uuid;
BEGIN
  SELECT id INTO share_link_id
  FROM share_links
  WHERE id = insert_permission.token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO permissions(user_id, article_id, role)
  VALUES (
    user_id,
    (
      SELECT article_id
      FROM share_links
      WHERE id = share_link_id
      LIMIT 1
    ),
    'viewer'
  );

  RETURN true;
END;
$$;