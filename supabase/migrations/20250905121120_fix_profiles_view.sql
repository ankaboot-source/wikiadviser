drop view public.profiles_view;

create view public.profiles_view with (security_invoker = on) as
 SELECT p.id,
    u.email,
    u.raw_user_meta_data ->> 'display_name'::text AS display_name,
    (u.raw_app_meta_data->>'provider' = 'email') AS is_email_provider,
    u.email_change,
	(u.encrypted_password IS NOT NULL AND u.encrypted_password <> '') AS has_password,
    p.avatar_url,
    p.default_avatar,
    p.allowed_articles
   FROM profiles p
     JOIN auth.users u ON u.id = p.id;