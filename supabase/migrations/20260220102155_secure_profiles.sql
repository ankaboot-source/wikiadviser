drop policy "Public profiles are viewable by everyone."
on "public"."profiles";

-- View
create policy "Enable users to view their own data only"
on "public"."profiles"
for SELECT
to authenticated
using ( auth.uid() = id );

-- Update: RLS
DROP POLICY "Users can update own profile."
ON "public"."profiles";

CREATE POLICY "Users can update own profile."
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
    );


-- Update: CLS
revoke update on profiles from authenticated;
grant update (avatar_url, llm_reviewer_config) on public.profiles to authenticated;