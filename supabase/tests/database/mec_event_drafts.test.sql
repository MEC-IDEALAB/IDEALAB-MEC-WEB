SET LOCAL plpgsql.check_asserts = on;
DO $acl$
DECLARE role_name text; relation text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    FOREACH relation IN ARRAY ARRAY['event_management_v1','event_management_commands_v1','event_management_history_v1'] LOOP
      ASSERT NOT has_table_privilege(role_name,'idealab_private.'||relation,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES'), 'raw draft data denied';
      ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = ('idealab_private.'||relation)::regclass), 'forced RLS';
    END LOOP;
    ASSERT has_function_privilege(role_name,'public.mutate_event_draft_v1(jsonb,uuid,uuid)','EXECUTE') = (role_name='authenticated'), 'guarded entry ACL';
    ASSERT NOT has_function_privilege(role_name,'idealab_private.valid_event_draft_v1(jsonb)','EXECUTE'), 'validator internal';
  END LOOP;
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.mutate_event_draft_v1(jsonb,uuid,uuid)'::regprocedure), 'public invoker';
END;
$acl$;
SET LOCAL ROLE authenticated;
DO $behavior$
DECLARE
  actor uuid := '00000000-0000-0000-0000-000000000002';
  other_actor uuid := '00000000-0000-0000-0000-000000000003';
  scope uuid := '20000000-0000-0000-0000-000000000001';
  command_id uuid := gen_random_uuid(); publish_id uuid := gen_random_uuid();
  details jsonb := '{"title":"Synthetic workshop","description":"A synthetic workshop for local permission checks.","venue":"Test room","event_type":"workshop","event_date":"2099-11-03T09:00:00Z","end_date":null,"capacity":20,"audience":"open","attendee_visibility":"registered","fee_paise":"0"}';
  command jsonb; created jsonb; edited jsonb; published jsonb;
BEGIN
  command := jsonb_build_object('action','create','scope_id',scope,'details',details);
  PERFORM set_config('request.jwt.claim.sub','',true);
  BEGIN
    PERFORM public.mutate_event_draft_v1(command,command_id,actor);
    RAISE EXCEPTION 'Sessionless create accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',other_actor::text,true);
  BEGIN
    PERFORM public.mutate_event_draft_v1(command,command_id,other_actor);
    RAISE EXCEPTION 'Unassigned member created event';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  BEGIN
    PERFORM public.mutate_event_draft_v1(command,command_id,other_actor);
    RAISE EXCEPTION 'Expected actor mismatch accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.mutate_event_draft_v1(jsonb_set(command,'{scope_id}','"20000000-0000-0000-0000-000000000002"'),command_id,actor);
    RAISE EXCEPTION 'Machine head created event';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.mutate_event_draft_v1(jsonb_set(command,'{details,capacity}','0'),command_id,actor);
    RAISE EXCEPTION 'Zero capacity accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.mutate_event_draft_v1(jsonb_set(command,'{details,venue}','"   "'),command_id,actor);
    RAISE EXCEPTION 'Blank venue accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.mutate_event_draft_v1(command || '{"head_id":"forged"}',command_id,actor);
    RAISE EXCEPTION 'Extra authority field accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  created := public.mutate_event_draft_v1(command,command_id,actor);
  ASSERT created->>'revision'='1' AND created->>'state'='draft';
  ASSERT public.mutate_event_draft_v1(command,command_id,actor)=created, 'lost-response retry';
  ASSERT (SELECT count(*)=0 FROM public.events), 'private draft absent from published programme';
  BEGIN
    PERFORM public.mutate_event_draft_v1(jsonb_set(command,'{details,title}','"Changed intent"'),command_id,actor);
    RAISE EXCEPTION 'Changed retry accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  PERFORM set_config('event_fixture.event_id',created->>'event_id',true);
  PERFORM set_config('event_fixture.create_command',command_id::text,true);
  PERFORM set_config('event_fixture.create_payload',command::text,true);
  command := jsonb_build_object('action','edit','event_id',created->>'event_id','revision','1','details',details || '{"title":"Revised workshop","fee_paise":"15000","audience":"invite_only"}');
  edited := public.mutate_event_draft_v1(command,gen_random_uuid(),actor);
  ASSERT edited->>'revision'='2' AND edited->>'state'='draft';
  BEGIN
    PERFORM public.mutate_event_draft_v1(jsonb_build_object('action','publish','event_id',created->>'event_id','revision','2'),gen_random_uuid(),actor);
    RAISE EXCEPTION 'Paid or invite-only publication accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  command := jsonb_build_object('action','edit','event_id',created->>'event_id','revision','2','details',details || '{"title":"Revised workshop"}');
  edited := public.mutate_event_draft_v1(command,gen_random_uuid(),actor);
  ASSERT edited->>'revision'='3';
  BEGIN
    PERFORM public.mutate_event_draft_v1(
      jsonb_build_object('action','publish','event_id',created->>'event_id','revision','3'),gen_random_uuid(),actor);
    RAISE EXCEPTION 'Unsupported attendee visibility was published';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  command := jsonb_build_object('action','edit','event_id',created->>'event_id','revision','3',
    'details',details || '{"title":"Revised workshop","attendee_visibility":"head"}');
  edited := public.mutate_event_draft_v1(command,gen_random_uuid(),actor);
  ASSERT edited->>'revision'='4' AND edited->>'state'='draft';
  BEGIN
    PERFORM public.mutate_event_draft_v1(
      jsonb_build_object('action','edit','event_id',created->>'event_id','revision','3','details',details),gen_random_uuid(),actor);
    RAISE EXCEPTION 'Stale edit accepted';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
  command := jsonb_build_object('action','publish','event_id',created->>'event_id','revision','4');
  published := public.mutate_event_draft_v1(command,publish_id,actor);
  ASSERT published->>'revision'='5' AND published->>'state'='published';
  ASSERT public.mutate_event_draft_v1(command,publish_id,actor)=published, 'publication retry';
  BEGIN
    PERFORM public.mutate_event_draft_v1(command,gen_random_uuid(),actor);
    RAISE EXCEPTION 'Published event republished';
  EXCEPTION WHEN serialization_failure THEN NULL; END;
END;
$behavior$;
RESET ROLE;
DO $inspect$
BEGIN
  ASSERT (SELECT count(*)=1 FROM public.events), 'one publication';
  ASSERT (SELECT title='Revised workshop' AND status='upcoming' AND rsvp_count=0 FROM public.events), 'published projection';
  ASSERT (SELECT details->>'attendee_visibility'='head' FROM idealab_private.event_management_v1), 'published draft retains restrictive visibility';
  ASSERT (SELECT count(*)=1 FROM idealab_private.event_management_v1), 'one draft';
  ASSERT (SELECT count(*)=5 FROM idealab_private.event_management_history_v1), 'one audit per successful revision';
  ASSERT (SELECT count(*)=5 FROM idealab_private.event_management_commands_v1), 'no receipts on rejected commands';
END;
$inspect$;
-- A public-table error must roll back publication, receipt and history together.
ALTER TABLE public.events ADD CONSTRAINT fixture_insert_failure CHECK (title <> 'Forced publication failure');
SET LOCAL ROLE authenticated;
DO $atomic$
DECLARE actor uuid := '00000000-0000-0000-0000-000000000002'; created jsonb; payload jsonb;
BEGIN
  payload := '{"title":"Forced publication failure","description":"Synthetic failure verifies an atomic publication.","venue":"Test room","event_type":"workshop","event_date":"2099-11-03T09:00:00Z","end_date":null,"capacity":null,"audience":"open","attendee_visibility":"head","fee_paise":"0"}';
  created := public.mutate_event_draft_v1(jsonb_build_object('action','create','scope_id','20000000-0000-0000-0000-000000000001','details',payload),gen_random_uuid(),actor);
  PERFORM set_config('event_fixture.failed_id',created->>'event_id',true);
  BEGIN
    PERFORM public.mutate_event_draft_v1(jsonb_build_object('action','publish','event_id',created->>'event_id','revision','1'),gen_random_uuid(),actor);
    RAISE EXCEPTION 'Forced publication failure did not occur';
  EXCEPTION WHEN check_violation THEN NULL; END;
  created := public.mutate_event_draft_v1(jsonb_build_object('action','create','scope_id','20000000-0000-0000-0000-000000000001','details',payload || '{"title":"Expired draft","event_date":"2000-01-01T00:00:00Z"}'),gen_random_uuid(),actor);
  BEGIN
    PERFORM public.mutate_event_draft_v1(jsonb_build_object('action','publish','event_id',created->>'event_id','revision','1'),gen_random_uuid(),actor);
    RAISE EXCEPTION 'Past event publication accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END;
$atomic$;
RESET ROLE;
DO $atomic_inspect$
BEGIN
  ASSERT (SELECT revision=1 AND published_event_id IS NULL FROM idealab_private.event_management_v1 WHERE id=current_setting('event_fixture.failed_id')::uuid), 'failed publication retains original draft';
  ASSERT (SELECT count(*)=1 FROM idealab_private.event_management_history_v1 WHERE event_id=current_setting('event_fixture.failed_id')::uuid), 'failed publication adds no audit revision';
  ASSERT (SELECT count(*)=7 FROM idealab_private.event_management_commands_v1), 'failed publication adds no receipt';
  ASSERT (SELECT count(*)=1 FROM public.events), 'failed and expired publications add no public rows';
END;
$atomic_inspect$;
SET LOCAL ROLE authenticated;
DO $revoke_fixture$
DECLARE result_revision bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  result_revision := public.set_staff_scope_head_v1(
    '20000000-0000-0000-0000-000000000001',2,'00000000-0000-0000-0000-000000000002',
    'revoke','Revoke Event Head after draft checks',gen_random_uuid(),'00000000-0000-0000-0000-000000000001');
  ASSERT result_revision=3, 'fixture revocation uses the audited scope revision';
END;
$revoke_fixture$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $revoked$
BEGIN
  BEGIN
    PERFORM public.mutate_event_draft_v1(current_setting('event_fixture.create_payload')::jsonb,
      current_setting('event_fixture.create_command')::uuid,'00000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Revoked head replay accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$revoked$;
RESET ROLE;
