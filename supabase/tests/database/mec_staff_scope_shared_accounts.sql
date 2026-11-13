-- Supplemental synthetic identities for the full shared-profile rehearsal only.
-- The prior fixture emulates the Supabase Auth catalog without this ban column.
ALTER TABLE auth.users ADD COLUMN banned_until timestamptz;
INSERT INTO auth.users (id, email, email_confirmed_at, is_anonymous)
SELECT ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  'scope-fixture' || i || '@example.invalid', now(), false
FROM generate_series(1, 6) AS i;
INSERT INTO public.users (id, name, email, role, is_active)
SELECT id, 'Staff scope fixture', email,
  CASE WHEN right(id::text, 1) = '1' THEN 'super_admin' ELSE 'student' END,
  right(id::text, 1) <> '4'
FROM auth.users WHERE id::text LIKE '00000000-0000-0000-0000-%'
ON CONFLICT (id) DO UPDATE SET role = excluded.role, is_active = excluded.is_active;
