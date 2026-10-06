-- First-admin setup (run in Supabase SQL editor AFTER promoting anyone).
-- 1) Create the Auth user in Dashboard → Authentication → Users (email + password),
--    or have them sign up once via the admin login page (will fail until role exists).
-- 2) Replace the placeholders below, then run this as a privileged SQL user.
-- Users cannot insert into admin_roles via the API (no INSERT policy for clients).

-- Example:
-- insert into public.admin_roles (user_id, email, name)
-- select id, email, 'INVIHUB Admin'
-- from auth.users
-- where lower(email) = lower('you@your-domain.com')
-- on conflict (user_id) do update
--   set email = excluded.email, name = excluded.name;

-- Verify:
-- select * from public.admin_roles;
