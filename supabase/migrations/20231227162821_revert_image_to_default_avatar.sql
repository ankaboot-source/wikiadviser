CREATE OR REPLACE FUNCTION revert_image(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  user_record users%ROWTYPE;
BEGIN
  SELECT *
  INTO user_record
  FROM users
  WHERE id = user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF user_record.raw_user_meta_data->>'picture' IS NOT NULL THEN
    user_record.raw_user_meta_data := jsonb_set(
        user_record.raw_user_meta_data::jsonb,
        '{picture}',
        to_jsonb('https://www.gravatar.com/avatar/' || md5(user_record.email) || '?d=https://ui-avatars.com/api/' || user_record.email || '/128/random/fff/1'),
        true
    );
  END IF;

  RETURN true;
END;
$$;
