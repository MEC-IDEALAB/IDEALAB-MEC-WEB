-- VALIDATION-ONLY structural/negative suite; not production acceptance.
-- Rollback-only execution evidence is recorded under docs/backend-readiness.md.
-- Run only after independent review in the approved isolated project. This
-- structural/negative suite needs no Auth identity and does not prove sign-in.
-- The separate real-identity suite requires an owner-approved verified account.
-- Never fabricate auth.users rows or copy production users.
--
-- This checks SQL role/ACL/helper behavior. Setting request claims below is
-- controlled SQL test context, not a signed JWT or an Auth/Data API journey.
-- Unverified/anonymous/deleted real-account transitions and current sessions
-- require separate Auth integration acceptance. No profile/claim writes occur.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, extensions;

DO $fixture$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users AS identity_row
             WHERE identity_row.id = '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RAISE EXCEPTION 'the reserved missing-identity test value is occupied';
  END IF;
END;
$fixture$;

SELECT plan(21);

SELECT has_function('idealab_private', 'has_current_verified_email_v1', ARRAY[]::text[], 'the caller-only predicate exists');
SELECT ok((SELECT p.prorettype = 'boolean'::regtype AND p.pronargs = 0
           FROM pg_proc AS p WHERE p.oid = 'idealab_private.has_current_verified_email_v1()'::regprocedure),
          'the predicate returns only a boolean and takes no account ID');
SELECT ok((SELECT p.prosecdef FROM pg_proc AS p
           WHERE p.oid = 'idealab_private.has_current_verified_email_v1()'::regprocedure),
          'the caller-only Auth read uses a reviewed privileged definer');
SELECT is((SELECT p.provolatile::text FROM pg_proc AS p
           WHERE p.oid = 'idealab_private.has_current_verified_email_v1()'::regprocedure), 's',
          'the current Auth lookup is stable within a statement');
SELECT is((SELECT p.proconfig FROM pg_proc AS p
           WHERE p.oid = 'idealab_private.has_current_verified_email_v1()'::regprocedure), ARRAY['search_path=""']::text[],
          'the helper has an empty search path');
SELECT is((SELECT pg_get_userbyid(p.proowner)::text FROM pg_proc AS p
           WHERE p.oid = 'idealab_private.has_current_verified_email_v1()'::regprocedure), 'postgres',
          'the reviewed helper is owned by the existing privileged maintenance role');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'idealab_identity_reader_v1'),
          'no custom privileged reader role is installed');
SELECT ok(has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
          AND NOT has_schema_privilege('authenticated', 'idealab_private', 'CREATE')
          AND has_function_privilege('authenticated', 'idealab_private.has_current_verified_email_v1()', 'EXECUTE'),
          'authenticated effectively has helper usage and execution but no schema CREATE');
SELECT ok(NOT has_schema_privilege('anon', 'idealab_private', 'USAGE,CREATE')
          AND NOT has_function_privilege('anon', 'idealab_private.has_current_verified_email_v1()', 'EXECUTE'),
          'anon effectively has no schema USAGE, schema CREATE or helper execution');
SELECT ok(NOT has_schema_privilege('service_role', 'idealab_private', 'USAGE,CREATE')
          AND NOT has_function_privilege('service_role', 'idealab_private.has_current_verified_email_v1()', 'EXECUTE'),
          'service_role effectively has no schema USAGE, schema CREATE or helper execution');
SELECT ok(NOT has_column_privilege('authenticated', 'auth.users', 'email', 'SELECT'),
          'authenticated receives no direct Auth email read');
SELECT ok(NOT has_column_privilege('anon', 'auth.users', 'email', 'SELECT'),
          'anon receives no direct Auth email read');
SELECT ok(NOT has_table_privilege('authenticated', 'idealab_private.mec_registration_claims_v1', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
          'schema USAGE does not expose claims to authenticated');
SELECT ok(NOT has_table_privilege('anon', 'idealab_private.mec_registration_claims_v1', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),
          'the private claim boundary remains closed to anon');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_proc AS p
            WHERE p.pronamespace = 'idealab_private'::regnamespace
              AND (
                (p.oid <> 'idealab_private.has_current_verified_email_v1()'::regprocedure
                  AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))
                OR has_function_privilege('anon', p.oid, 'EXECUTE')
                OR has_function_privilege('service_role', p.oid, 'EXECUTE')
              )
          ), 'effective and inherited grants expose no other private routine to API roles');
SELECT ok(to_regprocedure('public.has_current_verified_email_v1()') IS NULL,
          'the predicate is not a public-schema RPC');

-- Instrumentation-only access, rolled back with the test transaction.
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT idealab_private.has_current_verified_email_v1()', '42501',
                 'permission denied for schema idealab_private', 'anon cannot invoke the private helper');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok('SELECT idealab_private.has_current_verified_email_v1()', '42501',
                 'permission denied for schema idealab_private', 'service_role cannot invoke the private helper');
RESET ROLE;
DO $clear_claims$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$clear_claims$;
SET LOCAL ROLE authenticated;
SELECT is(idealab_private.has_current_verified_email_v1(), false, 'no caller identity fails closed');
RESET ROLE;

DO $spoof_claims$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000","email_confirmed_at":"2099-01-01T00:00:00Z","user_metadata":{"role":"super_admin","email_verified":true}}', true);
END;
$spoof_claims$;
SET LOCAL ROLE authenticated;
SELECT is(idealab_private.has_current_verified_email_v1(), false, 'editable metadata and claimed verification cannot replace a current Auth row');
RESET ROLE;

SELECT is((SELECT count(*)::integer FROM pg_proc AS p
           WHERE p.pronamespace = 'idealab_private'::regnamespace AND p.proname = 'has_current_verified_email_v1'), 1,
          'there is no overloaded caller-ID variant');

SELECT * FROM finish(true);
ROLLBACK;
