-- Drop the view
DROP VIEW IF EXISTS public.profiles_view;

-- add llm_reviewer_config to the view
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
    p.llm_reviewer_config
FROM profiles p
JOIN auth.users u ON u.id = p.id;

-- Revoke all permissions on the view from PUBLIC to secure it
REVOKE ALL ON public.profiles_view FROM PUBLIC;