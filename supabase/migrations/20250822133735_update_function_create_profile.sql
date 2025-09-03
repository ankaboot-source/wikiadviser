-- Drop the email column from profiles if you don’t want duplication
ALTER TABLE public.profiles DROP COLUMN email;

-- Raises allowed_articles to 10
CREATE OR REPLACE FUNCTION public.create_profile()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, avatar_url, default_avatar, allowed_articles)
    VALUES (NEW.id, NEW.raw_user_meta_data, FALSE, 10);
    RETURN NEW;
END;
$$;

-- Create a view that joins auth.users and profiles
CREATE VIEW public.profiles_view AS
SELECT 
  p.id,
  u.email,
  u.is_anonymous,
  u.raw_user_meta_data ->> 'display_name' AS display_name,
  u.raw_user_meta_data ->> 'email_verified' AS email_verified,
  (u.confirmed_at IS NOT NULL) AS is_confirmed,
  u.email_change,
  (u.encrypted_password IS NOT NULL AND u.encrypted_password <> '') AS has_password,
  p.avatar_url,
  p.default_avatar,
  p.allowed_articles
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;

