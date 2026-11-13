-- Run in the same rollback transaction as the isolated candidate installation.
SET LOCAL plpgsql.check_asserts = on;
DO $checks$
DECLARE
  function_name text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY['public.get_lab_presence_v1()', 'idealab_private.get_lab_presence_v1()']
  LOOP
    ASSERT NOT has_function_privilege('anon', function_name, 'EXECUTE'), 'anonymous roster denied';
    ASSERT NOT has_function_privilege('service_role', function_name, 'EXECUTE'), 'service role roster denied';
    ASSERT has_function_privilege('authenticated', function_name, 'EXECUTE'), 'guarded member entry';
    ASSERT (SELECT proconfig = ARRAY['search_path=""'] FROM pg_proc WHERE oid = function_name::regprocedure), 'empty search path';
  END LOOP;
  ASSERT NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.get_lab_presence_v1()'::regprocedure), 'public entry uses caller privileges';
END;
$checks$;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE authenticated;
DO $caller$
BEGIN
  BEGIN
    PERFORM public.get_lab_presence_v1();
    RAISE EXCEPTION 'Roster accepted a session without a caller';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$caller$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
DO $unadmitted$
BEGIN
  BEGIN
    PERFORM public.get_lab_presence_v1();
    RAISE EXCEPTION 'Roster accepted a caller without admission';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$unadmitted$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
DO $present$
BEGIN
  ASSERT public.get_lab_presence_v1() = '{"count":1,"names":["Present member"]}'::jsonb,
    'only the active visit appears, with no private fields';
END;
$present$;
RESET ROLE;
UPDATE auth.users SET banned_until = statement_timestamp() + interval '1 hour'
WHERE id = '00000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $banned$
BEGIN
  BEGIN
    PERFORM public.get_lab_presence_v1();
    RAISE EXCEPTION 'Roster accepted a banned account';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$banned$;
RESET ROLE;
UPDATE auth.users SET banned_until = statement_timestamp() - interval '1 second'
WHERE id = '00000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
DO $expired$
BEGIN
  ASSERT public.get_lab_presence_v1() = '{"count":1,"names":["Present member"]}'::jsonb,
    'expired bans do not block admitted members';
END;
$expired$;
RESET ROLE;
SELECT idealab_private.seed_presence_crowd();
SET LOCAL ROLE authenticated;
DO $crowded$
DECLARE
  roster jsonb := public.get_lab_presence_v1();
BEGIN
  ASSERT (roster->>'count')::integer = 33, 'the count includes everyone checked in';
  ASSERT jsonb_array_length(roster->'names') = 30, 'the response caps the name list';
END;
$crowded$;
RESET ROLE;
