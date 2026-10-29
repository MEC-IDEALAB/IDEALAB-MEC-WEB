-- Current guard boundary tests, following the privilege-correction candidate.
-- Run inside an outer BEGIN/ROLLBACK (or reviewed installation transaction).
-- The temporary table is a wrong-context attack probe, not a substitute claim.
-- No Auth identities or real claim rows are inserted/updated by this suite.
SAVEPOINT pending_guard_tests;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, extensions;
SELECT plan(13);
SELECT ok((SELECT prosecdef FROM pg_proc WHERE oid='idealab_private.enforce_no_committed_pending_mec_claim_v1()'::regprocedure),'deferred guard uses its reviewed owner context');
SELECT ok((SELECT pg_get_userbyid(proowner)='postgres' FROM pg_proc WHERE oid='idealab_private.enforce_no_committed_pending_mec_claim_v1()'::regprocedure),'guard owner is postgres');
SELECT ok((SELECT proconfig=ARRAY['search_path=""'] FROM pg_proc WHERE oid='idealab_private.enforce_no_committed_pending_mec_claim_v1()'::regprocedure),'guard has empty fixed search path');
SELECT ok(EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='idealab_private.mec_registration_claims_v1'::regclass AND tgname='mec_registration_claims_v1_no_pending_at_commit' AND tgfoid='idealab_private.enforce_no_committed_pending_mec_claim_v1()'::regprocedure AND tgconstraint<>0 AND tgdeferrable AND tginitdeferred AND tgenabled='O' AND tgtype=21),'real pending guard stays deferred AFTER INSERT/UPDATE FOR EACH ROW');
SELECT ok(NOT has_function_privilege('anon','idealab_private.enforce_no_committed_pending_mec_claim_v1()','EXECUTE'),'anon has no guard execution');
SELECT ok(NOT has_function_privilege('authenticated','idealab_private.enforce_no_committed_pending_mec_claim_v1()','EXECUTE'),'authenticated has no guard execution');
SELECT ok(NOT has_function_privilege('service_role','idealab_private.enforce_no_committed_pending_mec_claim_v1()','EXECUTE'),'service role has no direct guard execution');
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='idealab_private.enforce_no_committed_pending_mec_claim_v1()'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'),'PUBLIC has no guard execution');
SELECT ok(NOT has_table_privilege('authenticated','idealab_private.mec_registration_claims_v1','SELECT,INSERT,UPDATE,DELETE'),'authenticated still cannot read or write private claims directly');
SELECT ok((SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='idealab_private.mec_registration_claims_v1'::regclass),'private claims forced RLS remains enabled');
CREATE TEMP TABLE pending_claim_context_probe(claim_id uuid,claim_state text);
CREATE TRIGGER mec_registration_claims_v1_no_pending_at_commit AFTER INSERT ON pg_temp.pending_claim_context_probe FOR EACH ROW EXECUTE FUNCTION idealab_private.enforce_no_committed_pending_mec_claim_v1();
SELECT throws_ok('INSERT INTO pg_temp.pending_claim_context_probe VALUES (gen_random_uuid(),''pending'')','P0001','MEC claim commit guard requires its exact internal trigger','even owner cannot attach definer guard to an arbitrary table');
GRANT INSERT,SELECT ON pg_temp.pending_claim_context_probe TO authenticated;
SET LOCAL ROLE authenticated;
SELECT throws_ok('INSERT INTO pg_temp.pending_claim_context_probe VALUES (gen_random_uuid(),''pending'')','P0001','MEC claim commit guard requires its exact internal trigger','authenticated wrong-context trigger invocation is rejected');
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM pg_temp.pending_claim_context_probe),0,'rejected probe writes leave no row');
SELECT * FROM finish(true);
ROLLBACK TO SAVEPOINT pending_guard_tests;
RELEASE SAVEPOINT pending_guard_tests;
