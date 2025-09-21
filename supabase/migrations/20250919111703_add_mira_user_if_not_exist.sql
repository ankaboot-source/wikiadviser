DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'mira@wikiadviser.io'
  ) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, created_at
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'mira@wikiadviser.io',
      crypt(gen_random_uuid()::text, gen_salt('bf')),
      now()
    );
  END IF;
END $$;