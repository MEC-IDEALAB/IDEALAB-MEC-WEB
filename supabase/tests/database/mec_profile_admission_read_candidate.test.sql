-- LOCAL structural/negative tests only, inside the SAME outer rollback
-- transaction as the identity, profile/provisioning and admission candidates.
-- No fabricated Auth/profile/claim rows. SQL claims below are test context,
-- not signed tokens or successful provider/Auth/Data API acceptance.
-- Real verified own Student, staff, inactive/unverified/anonymous users,
-- missing/mismatched/pending/future/versioned claims and six-field positive/
-- negative transitions require genuine-account tests and remain UNVERIFIED.
-- Run the twelve-field projection suite BEFORE applying this extension.

SAVEPOINT admission_candidate_tests;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, extensions;
SELECT plan(23);

-- Expression vectors exercise the exact bounded-text/phone expressions used
-- in the predicate; they create no identity, profile or claim records. These
-- Unicode whitespace expectations also check the isolated database's locale.
SELECT ok((SELECT bool_and(NOT (
            char_length(regexp_replace(v.raw_value,
              '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 1 AND 120
            AND v.raw_value !~ '[[:cntrl:]]'
          )) FROM (VALUES ('name', chr(160)), ('department', chr(160) || chr(160)))
            AS v(field_name, raw_value)),
          'NBSP-only required name and department fail the actual text-bound expression');
SELECT ok((SELECT bool_and(
            regexp_replace(v.raw_value, '^[[:space:]]+|[[:space:]]+$', '', 'g') = v.expected
            AND char_length(regexp_replace(v.raw_value,
              '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 1 AND 120
            AND v.raw_value !~ '[[:cntrl:]]'
          ) FROM (VALUES
            (chr(160) || 'Élodie  李' || chr(160), 'Élodie  李'),
            ('  കമ്പ്യൂട്ടർ  സയൻസ്  ', 'കമ്പ്യൂട്ടർ  സയൻസ്')
          ) AS v(raw_value, expected)),
          'padded Unicode text is valid and outer trimming preserves repeated internal spaces');
SELECT ok((SELECT bool_and(
            (v.raw_value ~ '^[+][1-9][0-9]{1,14}$' AND v.raw_value !~ '[[:cntrl:]]')
              IS NOT DISTINCT FROM v.expected
          ) FROM (VALUES
            ('+919876543210', true),
            ('+919876543210' || chr(10), false)
          ) AS v(raw_value, expected)),
          'country-code phone succeeds while a trailing newline is explicitly rejected');

SELECT has_function('idealab_private', 'current_student_mec_admitted_v1', ARRAY[]::text[],
                    'the private no-account-ID admission predicate exists');
SELECT ok((SELECT prosecdef AND provolatile = 's' AND pronargs = 0
             AND prorettype = 'boolean'::regtype AND proconfig = ARRAY['search_path=""']::text[]
             AND pg_get_userbyid(proowner) = 'postgres'
           FROM pg_proc WHERE oid = 'idealab_private.current_student_mec_admitted_v1()'::regprocedure),
          'predicate is fixed-path, stable, boolean and owned by reviewed privileged postgres');
SELECT is((SELECT count(*)::integer FROM pg_proc
           WHERE pronamespace = 'idealab_private'::regnamespace AND proname = 'current_student_mec_admitted_v1'),
          1, 'no overloaded caller-ID admission variant exists');
SELECT ok((SELECT NOT prosecdef AND provolatile = 's' AND pronargs = 0
             AND proconfig = ARRAY['search_path=""']::text[]
           FROM pg_proc WHERE oid = 'public.get_own_profile_v1()'::regprocedure),
          'extended profile RPC remains stable invoker code with empty search path');
SELECT is((SELECT proargnames FROM pg_proc WHERE oid = 'public.get_own_profile_v1()'::regprocedure),
          ARRAY['id', 'name', 'phone', 'college_roll', 'institution', 'department',
                'study_year', 'role', 'is_active', 'profile_completed',
                'profile_contract_version', 'profile_revision', 'mec_admitted']::text[],
          'extended RPC returns exactly thirteen allowlisted/computed fields');
SELECT is((SELECT proallargtypes FROM pg_proc WHERE oid = 'public.get_own_profile_v1()'::regprocedure),
          ARRAY['uuid'::regtype, 'text'::regtype, 'text'::regtype, 'text'::regtype,
                'text'::regtype, 'text'::regtype, 'smallint'::regtype, 'text'::regtype,
                'boolean'::regtype, 'boolean'::regtype, 'smallint'::regtype,
                'text'::regtype, 'boolean'::regtype]::oid[],
          'revision is a decimal text field and admission is boolean');
SELECT ok(has_function_privilege('authenticated', 'public.get_own_profile_v1()', 'EXECUTE')
          AND has_function_privilege('authenticated', 'idealab_private.current_student_mec_admitted_v1()', 'EXECUTE')
          AND NOT has_function_privilege('anon', 'public.get_own_profile_v1()', 'EXECUTE')
          AND NOT has_function_privilege('service_role', 'public.get_own_profile_v1()', 'EXECUTE'),
          'profile RPC effective execution remains authenticated-only');
SELECT ok(NOT has_function_privilege('anon', 'idealab_private.current_student_mec_admitted_v1()', 'EXECUTE')
          AND NOT has_function_privilege('service_role', 'idealab_private.current_student_mec_admitted_v1()', 'EXECUTE'),
          'anonymous and service-role effective predicate execution are denied');
SELECT ok(has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
          AND NOT has_schema_privilege('authenticated', 'idealab_private', 'CREATE')
          AND NOT has_schema_privilege('anon', 'idealab_private', 'USAGE,CREATE')
          AND NOT has_schema_privilege('service_role', 'idealab_private', 'USAGE,CREATE'),
          'private schema effective privileges are unchanged');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_attribute AS a
            WHERE a.attrelid = 'public.users'::regclass AND a.attnum > 0 AND NOT a.attisdropped
              AND has_column_privilege('authenticated', a.attrelid, a.attnum, 'SELECT')
                  IS DISTINCT FROM (a.attname = ANY (ARRAY[
                    'id', 'name', 'phone', 'college_roll', 'institution', 'department',
                    'study_year', 'role', 'is_active', 'profile_completed',
                    'profile_contract_version', 'profile_revision']))
          ), 'computed admission grants no additional profile-column reads');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
            WHERE has_table_privilege(r.role_name, 'idealab_private.mec_registration_claims_v1',
              'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
          ), 'predicate grants no API table access to private claims');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_proc AS p WHERE p.pronamespace = 'idealab_private'::regnamespace
              AND ((p.oid NOT IN ('idealab_private.has_current_verified_email_v1()'::regprocedure,
                                 'idealab_private.current_student_mec_admitted_v1()'::regprocedure)
                    AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))
                OR has_function_privilege('anon', p.oid, 'EXECUTE')
                OR has_function_privilege('service_role', p.oid, 'EXECUTE'))
          ), 'only the two reviewed caller-only private predicates are API-callable');

GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;
DO $clear_claims$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$clear_claims$;
SET LOCAL ROLE authenticated;
SELECT is(idealab_private.current_student_mec_admitted_v1(), false,
          'missing identity fails admission closed');
SELECT is((SELECT count(*)::integer FROM public.get_own_profile_v1()), 0,
          'missing identity returns no successful profile projection');
SELECT throws_ok('SELECT email FROM public.users', '42501', NULL,
                 'legacy account email remains unreadable');
SELECT throws_ok('SELECT * FROM idealab_private.mec_registration_claims_v1', '42501', NULL,
                 'current caller cannot inspect claim storage');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT idealab_private.current_student_mec_admitted_v1()', '42501', NULL,
                 'anon cannot invoke private admission');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok('SELECT idealab_private.current_student_mec_admitted_v1()', '42501', NULL,
                 'service role cannot invoke private admission');
RESET ROLE;
DO $missing_identity$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RAISE EXCEPTION 'reserved missing-identity test UUID is occupied';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000","user_metadata":{"role":"student","profile_completed":true,"mec_admitted":true,"email_verified":true}}', true);
END;
$missing_identity$;
SET LOCAL ROLE authenticated;
SELECT is(idealab_private.current_student_mec_admitted_v1(), false,
          'claimed completion/admission metadata cannot replace a real identity/profile/claim');
SELECT is((SELECT count(*)::integer FROM public.get_own_profile_v1()), 0,
          'spoofed caller metadata yields no profile row');
RESET ROLE;
SELECT * FROM finish(true);
ROLLBACK TO SAVEPOINT admission_candidate_tests;
RELEASE SAVEPOINT admission_candidate_tests;
