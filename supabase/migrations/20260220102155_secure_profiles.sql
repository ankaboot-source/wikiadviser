drop policy "Public profiles are viewable by everyone."
on "public"."profiles";

-- RLS: View
create policy "Enable users to view their own data only"
on "public"."profiles"
for SELECT
to authenticated
using ( auth.uid() = id );

-- RLS: Update
DROP POLICY "Users can update own profile."
ON "public"."profiles";

CREATE POLICY "Users can update own profile."
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
    );


-- CLS: Update
revoke update on profiles from authenticated;
grant update (avatar_url, llm_reviewer_config) on public.profiles to authenticated;