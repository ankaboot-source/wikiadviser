-- DROP INSERT POLICY ON TABLE PERMISSIONS
DROP POLICY IF EXISTS insert_permissions_policy ON permissions;

-- DROP FUNCTION "add_user_to_article"
DROP FUNCTION IF EXISTS public.add_user_to_article;

-- DROP FUNCTION "create_share_links"
DROP FUNCTION IF EXISTS public.create_share_links;

-- CREATE TABLE PROFILE
CREATE TABLE public.profiles (
    id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    email TEXT NOT NULL,
    avatar_url TEXT,
    default_avatar BOOLEAN,
    allowed_articles INTEGER NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT email_unique UNIQUE (email)
);

-- TRIGGER HANDLER
CREATE FUNCTION public.create_profile()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, avatar_url, default_avatar, allowed_articles)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'picture', FALSE, 5);
    RETURN NEW;
END;
$$;

--TRIGGER ON NEW USERS
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.create_profile();

-- ENABLE ROW LEVEL SECURITY ON TABLE PROFILES.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- TABLE PROFILE POLOCIES
CREATE POLICY "Public profiles are viewable by everyone."
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Users can update own profile."
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
        AND
        (
            EXISTS (
                SELECT 1
                FROM profiles p
                WHERE p.id =  public.profiles.id and p.allowed_articles =  public.profiles.allowed_articles
            )
        )
    );


-- UPDATE FOREIGN KEY REFERENCES TO POINT TO profiles.id INSTEAD OF users.id
ALTER TABLE public.changes
    DROP CONSTRAINT changes_contributor_id_fkey;

ALTER TABLE public.changes
    ADD CONSTRAINT changes_contributor_id_fkey
    FOREIGN KEY (contributor_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
    NOT VALID;

ALTER TABLE public.comments
    DROP CONSTRAINT comments_commenter_id_fkey;

ALTER TABLE public.comments
    ADD CONSTRAINT comments_commenter_id_fkey
    FOREIGN KEY (commenter_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
    NOT VALID;

ALTER TABLE public.permissions
    DROP CONSTRAINT permissions_user_id_fkey;

ALTER TABLE public.permissions
    ADD CONSTRAINT permissions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
    NOT VALID;

ALTER TABLE public.changes
    VALIDATE CONSTRAINT changes_contributor_id_fkey;

ALTER TABLE public.comments
    VALIDATE CONSTRAINT comments_commenter_id_fkey;

ALTER TABLE public.permissions
    VALIDATE CONSTRAINT permissions_user_id_fkey;
