-- Disposable local cluster only. Minimal dependencies for the roster candidate.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE SCHEMA idealab_private;
GRANT USAGE ON SCHEMA idealab_private TO authenticated;
CREATE TABLE auth.users (id uuid PRIMARY KEY, banned_until timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE FUNCTION idealab_private.current_student_mec_admitted_v1()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid;
$$;
CREATE TABLE public.users (id uuid PRIMARY KEY, name text, is_active boolean);
CREATE TABLE public.lab_sessions (user_id uuid REFERENCES public.users, checkout_time timestamptz);
INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
INSERT INTO public.users VALUES
  ('00000000-0000-0000-0000-000000000001', 'Present member', true),
  ('00000000-0000-0000-0000-000000000002', 'Departed member', true),
  ('00000000-0000-0000-0000-000000000003', 'Inactive member', false);
INSERT INTO public.lab_sessions VALUES
  ('00000000-0000-0000-0000-000000000001', NULL),
  ('00000000-0000-0000-0000-000000000002', now()),
  ('00000000-0000-0000-0000-000000000003', NULL);

CREATE FUNCTION idealab_private.seed_presence_crowd() RETURNS void
LANGUAGE sql AS $$
  WITH added AS (
    INSERT INTO public.users (id, name, is_active)
    SELECT gen_random_uuid(), 'Visitor ' || lpad(i::text, 2, '0'), true
    FROM generate_series(1, 32) AS i
    RETURNING id
  )
  INSERT INTO public.lab_sessions (user_id, checkout_time)
  SELECT id, NULL FROM added;
$$;
