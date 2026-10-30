-- Append after candidate in one explicit outer transaction. Managed fixtures only.
-- Caller ends with ROLLBACK for candidate acceptance; no Auth/profile writes.
SET LOCAL plpgsql.check_asserts=on;
DO $catalog$ DECLARE r text;f text; BEGIN
  ASSERT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.events'::regclass),'forced RLS';
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    ASSERT NOT has_table_privilege(r,'public.events','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'no raw Events API grant';
  END LOOP;
  FOREACH f IN ARRAY ARRAY['idealab_private.get_events_v1(text,timestamptz,uuid)','idealab_private.get_event_v1(uuid)','public.get_events_v1(text,timestamptz,uuid)','public.get_event_v1(uuid)'] LOOP
    ASSERT NOT has_function_privilege('anon',f,'EXECUTE'),'anonymous execution denied';
    ASSERT NOT has_function_privilege('service_role',f,'EXECUTE'),'no service bypass API';
    ASSERT has_function_privilege('authenticated',f,'EXECUTE'),'session execution granted';
    ASSERT (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid=f::regprocedure),'fixed empty search path';
  END LOOP;
  ASSERT (SELECT NOT prosecdef FROM pg_proc WHERE oid='public.get_events_v1(text,timestamptz,uuid)'::regprocedure),'list wrapper invoker';
  ASSERT (SELECT NOT prosecdef FROM pg_proc WHERE oid='public.get_event_v1(uuid)'::regprocedure),'detail wrapper invoker';
  ASSERT (SELECT prosecdef FROM pg_proc WHERE oid='idealab_private.get_events_v1(text,timestamptz,uuid)'::regprocedure),'guarded private list';
  ASSERT (SELECT prosecdef FROM pg_proc WHERE oid='idealab_private.get_event_v1(uuid)'::regprocedure),'guarded private detail';
END; $catalog$;
DO $sessionless$ DECLARE denied boolean:=false; BEGIN
  BEGIN PERFORM public.get_events_v1('all',NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'sessionless list denied'; denied:=false;
  BEGIN PERFORM public.get_event_v1(gen_random_uuid()); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'sessionless detail denied';
END; $sessionless$;
DO $identity$ BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active)<>1 OR (SELECT count(*) FROM public.events)<>0 THEN RAISE EXCEPTION 'requires isolated empty Events and approved identity'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active),true);
END; $identity$;
SET LOCAL ROLE authenticated;
DO $empty$ BEGIN ASSERT public.get_events_v1('all',NULL,NULL)='{"items":[],"cursor":null}'::jsonb,'real empty result'; END; $empty$;
RESET ROLE;
INSERT INTO public.events(id,title,description,event_type,event_date,end_date,venue,status)
SELECT ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'ROLLBACK event fixture '||i,'Managed fixture, not an announced event.',
  CASE WHEN i=1 THEN NULL ELSE 'workshop' END,'2026-10-23T03:30:00Z'::timestamptz,NULL,NULL,
  CASE WHEN i=1 THEN NULL WHEN i=2 THEN 'cancelled' WHEN i=3 THEN 'completed' WHEN i=4 THEN 'ongoing' ELSE 'upcoming' END
FROM generate_series(1,23) i;
SET LOCAL ROLE authenticated;
DO $reads$ DECLARE p jsonb;n jsonb;d jsonb; invalid boolean:=false; BEGIN
  p:=public.get_events_v1('all',NULL,NULL);
  ASSERT jsonb_array_length(p->'items')=20 AND p->'cursor'<>'null'::jsonb,'20 bounded seek records';
  n:=public.get_events_v1('all',(p#>>'{cursor,event_date}')::timestamptz,(p#>>'{cursor,id}')::uuid);
  ASSERT jsonb_array_length(n->'items')=3 AND n->'cursor'='null'::jsonb,'seek remainder';
  ASSERT p#>>'{items,0,id}'='00000000-0000-4000-8000-000000000023' AND p#>>'{items,19,id}'='00000000-0000-4000-8000-000000000004' AND n#>>'{items,2,id}'='00000000-0000-4000-8000-000000000001','descending UUID order for tied event times';
  ASSERT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p->'items')a JOIN jsonb_array_elements(n->'items')b ON a->>'id'=b->>'id'),'no repeated date-tie records';
  ASSERT jsonb_array_length(public.get_events_v1('upcoming',NULL,NULL)->'items')=19,'exact status filter';
  ASSERT jsonb_array_length(public.get_events_v1('cancelled',NULL,NULL)->'items')=1,'cancelled remains visible';
  d:=public.get_event_v1('00000000-0000-4000-8000-000000000001');
  ASSERT d->'status'='null'::jsonb AND d->'event_type'='null'::jsonb,'legacy nulls stay unknown';
  ASSERT (SELECT count(*) FROM jsonb_object_keys(d))=8 AND NOT (d ?| ARRAY['created_by','club_id','capacity','rsvp_count','qr_ticket_data','user_id']),'exact private-safe detail';
  ASSERT public.get_event_v1(gen_random_uuid()) IS NULL,'missing event null';
  BEGIN PERFORM public.get_events_v1('invalid',NULL,NULL); EXCEPTION WHEN invalid_parameter_value THEN invalid:=true; END;
  ASSERT invalid,'invalid status rejected';invalid:=false;
  BEGIN PERFORM public.get_events_v1('all',now(),NULL); EXCEPTION WHEN invalid_parameter_value THEN invalid:=true; END;
  ASSERT invalid,'partial cursor rejected';
END; $reads$;
RESET ROLE;
DO $other$ BEGIN
  IF (SELECT count(*) FROM idealab_private.mec_registration_collision_state_v1)<>1 THEN RAISE EXCEPTION 'requires existing second unadmitted identity'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.mec_registration_collision_state_v1),true);
END; $other$;
SET LOCAL ROLE authenticated;
DO $denial$ DECLARE denied boolean:=false; BEGIN
  BEGIN PERFORM public.get_events_v1('all',NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'unadmitted list denied';denied:=false;
  BEGIN PERFORM public.get_event_v1('00000000-0000-4000-8000-000000000001'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'unadmitted detail denied';
END; $denial$;
RESET ROLE;
