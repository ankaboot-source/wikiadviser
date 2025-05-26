DO $$
BEGIN
  -- Update 'contact@wikiadviser.io' to 'deleted-user@wikiadviser.io' if it exists--
  UPDATE auth.users
  SET
    email = 'deleted-user@wikiadviser.io',
    encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')),
    updated_at = now()
  WHERE email = 'contact@wikiadviser.io';
  
  -- Else, insert 'deleted-user@wikiadviser.io' --
  IF NOT FOUND THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, created_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'deleted-user@wikiadviser.io',
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now()
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION delete_user_and_anonymize_data() RETURNS void SECURITY definer
SET search_path = public AS $$
DECLARE anonymous_id UUID;
BEGIN
  -- Delete permissions
  DELETE FROM articles
  WHERE id IN (
    SELECT article_id
    FROM permissions
    WHERE role = 'owner'
    AND user_id = auth.uid()
  );

  -- Fetch the anonymous user ID
  SELECT id INTO anonymous_id
  FROM profiles
  WHERE email = 'deleted-user@wikiadviser.io'
  LIMIT 1;

  -- Update changes table
  UPDATE changes
  SET contributor_id = anonymous_id
  WHERE contributor_id = auth.uid();

  -- Update comments table
  UPDATE comments
  SET commenter_id = anonymous_id
  WHERE commenter_id = auth.uid();

  DELETE FROM permissions
  WHERE user_id = auth.uid();

  DELETE FROM profiles
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql;
