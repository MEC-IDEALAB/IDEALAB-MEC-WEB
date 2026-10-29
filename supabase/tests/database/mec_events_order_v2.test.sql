-- Append after the candidate inside a transaction and ROLLBACK. Requires the
-- isolated project, zero events and the approved admitted test identity.
SET LOCAL plpgsql.check_asserts = on;
DO $catalog$
DECLARE f text; denied boolean := false;
BEGIN
  FOREACH f IN ARRAY ARRAY['idealab_private.get_events_v2(text,timestamptz,uuid)','public.get_events_v2(text,timestamptz,uuid)'] LOOP
    ASSERT NOT has_function_privilege('anon',f,'EXECUTE'),'anon denied';
    ASSERT NOT has_function_privilege('service_role',f,'EXECUTE'),'service denied';
    ASSERT has_function_privilege('authenticated',f,'EXECUTE'),'member grant';
    ASSERT (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid=f::regprocedure),'fixed search path';
  END LOOP;
  ASSERT (SELECT prosecdef FROM pg_proc WHERE oid='idealab_private.get_events_v2(text,timestamptz,uuid)'::regprocedure),'private definer';
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.get_events_v2(text,timestamptz,uuid)'::regprocedure),'public invoker';
  BEGIN PERFORM public.get_events_v2('all',NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied,'sessionless denied';
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active) <> 1
    OR (SELECT count(*) FROM public.events) <> 0 THEN RAISE EXCEPTION 'unexpected test fixture state'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active),true);
END; $catalog$;
INSERT INTO public.events(id,title,event_type,event_date,status)
SELECT ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
  'ROLLBACK event fixture '||i,'workshop',
  '2026-10-23T03:30:00Z'::timestamptz + (i / 10) * interval '1 day',
  CASE WHEN i <= 25 THEN 'upcoming' ELSE 'completed' END
FROM generate_series(1,28) AS i;
SET LOCAL ROLE authenticated;
DO $pages$
DECLARE p jsonb; n jsonb; historical jsonb; all_next jsonb; invalid boolean := false;
BEGIN
  p := public.get_events_v2('upcoming',NULL,NULL);
  n := public.get_events_v2('upcoming',(p#>>'{cursor,event_date}')::timestamptz,(p#>>'{cursor,id}')::uuid);
  ASSERT jsonb_array_length(p->'items') = 20 AND jsonb_array_length(n->'items') = 5,'bounded pages';
  ASSERT n->'cursor' = 'null'::jsonb,'end cursor';
  ASSERT (SELECT array_agg((value->>'id')::uuid ORDER BY ord) FROM
    jsonb_array_elements((p->'items') || (n->'items')) WITH ORDINALITY AS x(value,ord)) =
    (SELECT array_agg(('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid ORDER BY i) FROM generate_series(1,25) AS i),
    'all upcoming IDs in exact ascending order across timestamp ties';
  historical := public.get_events_v2('completed',NULL,NULL);
  ASSERT historical#>>'{items,0,id}' = '00000000-0000-4000-8000-000000000028','completed descending';
  historical := public.get_events_v2('all',NULL,NULL);
  all_next := public.get_events_v2('all',(historical#>>'{cursor,event_date}')::timestamptz,(historical#>>'{cursor,id}')::uuid);
  ASSERT (SELECT array_agg((value->>'id')::uuid ORDER BY ord) FROM
    jsonb_array_elements((historical->'items') || (all_next->'items')) WITH ORDINALITY AS x(value,ord)) =
    (SELECT array_agg(('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid ORDER BY i DESC) FROM generate_series(1,28) AS i),
    'all-filter descending pagination across timestamp ties';
  ASSERT public.get_events_v2('ongoing',NULL,NULL) = '{"items":[],"cursor":null}'::jsonb,'empty filter';
  ASSERT public.get_events_v1('upcoming',NULL,NULL)#>>'{items,0,id}' = '00000000-0000-4000-8000-000000000025','v1 remains descending';
  BEGIN PERFORM public.get_events_v2('invalid',NULL,NULL); EXCEPTION WHEN invalid_parameter_value THEN invalid := true; END;
  ASSERT invalid,'invalid filter rejected'; invalid := false;
  BEGIN PERFORM public.get_events_v2('all',now(),NULL); EXCEPTION WHEN invalid_parameter_value THEN invalid := true; END;
  ASSERT invalid,'partial cursor rejected'; invalid := false;
  BEGIN PERFORM public.get_events_v2('all','infinity'::timestamptz,'00000000-0000-4000-8000-000000000001'); EXCEPTION WHEN invalid_parameter_value THEN invalid := true; END;
  ASSERT invalid,'infinite cursor rejected';
END; $pages$;
RESET ROLE;
UPDATE public.events SET status = 'ongoing' WHERE id <= '00000000-0000-4000-8000-000000000020'::uuid;
SET LOCAL ROLE authenticated;
DO $boundary$ DECLARE p jsonb; BEGIN
  p := public.get_events_v2('ongoing',NULL,NULL);
  ASSERT jsonb_array_length(p->'items') = 20 AND p->'cursor' = 'null'::jsonb,'exactly twenty has no next cursor';
END; $boundary$;
RESET ROLE;
UPDATE public.events SET status = 'ongoing' WHERE id = '00000000-0000-4000-8000-000000000021'::uuid;
SET LOCAL ROLE authenticated;
DO $boundary$ DECLARE p jsonb; n jsonb; BEGIN
  p := public.get_events_v2('ongoing',NULL,NULL);
  n := public.get_events_v2('ongoing',(p#>>'{cursor,event_date}')::timestamptz,(p#>>'{cursor,id}')::uuid);
  ASSERT jsonb_array_length(p->'items') = 20 AND p->'cursor' <> 'null'::jsonb AND jsonb_array_length(n->'items') = 1 AND n->'cursor' = 'null'::jsonb,'twenty one yields one next page';
END; $boundary$;
RESET ROLE;
DO $other$ BEGIN
  IF (SELECT count(*) FROM idealab_private.mec_registration_collision_state_v1) <> 1 THEN RAISE EXCEPTION 'requires existing unadmitted test identity'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.mec_registration_collision_state_v1),true);
END; $other$;
SET LOCAL ROLE authenticated;
DO $denial$ DECLARE denied boolean := false; BEGIN
  BEGIN PERFORM public.get_events_v2('upcoming',NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied,'unadmitted account denied';
END; $denial$;
RESET ROLE;
