SET LOCAL plpgsql.check_asserts=on;
-- Prior mutation checks revoked the fixture assignment; restore it through the
-- same audited setter used for application role changes.
SET LOCAL ROLE authenticated;
DO $restore_fixture$
DECLARE result_revision bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  result_revision := public.set_staff_scope_head_v1(
    '20000000-0000-0000-0000-000000000001',3,'00000000-0000-0000-0000-000000000002',
    'assign','Restore Event Head fixture',gen_random_uuid(),'00000000-0000-0000-0000-000000000001');
  ASSERT result_revision=4, 'fixture assignment uses the audited scope revision';
END;
$restore_fixture$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $reads$
DECLARE actor uuid := '00000000-0000-0000-0000-000000000002';
  other_actor uuid := '00000000-0000-0000-0000-000000000003';
  scope uuid := '20000000-0000-0000-0000-000000000001'; result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  ASSERT jsonb_array_length(public.get_event_management_scopes_v1(actor)->'items')=1, 'only own events scope, not machine scope';
  result := public.get_event_drafts_v1(scope,NULL,NULL,NULL,actor);
  ASSERT jsonb_array_length(result->'items')=3 AND result->'cursor'='null'::jsonb, 'own scope drafts and published record';
  ASSERT (SELECT count(*)=1 FROM jsonb_array_elements(result->'items') e WHERE e->>'state'='published'), 'published state retained';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'items') e WHERE e ? 'created_by' OR e ? 'actor_id'), 'no identity projection';
  result := public.get_event_drafts_v1(scope,current_setting('event_fixture.event_id')::uuid,NULL,NULL,actor);
  ASSERT jsonb_array_length(result->'items')=1, 'bounded detail selection';
  BEGIN
    PERFORM public.get_event_drafts_v1(scope,NULL,NULL,gen_random_uuid(),actor);
    RAISE EXCEPTION 'Incomplete cursor accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.get_event_drafts_v1(scope,NULL,NULL,NULL,other_actor);
    RAISE EXCEPTION 'Read account mismatch accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',other_actor::text,true);
  ASSERT public.get_event_management_scopes_v1(other_actor)->'items'='[]'::jsonb, 'no assignment inferred from identity';
  BEGIN
    PERFORM public.get_event_drafts_v1(scope,NULL,NULL,NULL,other_actor);
    RAISE EXCEPTION 'Unassigned draft read accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$reads$;
RESET ROLE;
DO $acl$
DECLARE routine text; api_role text;
BEGIN
  FOREACH routine IN ARRAY ARRAY['public.get_event_management_scopes_v1(uuid)',
    'public.get_event_drafts_v1(uuid,uuid,timestamptz,uuid,uuid)'] LOOP
    FOREACH api_role IN ARRAY ARRAY['anon','service_role'] LOOP
      ASSERT NOT has_function_privilege(api_role,routine,'EXECUTE'), 'API reader ACL';
    END LOOP;
  END LOOP;
  ASSERT NOT has_function_privilege('authenticated','idealab_private.require_event_manager_identity_v1(uuid)','EXECUTE'), 'internal identity guard';
  FOREACH routine IN ARRAY ARRAY['idealab_private.get_event_management_scopes_v1(uuid)',
    'idealab_private.get_event_drafts_v1(uuid,uuid,timestamptz,uuid,uuid)'] LOOP
    FOREACH api_role IN ARRAY ARRAY['anon','service_role'] LOOP
      ASSERT NOT has_function_privilege(api_role,routine,'EXECUTE'), 'private reader ACL';
    END LOOP;
    ASSERT (SELECT proconfig=ARRAY['search_path=""'] FROM pg_proc WHERE oid=routine::regprocedure), 'empty reader search path';
  END LOOP;
END;
$acl$;
INSERT INTO idealab_private.event_management_v1(scope_id,details,created_at)
SELECT e.scope_id,e.details,'2090-01-01T00:00:00Z'::timestamptz
FROM (SELECT scope_id,details FROM idealab_private.event_management_v1 LIMIT 1) e CROSS JOIN generate_series(1,23);
SET LOCAL ROLE authenticated;
DO $paging$
DECLARE actor uuid := '00000000-0000-0000-0000-000000000002';
  scope uuid := '20000000-0000-0000-0000-000000000001'; first_page jsonb; second_page jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  first_page := public.get_event_drafts_v1(scope,NULL,NULL,NULL,actor);
  ASSERT jsonb_array_length(first_page->'items')=20 AND first_page->'cursor'<>'null'::jsonb, 'bounded first page';
  second_page := public.get_event_drafts_v1(scope,NULL,(first_page#>>'{cursor,created_at}')::timestamptz,(first_page#>>'{cursor,id}')::uuid,actor);
  ASSERT jsonb_array_length(second_page->'items')=6 AND second_page->'cursor'='null'::jsonb, 'remaining page';
  ASSERT (SELECT count(DISTINCT value->>'id')=26 FROM jsonb_array_elements((first_page->'items')||(second_page->'items'))), 'no repeated or skipped records with equal timestamps';
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
  BEGIN
    PERFORM public.get_event_management_scopes_v1('00000000-0000-0000-0000-000000000004');
    RAISE EXCEPTION 'Inactive scope discovery accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$paging$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $revoke_fixture$
DECLARE result_revision bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  result_revision := public.set_staff_scope_head_v1(
    '20000000-0000-0000-0000-000000000001',4,'00000000-0000-0000-0000-000000000002',
    'revoke','Revoke Event Head fixture',gen_random_uuid(),'00000000-0000-0000-0000-000000000001');
  ASSERT result_revision=5, 'fixture revocation uses the audited scope revision';
END;
$revoke_fixture$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $revoked_read$
DECLARE actor uuid := '00000000-0000-0000-0000-000000000002';
BEGIN
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  ASSERT public.get_event_management_scopes_v1(actor)->'items'='[]'::jsonb;
  BEGIN
    PERFORM public.get_event_drafts_v1('20000000-0000-0000-0000-000000000001',NULL,NULL,NULL,actor);
    RAISE EXCEPTION 'Revoked head read drafts';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$revoked_read$;
RESET ROLE;
UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id='00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
DO $banned$
BEGIN
  BEGIN
    PERFORM public.get_event_management_scopes_v1('00000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Banned scope discovery accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$banned$;
RESET ROLE;
UPDATE auth.users SET banned_until=NULL,email_confirmed_at=NULL WHERE id='00000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
DO $unverified$
BEGIN
  BEGIN
    PERFORM public.get_event_management_scopes_v1('00000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Unverified scope discovery accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$unverified$;
RESET ROLE;
UPDATE auth.users SET email_confirmed_at=now() WHERE id='00000000-0000-0000-0000-000000000002';
