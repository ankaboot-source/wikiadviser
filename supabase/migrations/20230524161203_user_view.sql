create view public.users as select * from auth.users;
revoke all on public.users from anon;