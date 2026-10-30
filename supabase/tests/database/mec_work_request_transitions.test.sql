-- Managed SQL-role fixture, actual approved isolated identity, all effects roll back.
-- Passed in the isolated validation project on 23 October 2026.
BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $validators$ DECLARE p jsonb:='{"kind":"machine","service_id":"cnc","title":"Fixture request","description":"A clearly marked test request only.","technical_details":"","preferred_at":null,"references":[]}';u text;
BEGIN
  ASSERT idealab_private.valid_work_intake_v1(p),'valid machine payload';
  ASSERT idealab_private.valid_work_intake_v1(p||'{"kind":"operations","service_id":"ics"}'),'valid operations payload';
  ASSERT NOT idealab_private.valid_work_intake_v1(p||'{"kind":"operations"}'),'cross-kind service rejected';
  ASSERT NOT idealab_private.valid_work_intake_v1(p||'{"owner_id":"forged"}'),'authority extras rejected';
  ASSERT NOT idealab_private.valid_work_intake_v1(p||'{"references":null}'),'non-array references rejected';
  ASSERT NOT idealab_private.valid_work_intake_v1(p||'{"preferred_at":"2026-02-30T10:00:00Z"}'),'calendar invalid rejected';
  ASSERT idealab_private.valid_work_intake_v1(p||jsonb_build_object('title',repeat('🛠',120),'description',repeat('🛠',5000),'technical_details',repeat('🛠',2000))),'maximum multibyte payload valid';
  FOREACH u IN ARRAY ARRAY['https://example.com/path','http://example.com/','http://[::1]:8080/','https://127.0.0.1:65535/','https://xn--e1afmkfd.xn--p1ai/%D0%BF%D1%83%D1%82%D1%8C'] LOOP
    ASSERT idealab_private.valid_work_reference_v1(u),'canonical JS URL vector accepted';
  END LOOP;
  FOREACH u IN ARRAY ARRAY['https://example.com:99999/','javascript:alert(1)','https://u:p@example.com/','https://example.com/a b','https://999.999.999.999/','https://[::::]/','https://xn--/'] LOOP
    ASSERT NOT idealab_private.valid_work_reference_v1(u),'unsafe/malformed URL rejected';
  END LOOP;
END; $validators$;
DO $identity$ BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active)<>1 THEN RAISE EXCEPTION 'requires approved isolated account'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active),true);
END; $identity$;
SET LOCAL ROLE authenticated;
DO $cases$
DECLARE p jsonb:='{"kind":"machine","service_id":"cnc","title":"ROLLBACK request fixture","description":"A clearly marked test request only.","technical_details":"Optional material details","preferred_at":"2026-10-22T03:30:00.000Z","references":["https://example.com/reference"]}';
  cmd uuid:=gen_random_uuid(); cancel_cmd uuid:=gen_random_uuid(); id uuid; other_id uuid; r jsonb; d jsonb; page jsonb; last_page jsonb;i integer;
BEGIN
  r:=public.submit_work_request_v1(p,cmd);id:=(r->>'request_id')::uuid;
  ASSERT r->>'status'='submitted','submit recorded';
  ASSERT public.submit_work_request_v1(p,cmd)=r,'same command returns same record';
  ASSERT public.submit_work_request_v1(p||'{"title":"Changed title"}',cmd)='{"status":"conflict"}'::jsonb,'different intent conflicts';
  d:=public.get_own_work_request_v1(id);
  ASSERT d->>'description'=p->>'description' AND d->>'technical_details'=p->>'technical_details','content persisted';
  ASSERT (d->>'preferred_at')::timestamptz='2026-10-22T09:00:00+05:30'::timestamptz,'IST instant preserved';
  ASSERT d->'references'=p->'references','links preserved';
  ASSERT jsonb_array_length(d->'history')=1 AND d#>>'{history,0,status}'='submitted','immutable submission event';
  ASSERT NOT (d::text ~ '"(owner_id|actor_id|name|phone|email|college_roll)"'),'no private profile projection';
  ASSERT public.cancel_work_request_v1(id,'2',cancel_cmd)='{"status":"conflict"}'::jsonb,'stale cancellation conflicts';
  r:=public.cancel_work_request_v1(id,'1',cancel_cmd);ASSERT r->>'status'='cancelled','unclaimed request cancelled';
  ASSERT public.cancel_work_request_v1(id,'1',cancel_cmd)=r,'cancel replay exact';
  d:=public.get_own_work_request_v1(id);ASSERT d->>'status'='cancelled' AND NOT (d->>'can_cancel')::boolean AND jsonb_array_length(d->'history')=2,'cancel history and state persist';
  r:=public.submit_work_request_v1(p,cmd);ASSERT (r->>'request_id')::uuid=id,'old submit replay never reopens request';
  ASSERT public.get_own_work_request_v1(id)->>'status'='cancelled','cancel remains terminal';
  ASSERT public.get_own_work_request_v1(gen_random_uuid()) IS NULL,'missing detail null';
  ASSERT public.cancel_work_request_v1(gen_random_uuid(),'1',gen_random_uuid())='{"status":"denied"}'::jsonb,'missing cancel denied';
  FOR i IN 1..21 LOOP PERFORM public.submit_work_request_v1(p||jsonb_build_object('title','ROLLBACK pagination request '||i),gen_random_uuid()); END LOOP;
  page:=public.get_own_work_requests_v1(NULL,NULL);
  ASSERT jsonb_array_length(page->'items')=20 AND page->'cursor'<>'null'::jsonb,'bounded first page';
  last_page:=public.get_own_work_requests_v1((page#>>'{cursor,created_at}')::timestamptz,(page#>>'{cursor,id}')::uuid);
  ASSERT jsonb_array_length(last_page->'items')>=2,'next page includes remaining fixtures';
  ASSERT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(page->'items') a JOIN jsonb_array_elements(last_page->'items') b ON a->>'id'=b->>'id'),'no page overlap';
  PERFORM set_config('idealab_test.work_request_id',id::text,true);
END; $cases$;
RESET ROLE;
DO $cutoff$ DECLARE actor uuid:=auth.uid();r jsonb;v_id uuid;
BEGIN
  SELECT q.id INTO STRICT v_id FROM idealab_private.work_requests_v1 q WHERE q.owner_id=actor AND q.status='submitted' ORDER BY q.created_at DESC LIMIT 1;
  UPDATE idealab_private.work_requests_v1 SET head_claimed_at=clock_timestamp() WHERE work_requests_v1.id=v_id;
  r:=public.cancel_work_request_v1(v_id,'1',gen_random_uuid());
  ASSERT r='{"status":"review_required"}'::jsonb,'internal claim marker blocks direct cancel (sequential fixture only)';
  ASSERT (SELECT status='submitted' FROM idealab_private.work_requests_v1 q WHERE q.id=v_id),'failed cancellation preserves request';
  ASSERT NOT EXISTS(SELECT 1 FROM idealab_private.work_request_events_v1 e LEFT JOIN idealab_private.work_request_commands_v1 c ON c.owner_id=e.actor_id AND c.command_id=e.command_id WHERE c.command_id IS NULL),'events linked to command receipts';
END; $cutoff$;
DO $other$ BEGIN
  IF (SELECT count(*) FROM idealab_private.mec_registration_collision_state_v1)<>1 THEN RAISE EXCEPTION 'requires observed second unadmitted account'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.mec_registration_collision_state_v1),true);
END; $other$;
SET LOCAL ROLE authenticated;
DO $denial$ DECLARE denied boolean:=false;
BEGIN
  BEGIN PERFORM public.get_own_work_request_v1(current_setting('idealab_test.work_request_id')::uuid); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'unadmitted second account cannot read existing request';
  ASSERT public.submit_work_request_v1('{}',gen_random_uuid())='{"status":"denied"}'::jsonb,'second account admission required';
  ASSERT public.cancel_work_request_v1(current_setting('idealab_test.work_request_id')::uuid,'1',gen_random_uuid())='{"status":"denied"}'::jsonb,'second account cannot cancel existing request';
END; $denial$;
RESET ROLE;
ROLLBACK;
SELECT 'Work-request validation/transition/denial suite passed' AS result;
