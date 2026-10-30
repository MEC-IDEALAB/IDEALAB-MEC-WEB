-- LOCAL rollback-only pure-validator/structural/negative suite. Apply after the
-- reviewed same-transaction candidates; run earlier private-routine allowlist
-- suites BEFORE this extension. No Auth/profile/claim fixtures are fabricated.
-- Writer persistence, genuine verified identities, active/staff preservation,
-- stale/overflow revisions, claim-transition decisions, uniqueness collisions,
-- throttle accounting/expiry and concurrency remain UNVERIFIED integration cases.
-- Numeric five/fifteen-minute threshold remains unapproved for production.

SAVEPOINT save_candidate_tests;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, extensions;
SELECT plan(44);

SELECT has_function('public', 'save_own_profile_v1', ARRAY['jsonb', 'text'], 'public save takes only payload and decimal revision');
SELECT ok((SELECT NOT prosecdef AND provolatile = 'v' AND proconfig = ARRAY['search_path=""']::text[]
           FROM pg_proc WHERE oid = 'public.save_own_profile_v1(jsonb,text)'::regprocedure),
          'save wrapper is volatile invoker code with fixed empty path');
SELECT ok((SELECT prosecdef AND provolatile = 'v' AND proconfig = ARRAY['search_path=""']::text[]
             AND pg_get_userbyid(proowner) = 'postgres'
           FROM pg_proc WHERE oid = 'idealab_private.save_current_profile_v1(jsonb,text)'::regprocedure),
          'private writer uses the reviewed fixed-path privileged maintenance owner');
SELECT is((SELECT proargnames FROM pg_proc WHERE oid = 'public.save_own_profile_v1(jsonb,text)'::regprocedure),
          ARRAY['p_profile', 'p_expected_revision', 'status', 'profile_revision']::text[],
          'save accepts no actor/authority and returns only status/revision');
SELECT ok((SELECT NOT prosecdef AND provolatile = 'i' AND proconfig = ARRAY['search_path=""']::text[]
           FROM pg_proc WHERE oid = 'idealab_private.validate_required_profile_v1(jsonb,smallint)'::regprocedure),
          'pure validator is immutable invoker code with empty path');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
            WHERE has_function_privilege(r.role_name, 'idealab_private.validate_required_profile_v1(jsonb,smallint)', 'EXECUTE')
          ), 'pure validator is not an API-callable endpoint');
SELECT ok((SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
           WHERE oid = 'idealab_private.mec_registration_collision_state_v1'::regclass)
          AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'idealab_private.mec_registration_collision_state_v1'::regclass),
          'collision state is forced-RLS without API policies');
SELECT is((SELECT array_agg(attname::text ORDER BY attnum) FROM pg_attribute
           WHERE attrelid = 'idealab_private.mec_registration_collision_state_v1'::regclass AND attnum > 0 AND NOT attisdropped),
          ARRAY['user_id', 'collision_times']::text[], 'counter stores only UID and timestamp array');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
            WHERE has_table_privilege(r.role_name, 'idealab_private.mec_registration_collision_state_v1',
              'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
              OR has_any_column_privilege(r.role_name, 'idealab_private.mec_registration_collision_state_v1', 'SELECT,INSERT,UPDATE,REFERENCES')
          ), 'effective API table and column access to counter is denied');
SELECT ok(has_function_privilege('authenticated', 'public.save_own_profile_v1(jsonb,text)', 'EXECUTE')
          AND has_function_privilege('authenticated', 'idealab_private.save_current_profile_v1(jsonb,text)', 'EXECUTE')
          AND NOT has_function_privilege('anon', 'public.save_own_profile_v1(jsonb,text)', 'EXECUTE')
          AND NOT has_function_privilege('service_role', 'public.save_own_profile_v1(jsonb,text)', 'EXECUTE'),
          'save wrapper and caller-scoped writer have authenticated-only effective grants');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_proc AS p WHERE p.pronamespace = 'idealab_private'::regnamespace
              AND ((p.oid NOT IN ('idealab_private.has_current_verified_email_v1()'::regprocedure,
                                 'idealab_private.current_student_mec_admitted_v1()'::regprocedure,
                                 'idealab_private.save_current_profile_v1(jsonb,text)'::regprocedure)
                    AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))
                OR has_function_privilege('anon', p.oid, 'EXECUTE')
                OR has_function_privilege('service_role', p.oid, 'EXECUTE'))
          ), 'private effective routine allowlist contains only two predicates and save writer');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass
                  AND conname = 'users_college_roll_key' AND contype = 'u'),
          'legacy raw roll uniqueness is preserved');

-- Pure value fixtures exercise the actual private validator, never Auth rows.
-- Every vector below emits one pgTAP assertion (24 vectors).
WITH base AS (
  SELECT '{"name":"Élodie 李","phone":"+919876543210","college_roll":"MDL24CS219","institution":"Model Engineering College","department":"Computer Science","study_year":2}'::jsonb AS full_profile,
         '{"name":"","phone":null,"college_roll":null,"institution":null,"department":null,"study_year":null}'::jsonb AS partial_profile
), vectors(label, payload, version, expected_valid, expected_complete) AS (
  SELECT 'complete v0 promotes completion', full_profile, 0::smallint, true, true FROM base UNION ALL
  SELECT 'complete v1 remains complete', full_profile, 1::smallint, true, true FROM base UNION ALL
  SELECT 'empty v0 progress valid', partial_profile, 0::smallint, true, false FROM base UNION ALL
  SELECT 'v1 cannot clear required values', partial_profile, 1::smallint, false, false FROM base UNION ALL
  SELECT 'missing key rejected', full_profile - 'phone', 0::smallint, false, false FROM base UNION ALL
  SELECT 'unknown authority key rejected', full_profile || '{"role":"super_admin"}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'null payload rejected', NULL::jsonb, 0::smallint, false, false FROM base UNION ALL
  SELECT 'array payload rejected', '[]'::jsonb, 0::smallint, false, false FROM base UNION ALL
  SELECT 'name cannot be null', full_profile || '{"name":null}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'boolean phone rejected', full_profile || '{"phone":true}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'local phone rejected', full_profile || '{"phone":"9876543210"}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'phone controls rejected before trim', full_profile || jsonb_build_object('phone', '+919876543210' || chr(10)), 0::smallint, false, false FROM base UNION ALL
  SELECT 'oversize name rejected', full_profile || jsonb_build_object('name', repeat('N', 121)), 0::smallint, false, false FROM base UNION ALL
  SELECT 'oversize department rejected', full_profile || jsonb_build_object('department', repeat('D', 121)), 0::smallint, false, false FROM base UNION ALL
  SELECT 'oversize normalized roll rejected', full_profile || jsonb_build_object('college_roll', repeat('R', 65)), 0::smallint, false, false FROM base UNION ALL
  SELECT 'institution aliases rejected', full_profile || '{"institution":"MEC"}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'year string rejected', full_profile || '{"study_year":"2"}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'fractional year rejected', full_profile || '{"study_year":2.5}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'decimal-form year rejected', full_profile || '{"study_year":2.0}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'out of range year rejected', full_profile || '{"study_year":9}', 0::smallint, false, false FROM base UNION ALL
  SELECT 'future contract rejected', full_profile, 2::smallint, false, false FROM base UNION ALL
  SELECT 'NBSP-only name is incomplete v0', full_profile || jsonb_build_object('name', chr(160)), 0::smallint, true, false FROM base UNION ALL
  SELECT 'NBSP-only department cannot clear v1', full_profile || jsonb_build_object('department', chr(160)), 1::smallint, false, false FROM base UNION ALL
  SELECT 'control in roll rejected', full_profile || jsonb_build_object('college_roll', 'MDL' || chr(9) || '24CS219'), 0::smallint, false, false FROM base
)
SELECT ok(result.valid IS NOT DISTINCT FROM vectors.expected_valid
          AND result.complete IS NOT DISTINCT FROM vectors.expected_complete, vectors.label)
FROM vectors CROSS JOIN LATERAL idealab_private.validate_required_profile_v1(vectors.payload, vectors.version) AS result;

SELECT is((SELECT normalized FROM idealab_private.validate_required_profile_v1(
  jsonb_build_object('name', chr(160) || 'Élodie  李' || chr(160), 'phone', ' +919876543210 ',
    'college_roll', '  MDL24CS219  ', 'institution', ' Model Engineering College ',
    'department', '  Computer  Science  ', 'study_year', 2), 0::smallint)),
  '{"name":"Élodie  李","phone":"+919876543210","college_roll":"  MDL24CS219  ","institution":"Model Engineering College","department":"Computer  Science","study_year":2}'::jsonb,
  'actual validator trims outer POSIX whitespace while preserving roll display and internal spaces');
SELECT is((SELECT normalized FROM idealab_private.validate_required_profile_v1(
  jsonb_build_object('name', '  ', 'phone', chr(160), 'college_roll', '  ', 'institution', '',
    'department', ' ', 'study_year', NULL::integer), 0::smallint)),
  '{"name":"","phone":null,"college_roll":null,"institution":null,"department":null,"study_year":null}'::jsonb,
  'empty text maps to explicit partial sentinels without omitted-key merging');

GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;
DO $clear_claims$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$clear_claims$;
SET LOCAL ROLE authenticated;
SELECT is((SELECT status FROM public.save_own_profile_v1('{}'::jsonb, '0')), 'verification_required',
          'wrapper rejects missing identity before payload/profile processing');
SELECT is((SELECT status FROM idealab_private.save_current_profile_v1('{}'::jsonb, '0')), 'verification_required',
          'direct writer call enforces the same verification boundary');
SELECT throws_ok('SELECT * FROM idealab_private.validate_required_profile_v1(''{}''::jsonb, 0::smallint)',
                 '42501', NULL, 'member cannot invoke pure validator directly');
SELECT throws_ok('SELECT * FROM idealab_private.mec_registration_collision_state_v1',
                 '42501', NULL, 'member cannot inspect private collision timestamps');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.save_own_profile_v1(''{}''::jsonb, ''0'')',
                 '42501', NULL, 'anonymous cannot invoke save');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok('SELECT * FROM public.save_own_profile_v1(''{}''::jsonb, ''0'')',
                 '42501', NULL, 'service role cannot invoke save wrapper');
RESET ROLE;
SELECT * FROM finish(true);
ROLLBACK TO SAVEPOINT save_candidate_tests;
RELEASE SAVEPOINT save_candidate_tests;
