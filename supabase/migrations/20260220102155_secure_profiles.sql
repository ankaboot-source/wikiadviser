drop policy "Public profiles are viewable by everyone."
on "public"."profiles";

alter policy "Enable users to view their own data only"
on "public"."profiles"
to authenticated
using (
	(( SELECT auth.uid() AS uid) = id)
);