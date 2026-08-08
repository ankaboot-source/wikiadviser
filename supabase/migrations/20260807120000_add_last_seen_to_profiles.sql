-- Add last_seen to profiles for the "who's connected" / Share last-seen feature.
-- last_seen is updated by the user/heartbeat edge function (admin client) while
-- a user is active; it is NOT writable directly by the browser (RLS grant is
-- column-restricted to avatar_url, default_avatar, llm_reviewer_config).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- Recreate profiles_view to expose last_seen (view is admin-only, not PUBLIC).
DROP VIEW IF EXISTS public.profiles_view;

CREATE VIEW public.profiles_view AS
SELECT p.id,
    u.email,
    u.email_change,
    u.raw_user_meta_data ->> 'display_name' AS display_name,
    (u.raw_app_meta_data->>'provider' = 'email') AS has_email_provider,
    (u.encrypted_password IS NOT NULL AND u.encrypted_password <> '') AS has_password,
    p.avatar_url,
    p.default_avatar,
    p.allowed_articles,
    p.llm_reviewer_config,
    p.last_seen
FROM profiles p
JOIN auth.users u ON u.id = p.id;

-- Revoke all permissions on the view from PUBLIC to secure it
REVOKE ALL ON public.profiles_view FROM PUBLIC;
