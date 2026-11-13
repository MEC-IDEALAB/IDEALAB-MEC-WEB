-- Disposable scratch SQL only. The harness inserts the candidate at the marker.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE recovery_fixture_owner NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA idealab_private;
GRANT USAGE ON SCHEMA auth, idealab_private TO authenticated;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb
$$;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email_confirmed_at timestamptz,
  is_anonymous boolean NOT NULL,
  banned_until timestamptz
);
CREATE TABLE auth.sessions (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users, not_after timestamptz);
CREATE TABLE auth.mfa_amr_claims (session_id uuid NOT NULL REFERENCES auth.sessions, authentication_method text, created_at timestamptz);
INSERT INTO auth.users VALUES
  ('00000000-0000-4000-8000-000000000001', now(), false, NULL),
  ('00000000-0000-4000-8000-000000000002', now(), false, NULL),
  ('00000000-0000-4000-8000-000000000003', NULL, false, NULL);
INSERT INTO auth.sessions VALUES
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', NULL),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', now() - interval '1 minute'),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', NULL),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000003', NULL),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000002', NULL);
INSERT INTO auth.mfa_amr_claims
  SELECT id, CASE WHEN id::text LIKE '%13' THEN 'password' ELSE 'recovery' END, now() - interval '1 minute'
  FROM auth.sessions;

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA auth TO recovery_fixture_owner;
GRANT SELECT, UPDATE ON auth.users, auth.sessions, auth.mfa_amr_claims TO recovery_fixture_owner;
GRANT USAGE, CREATE ON SCHEMA public, idealab_private TO recovery_fixture_owner;
SET LOCAL ROLE recovery_fixture_owner;
-- INSTALL VALIDATION CANDIDATE HERE
RESET ROLE;

DO $privileges$
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.consume_recovery_session_v1(uuid,uuid)', 'EXECUTE');
  ASSERT NOT has_function_privilege('service_role', 'public.consume_recovery_session_v1(uuid,uuid)', 'EXECUTE');
  ASSERT NOT has_table_privilege('authenticated', 'idealab_private.recovery_session_consumptions_v1', 'INSERT');
  ASSERT NOT has_table_privilege('authenticated', 'idealab_private.recovery_session_consumptions_v1', 'SELECT');
  ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
    WHERE oid = 'idealab_private.recovery_session_consumptions_v1'::regclass);
END;
$privileges$;

SET LOCAL ROLE authenticated;
DO $checks$
DECLARE
  member_id constant uuid := '00000000-0000-4000-8000-000000000001';
  other_id constant uuid := '00000000-0000-4000-8000-000000000002';
  unconfirmed_id constant uuid := '00000000-0000-4000-8000-000000000003';
  good_session constant uuid := '00000000-0000-4000-8000-000000000011';
  expired_session constant uuid := '00000000-0000-4000-8000-000000000012';
  password_session constant uuid := '00000000-0000-4000-8000-000000000013';
  unconfirmed_session constant uuid := '00000000-0000-4000-8000-000000000014';
  other_session constant uuid := '00000000-0000-4000-8000-000000000015';
  absent_session constant uuid := '00000000-0000-4000-8000-000000000016';
  epoch_now bigint := floor(extract(epoch FROM now()))::bigint;
  claims jsonb;
  checks jsonb;
BEGIN
  claims := jsonb_build_object('sub', member_id, 'session_id', good_session, 'role', 'authenticated',
    'exp', epoch_now + 3600,
    'amr', jsonb_build_array(jsonb_build_object('method', 'recovery', 'timestamp', epoch_now - 60)));
  FOR checks IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
    claims - 'amr',
    claims || '{"amr":{"method":"recovery"}}',
    claims || '{"amr":[{"method":"recovery","timestamp":"broken"}]}',
    claims || jsonb_build_object('exp', epoch_now - 1),
    claims || '{"exp":"not a number"}',
    claims || jsonb_build_object('amr', jsonb_build_array(jsonb_build_object('method', 'recovery', 'timestamp', epoch_now - 601))),
    claims || jsonb_build_object('amr', jsonb_build_array(jsonb_build_object('method', 'recovery', 'timestamp', epoch_now + 601))),
    claims || jsonb_build_object('amr', jsonb_build_array(jsonb_build_object('method', 'oauth', 'timestamp', epoch_now - 60))),
    claims || '{"session_id":"malformed"}',
    claims || '{"role":"anon"}'
  )) LOOP
    PERFORM set_config('request.jwt.claims', checks::text, true);
    ASSERT public.consume_recovery_session_v1(member_id, good_session) IS FALSE;
  END LOOP;
  PERFORM set_config('request.jwt.claims', claims::text, true);
  ASSERT public.consume_recovery_session_v1(other_id, good_session) IS FALSE;
  ASSERT public.consume_recovery_session_v1(member_id, other_session) IS FALSE;
  PERFORM set_config('request.jwt.claims', (claims || jsonb_build_object('session_id', expired_session))::text, true);
  ASSERT public.consume_recovery_session_v1(member_id, expired_session) IS FALSE;
  PERFORM set_config('request.jwt.claims', (claims || jsonb_build_object('session_id', absent_session))::text, true);
  ASSERT public.consume_recovery_session_v1(member_id, absent_session) IS FALSE;
  PERFORM set_config('request.jwt.claims', (claims || jsonb_build_object('session_id', password_session))::text, true);
  ASSERT public.consume_recovery_session_v1(member_id, password_session) IS FALSE;
  PERFORM set_config('request.jwt.claims', (claims || jsonb_build_object('session_id', other_session))::text, true);
  ASSERT public.consume_recovery_session_v1(member_id, other_session) IS FALSE;
  PERFORM set_config('request.jwt.claims', (claims || jsonb_build_object('sub', unconfirmed_id, 'session_id', unconfirmed_session))::text, true);
  ASSERT public.consume_recovery_session_v1(unconfirmed_id, unconfirmed_session) IS FALSE;
  PERFORM set_config('request.jwt.claims', claims::text, true);
  ASSERT public.consume_recovery_session_v1(member_id, good_session) IS TRUE;
  ASSERT public.consume_recovery_session_v1(member_id, good_session) IS FALSE;
END;
$checks$;
RESET ROLE;
DO $receipt$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM idealab_private.recovery_session_consumptions_v1);
END;
$receipt$;
ROLLBACK;
