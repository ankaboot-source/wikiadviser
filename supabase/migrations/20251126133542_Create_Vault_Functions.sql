CREATE OR REPLACE FUNCTION upsert_user_api_key(
  user_id_param UUID,
  api_key_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_name TEXT;
  existing_secret_id UUID;
  new_secret_id UUID;
BEGIN
  IF auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;
  
  secret_name := 'llm_api_key_' || user_id_param::TEXT;

  SELECT id INTO existing_secret_id
  FROM vault.decrypted_secrets
  WHERE name = secret_name;

  IF existing_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_secret_id, api_key_value, secret_name);
  ELSE
    new_secret_id := vault.create_secret(api_key_value, secret_name);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_api_key(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_name TEXT;
  api_key TEXT;
BEGIN
  IF auth.uid() != user_id_param AND current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  secret_name := 'llm_api_key_' || user_id_param::TEXT;

  SELECT decrypted_secret INTO api_key
  FROM vault.decrypted_secrets
  WHERE name = secret_name;

  RETURN api_key;
END;
$$;

CREATE OR REPLACE FUNCTION delete_user_api_key(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_name TEXT;
  secret_id UUID;
BEGIN
  IF auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  secret_name := 'llm_api_key_' || user_id_param::TEXT;

  SELECT id INTO secret_id
  FROM vault.decrypted_secrets
  WHERE name = secret_name;

  IF secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = secret_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION has_user_api_key(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_name TEXT;
  key_exists BOOLEAN;
BEGIN
  IF auth.uid() != user_id_param THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  secret_name := 'llm_api_key_' || user_id_param::TEXT;

  SELECT EXISTS(
    SELECT 1 FROM vault.decrypted_secrets WHERE name = secret_name
  ) INTO key_exists;

  RETURN key_exists;
END;
$$;