-- Reset avatar_url only for users whose avatar is from avatar.iran.liara.run
-- On next login, App.vue detects avatar_url = NULL and regenerates via POST /user/avatar.
UPDATE public.profiles
SET
  avatar_url     = NULL,
  default_avatar = FALSE
WHERE
  avatar_url LIKE '%avatar.iran.liara.run%';