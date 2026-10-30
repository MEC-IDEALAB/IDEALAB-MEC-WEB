-- Catalog/privilege assertions only. Run with the delta in the SAME outer
-- BEGIN/ROLLBACK. This never updates or fabricates an Auth row and does not
-- prove a provider-driven email change, collision handling or trigger firing.
SAVEPOINT email_sync_tests;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, extensions;
SELECT plan(15);
SELECT ok(to_regprocedure('idealab_private.sync_mec_profile_email_v1()') IS NOT NULL, 'private email sync exists');
SELECT ok((SELECT prorettype='trigger'::regtype AND pronargs=0 FROM pg_proc WHERE oid='idealab_private.sync_mec_profile_email_v1()'::regprocedure), 'sync is a zero-argument trigger function');
SELECT ok((SELECT prosecdef FROM pg_proc WHERE oid='idealab_private.sync_mec_profile_email_v1()'::regprocedure), 'reviewed owner privileges provide internal projection access');
SELECT ok((SELECT pg_get_userbyid(proowner)='postgres' FROM pg_proc WHERE oid='idealab_private.sync_mec_profile_email_v1()'::regprocedure), 'function owner is postgres');
SELECT ok((SELECT proconfig=ARRAY['search_path=""'] FROM pg_proc WHERE oid='idealab_private.sync_mec_profile_email_v1()'::regprocedure), 'search path is fixed empty');
SELECT ok(NOT has_function_privilege('anon','idealab_private.sync_mec_profile_email_v1()','EXECUTE'), 'anon cannot execute sync');
SELECT ok(NOT has_function_privilege('authenticated','idealab_private.sync_mec_profile_email_v1()','EXECUTE'), 'authenticated cannot execute sync');
SELECT ok(NOT has_function_privilege('service_role','idealab_private.sync_mec_profile_email_v1()','EXECUTE'), 'service role has no direct sync execution grant');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='idealab_private.sync_mec_profile_email_v1()'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE'), 'PUBLIC has no sync execution grant');
SELECT is((SELECT count(*)::integer FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='mec_profile_after_auth_email_update_v1' AND NOT tgisinternal),1,'exactly one Auth sync trigger');
SELECT ok((SELECT tgenabled='O' AND tgtype=17 AND tgfoid='idealab_private.sync_mec_profile_email_v1()'::regprocedure FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='mec_profile_after_auth_email_update_v1'),'trigger is ordinary AFTER UPDATE FOR EACH ROW');
SELECT ok((SELECT array_agg(a.attname::text ORDER BY a.attname)=ARRAY['email','email_confirmed_at'] FROM pg_trigger t JOIN pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=ANY(t.tgattr) WHERE t.tgrelid='auth.users'::regclass AND t.tgname='mec_profile_after_auth_email_update_v1'),'only email or confirmation updates invoke sync');
SELECT ok((SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.users'::regclass),'profile forced RLS remains enabled');
SELECT ok(NOT has_column_privilege('authenticated','public.users','email','SELECT,INSERT,UPDATE'),'copied email is not a client read/write field');
SELECT ok(has_schema_privilege('authenticated','idealab_private','USAGE') AND NOT has_schema_privilege('authenticated','idealab_private','CREATE') AND NOT has_schema_privilege('anon','idealab_private','USAGE,CREATE') AND NOT has_schema_privilege('service_role','idealab_private','USAGE,CREATE'),'reviewed private-schema privileges are preserved; schema is not a Data API exposure');
SELECT * FROM finish(true);
ROLLBACK TO SAVEPOINT email_sync_tests;
RELEASE SAVEPOINT email_sync_tests;
