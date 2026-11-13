-- Minimal schema for disposable PostgreSQL only.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE SCHEMA idealab_private;
GRANT USAGE ON SCHEMA idealab_private TO authenticated;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY, banned_until timestamptz,
  email text NOT NULL, email_confirmed_at timestamptz, is_anonymous boolean NOT NULL DEFAULT false
);
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL,
  is_active boolean NOT NULL
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE FUNCTION idealab_private.has_current_verified_email_v1()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()
    AND email_confirmed_at IS NOT NULL AND is_anonymous IS FALSE AND nullif(btrim(email), '') IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION idealab_private.has_current_verified_email_v1() FROM PUBLIC, anon, authenticated, service_role;
INSERT INTO auth.users
SELECT ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  NULL, 'fixture' || i || '@example.invalid', now(), false
FROM generate_series(1, 6) AS i;
INSERT INTO public.users
SELECT id, CASE WHEN right(id::text, 1) = '1' THEN 'super_admin' ELSE 'student' END,
  right(id::text, 1) <> '4' FROM auth.users;
