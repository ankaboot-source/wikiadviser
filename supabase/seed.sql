INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, created_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'deleted-user@wikiadviser.io',
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'deleted-user@wikiadviser.io'
);

