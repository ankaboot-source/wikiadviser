drop policy "Public profiles are viewable by everyone."
on "public"."profiles";

create policy "Enable users to view their own data only"
on "public"."profiles"
to authenticated
using ( auth.uid() = id );