-- Create a trigger function
CREATE OR REPLACE FUNCTION set_username_on_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract the username from the email
  NEW.raw_user_meta_data = jsonb_set(NEW.raw_user_meta_data, '{username}', to_jsonb(split_part(NEW.email, '@', 1)), true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_user_creation
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION set_username_on_user_creation();
