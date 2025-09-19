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
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, created_at
)
SELECT
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'mira@wikiadviser.io',
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'mira@wikiadviser.io'
);

select vault.create_secret(
  'http://host.docker.internal:54321',
  'supabase_project_url',
  'URL to be used for calling edge functions. This is set here to support development with database-triggered webhooks across environments.'
);