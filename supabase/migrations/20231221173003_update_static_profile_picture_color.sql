REPLACE FUNCTION handle_user_profile_picture()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'picture' IS NULL THEN
    NEW.raw_user_meta_data = jsonb_set(
        NEW.raw_user_meta_data::jsonb,
        '{picture}',
        to_jsonb('https://www.gravatar.com/avatar/' || md5(NEW.email) || '?d=https://ui-avatars.com/api/' || NEW.email || '/128/f6f8fa/000/1'),
        true
    );
    END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;