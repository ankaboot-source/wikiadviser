DROP VIEW public.profiles_view;

CREATE VIEW public.profiles_view AS
 SELECT p.id,
    u.email,
	u.email_change,
	u.raw_user_meta_data ->> 'display_name' AS display_name,
    (u.raw_app_meta_data->>'provider' = 'email') AS has_email_provider,
	(u.encrypted_password IS NOT NULL AND u.encrypted_password <> '') AS has_password,
    p.avatar_url,
    p.default_avatar,
    p.allowed_articles
   FROM profiles p
     JOIN auth.users u ON u.id = p.id;