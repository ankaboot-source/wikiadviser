-- Insert deleted user into auth.users
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'deleted-user@wikiadviser.io',
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now());

UPDATE public.profiles
SET avatar_url = '/favicon.ico'
WHERE email IS 'deleted-user@wikiadviser.io';