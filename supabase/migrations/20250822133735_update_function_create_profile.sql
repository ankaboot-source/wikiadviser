-- Raises allowed_articles to 10
CREATE OR REPLACE FUNCTION public.create_profile()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, avatar_url, default_avatar, allowed_articles)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'picture', FALSE, 10);
    RETURN NEW;
END;
$$;

-- Create a view that joins auth.users and profiles
CREATE VIEW public.profiles_view AS
SELECT 
  p.id,
  u.email, -- Also indicates Anon
  u.raw_user_meta_data ->> 'display_name' AS display_name,
  u.email_change,
  (u.encrypted_password IS NOT NULL AND u.encrypted_password <> '') AS has_password,
  p.avatar_url,
  p.default_avatar,
  p.allowed_articles
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;

