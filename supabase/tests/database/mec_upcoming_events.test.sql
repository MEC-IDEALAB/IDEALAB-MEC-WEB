-- Run only inside one explicit transaction with stop-on-error, after the
-- isolated candidate. The savepoint rollback preserves existing accounts,
-- events and claims. Do not run this file in an autocommit SQL client.
SAVEPOINT upcoming_test;
SET LOCAL plpgsql.check_asserts = on;
DO $catalog$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY['idealab_private.get_upcoming_events_v1()', 'public.get_upcoming_events_v1()'] LOOP
    ASSERT NOT has_function_privilege('anon', f, 'EXECUTE'), 'anonymous execution denied';
    ASSERT NOT has_function_privilege('service_role', f, 'EXECUTE'), 'service bypass denied';
    ASSERT has_function_privilege('authenticated', f, 'EXECUTE'), 'authenticated wrapper access';
    ASSERT (SELECT proconfig @> ARRAY['search_path=""'] FROM pg_proc WHERE oid = f::regprocedure), 'fixed search path';
  END LOOP;
  ASSERT (SELECT prosecdef FROM pg_proc WHERE oid = 'idealab_private.get_upcoming_events_v1()'::regprocedure), 'private definer';
  ASSERT (SELECT NOT prosecdef FROM pg_proc WHERE oid = 'public.get_upcoming_events_v1()'::regprocedure), 'public invoker';
  ASSERT NOT has_table_privilege('authenticated', 'public.events', 'SELECT'), 'no raw events read';
END; $catalog$;
DO $sessionless$
DECLARE denied boolean := false;
BEGIN
  BEGIN PERFORM public.get_upcoming_events_v1(); EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'sessionless read denied';
END; $sessionless$;
DO $identity$
BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active) <> 1
    OR (SELECT count(*) FROM public.events) <> 0 THEN
    RAISE EXCEPTION 'requires isolated empty Events and approved test identity';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', (SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active), true);
END; $identity$;
SET LOCAL ROLE authenticated;
DO $empty$
BEGIN
  ASSERT public.get_upcoming_events_v1() = '{"items":[],"cursor":null}'::jsonb, 'empty programme';
END; $empty$;
RESET ROLE;
INSERT INTO public.events(id, title, event_type, event_date, venue, status) VALUES
  ('00000000-0000-4000-8000-000000000001', 'ROLLBACK past', 'workshop', now() - interval '1 second', NULL, 'upcoming'),
  ('00000000-0000-4000-8000-000000000002', 'ROLLBACK cutoff', 'workshop', now(), NULL, 'upcoming'),
  ('00000000-0000-4000-8000-000000000003', 'ROLLBACK tie A', 'workshop', now() + interval '1 hour', NULL, 'upcoming'),
  ('00000000-0000-4000-8000-000000000004', 'ROLLBACK tie B', 'workshop', now() + interval '1 hour', NULL, 'upcoming'),
  ('00000000-0000-4000-8000-000000000005', 'ROLLBACK later', 'workshop', now() + interval '2 hours', NULL, 'upcoming'),
  ('00000000-0000-4000-8000-000000000006', 'ROLLBACK cancelled', 'workshop', now() + interval '1 minute', NULL, 'cancelled'),
  ('00000000-0000-4000-8000-000000000007', 'ROLLBACK unspecified', 'workshop', now() + interval '2 minutes', NULL, NULL);
SET LOCAL ROLE authenticated;
DO $reads$
DECLARE result jsonb;
BEGIN
  result := public.get_upcoming_events_v1();
  ASSERT jsonb_array_length(result->'items') = 3 AND result->'cursor' = 'null'::jsonb, 'bounded and cursor-free';
  ASSERT result#>>'{items,0,id}' = '00000000-0000-4000-8000-000000000002', 'cutoff included and past excluded';
  ASSERT result#>>'{items,1,id}' = '00000000-0000-4000-8000-000000000003'
    AND result#>>'{items,2,id}' = '00000000-0000-4000-8000-000000000004', 'ascending time and tie order';
  ASSERT (SELECT count(*) FROM jsonb_object_keys(result->'items'->0)) = 7
    AND NOT (result->'items'->0 ?| ARRAY['created_by','club_id','capacity','rsvp_count','image_url']), 'safe projection';
END; $reads$;
RESET ROLE;
DO $other$
BEGIN
  IF (SELECT count(*) FROM idealab_private.mec_registration_collision_state_v1) <> 1 THEN
    RAISE EXCEPTION 'requires existing second unadmitted test identity';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', (SELECT user_id::text FROM idealab_private.mec_registration_collision_state_v1), true);
END; $other$;
SET LOCAL ROLE authenticated;
DO $denial$
DECLARE denied boolean := false;
BEGIN
  BEGIN PERFORM public.get_upcoming_events_v1(); EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'unadmitted read denied';
END; $denial$;
RESET ROLE;
ROLLBACK TO SAVEPOINT upcoming_test;
RELEASE SAVEPOINT upcoming_test;
