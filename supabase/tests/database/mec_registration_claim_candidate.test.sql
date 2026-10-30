-- LOCAL rollback-only structural/validator/denial tests. Apply after reviewed
-- same-transaction prerequisites. No Auth/profile/claim fixtures are fabricated.
-- Genuine-account claim creation/replacement/display-edit/lost-response retry,
-- stale revision, raw/normalized collision accounting, throttle expiry, concurrent
-- requests and IMMEDIATE pending-guard rollback remain UNVERIFIED integration
-- cases. Run earlier private-routine allowlist suites BEFORE this extension.
SAVEPOINT claim_candidate_tests;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, extensions;
SELECT plan(28);

SELECT has_function('public', 'claim_mec_registration_v1', ARRAY['text', 'text', 'boolean'],
                    'claim API accepts display, decimal revision and explicit declaration only');
SELECT ok((SELECT NOT prosecdef AND provolatile = 'v' AND proconfig = ARRAY['search_path=""']::text[]
           FROM pg_proc WHERE oid = 'public.claim_mec_registration_v1(text,text,boolean)'::regprocedure),
          'claim wrapper is volatile invoker code with empty search path');
SELECT ok((SELECT prosecdef AND provolatile = 'v' AND proconfig = ARRAY['search_path=""']::text[]
             AND pg_get_userbyid(proowner) = 'postgres'
           FROM pg_proc WHERE oid = 'idealab_private.claim_current_mec_registration_v1(text,text,boolean)'::regprocedure),
          'private claim writer has reviewed postgres ownership and fixed search path');
SELECT is((SELECT proargnames FROM pg_proc WHERE oid = 'public.claim_mec_registration_v1(text,text,boolean)'::regprocedure),
          ARRAY['p_display_number', 'p_expected_revision', 'p_self_declaration', 'status', 'profile_revision']::text[],
          'claim API accepts no actor/attestation authority and returns only status/revision');
SELECT ok((SELECT NOT prosecdef AND provolatile = 'i' AND proconfig = ARRAY['search_path=""']::text[]
           FROM pg_proc WHERE oid = 'idealab_private.validate_mec_claim_display_v1(text)'::regprocedure),
          'actual prefix validator is private immutable invoker code');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
            WHERE has_function_privilege(r.role_name, 'idealab_private.validate_mec_claim_display_v1(text)', 'EXECUTE')
          ), 'prefix validator has no effective API execution');
SELECT ok(has_function_privilege('authenticated', 'public.claim_mec_registration_v1(text,text,boolean)', 'EXECUTE')
          AND has_function_privilege('authenticated', 'idealab_private.claim_current_mec_registration_v1(text,text,boolean)', 'EXECUTE')
          AND NOT has_function_privilege('anon', 'public.claim_mec_registration_v1(text,text,boolean)', 'EXECUTE')
          AND NOT has_function_privilege('service_role', 'public.claim_mec_registration_v1(text,text,boolean)', 'EXECUTE'),
          'only authenticated effectively executes the claim call chain');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_proc AS p WHERE p.pronamespace = 'idealab_private'::regnamespace
              AND ((p.oid NOT IN ('idealab_private.has_current_verified_email_v1()'::regprocedure,
                                 'idealab_private.current_student_mec_admitted_v1()'::regprocedure,
                                 'idealab_private.save_current_profile_v1(jsonb,text)'::regprocedure,
                                 'idealab_private.claim_current_mec_registration_v1(text,text,boolean)'::regprocedure)
                    AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))
                OR has_function_privilege('anon', p.oid, 'EXECUTE')
                OR has_function_privilege('service_role', p.oid, 'EXECUTE'))
          ), 'effective private routine boundary contains only four reviewed caller-scoped operations');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger
                  WHERE tgrelid = 'idealab_private.mec_registration_claims_v1'::regclass
                    AND tgname = 'mec_registration_claims_v1_no_pending_at_commit'
                    AND tgdeferrable AND tginitdeferred AND tgenabled = 'O'),
          'existing deferred pending guard remains enabled');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
            CROSS JOIN (VALUES ('idealab_private.mec_registration_claims_v1'),
                               ('idealab_private.mec_registration_collision_state_v1')) AS t(table_name)
            WHERE has_table_privilege(r.role_name, t.table_name,
              'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
              OR has_any_column_privilege(r.role_name, t.table_name, 'SELECT,INSERT,UPDATE,REFERENCES')
          ), 'claims and shared collision state remain inaccessible to API roles');

-- Actual pure validator vectors, with no fabricated Auth-linked records.
WITH vectors(label, value, expected) AS (VALUES
  ('MDL example accepted', 'MDL24CS219'::text, true),
  ('lateral entry accepted', 'LMDL24CS219', true),
  ('case and outer spaces accepted', '  mdl24cs219  ', true),
  ('NBSP padding accepted', chr(160) || 'lmdl24cs219' || chr(160), true),
  ('internal repeated spaces follow existing comparison', 'MDL  24CS219', true),
  ('unknown suffix is bounded not invented official regex', 'MDLunknown-course', true),
  ('other institution rejected', 'ABC24CS219', false),
  ('empty rejected', '', false),
  ('null rejected', NULL::text, false),
  ('controls rejected before whitespace normalization', 'MDL' || chr(9) || '24CS219', false),
  ('oversized normalized display rejected', 'MDL' || repeat('R', 62), false),
  ('raw resource cap rejects excessive padding before normalization', repeat(' ', 4096) || 'MDL24CS219', false)
)
SELECT is(idealab_private.validate_mec_claim_display_v1(vectors.value), vectors.expected, vectors.label) FROM vectors;

GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;
DO $clear_claims$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$clear_claims$;
SET LOCAL ROLE authenticated;
SELECT is((SELECT status FROM public.claim_mec_registration_v1('MDL24CS219', '0', true)),
          'verification_required', 'missing identity cannot declare/claim via wrapper');
SELECT is((SELECT status FROM idealab_private.claim_current_mec_registration_v1('MDL24CS219', '0', true)),
          'verification_required', 'direct private writer enforces the same identity check');
SELECT throws_ok('SELECT idealab_private.validate_mec_claim_display_v1(''MDL24CS219'')',
                 '42501', NULL, 'member cannot call pure validation endpoint');
SELECT throws_ok('SELECT * FROM idealab_private.mec_registration_claims_v1',
                 '42501', NULL, 'member cannot inspect another registration claim');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.claim_mec_registration_v1(''MDL24CS219'', ''0'', true)',
                 '42501', NULL, 'anonymous cannot invoke claim API');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok('SELECT * FROM public.claim_mec_registration_v1(''MDL24CS219'', ''0'', true)',
                 '42501', NULL, 'service role cannot invoke claim API');
RESET ROLE;
SELECT * FROM finish(true);
ROLLBACK TO SAVEPOINT claim_candidate_tests;
RELEASE SAVEPOINT claim_candidate_tests;
