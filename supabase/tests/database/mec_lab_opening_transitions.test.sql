-- Isolated only. Entire script rolls back. Uses the single explicitly assigned
-- existing verified test owner as a SQL-role fixture, not a browser login proof.
-- No Auth identity or attendance fixture is created; no IDs/contact data output.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
DO $fixture$
BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active) <> 1 THEN
    RAISE EXCEPTION 'requires exactly one approved active isolated test duty assignment';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', (SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active), true);
END;
$fixture$;
SET LOCAL ROLE authenticated;
DO $transitions$
DECLARE initial jsonb; result jsonb; current_state jsonb; expected text; action text; other_action text; command uuid := gen_random_uuid(); next_command uuid := gen_random_uuid();
BEGIN
  initial := public.get_lab_opening_v1(); expected := initial->>'revision';
  ASSERT (initial->>'can_manage')::boolean, 'explicit duty owner can manage';
  action := CASE WHEN initial->>'status' = 'open' THEN 'close' ELSE 'open' END;
  other_action := CASE action WHEN 'open' THEN 'close' ELSE 'open' END;
  result := public.set_lab_opening_v1(action,expected,command);
  ASSERT result->>'status' = 'applied', 'opposite transition applies';
  ASSERT (result->>'revision')::bigint = expected::bigint + 1, 'one revision increment';
  current_state := public.get_lab_opening_v1();
  ASSERT current_state->>'revision' = result->>'revision', 'projection reflects saved revision';
  ASSERT current_state->'changes'->0->>'action' = action, 'projection reflects saved action';
  result := public.set_lab_opening_v1(action,expected,command);
  ASSERT result->>'status' = 'applied' AND result->>'revision' = current_state->>'revision', 'retry does not duplicate';
  result := public.set_lab_opening_v1(other_action,expected,next_command);
  ASSERT result->>'status' = 'conflict', 'stale competing action conflicts';
  result := public.set_lab_opening_v1(other_action,current_state->>'revision',command);
  ASSERT result->>'status' = 'conflict', 'command cannot change meaning';
  result := public.set_lab_opening_v1(action,current_state->>'revision',gen_random_uuid());
  ASSERT result->>'status' = 'unchanged' AND result->>'revision' = current_state->>'revision', 'same state has no duplicate event';
  result := public.set_lab_opening_v1(other_action,current_state->>'revision',next_command);
  ASSERT result->>'status' = 'applied', 'following transition applies';
  result := public.set_lab_opening_v1(action,expected,command);
  ASSERT result->>'status' = 'applied' AND (result->>'revision')::bigint = expected::bigint + 2, 'old retry returns current revision';
  result := public.set_lab_opening_v1('bad',expected,gen_random_uuid());
  ASSERT result->>'status' = 'invalid', 'invalid action rejected';
  result := public.set_lab_opening_v1(action,'9223372036854775808',gen_random_uuid());
  ASSERT result->>'status' = 'invalid', 'overflow rejected before cast';
  result := public.get_lab_opening_v1();
  ASSERT (result->>'revision')::bigint = expected::bigint + 2, 'only two transitions recorded';
END;
$transitions$;
RESET ROLE;
UPDATE idealab_private.lab_opening_permissions_v1 SET is_active = false WHERE user_id = auth.uid();
SET LOCAL ROLE authenticated;
DO $revoked$
DECLARE result jsonb;
BEGIN
  result := public.get_lab_opening_v1();
  ASSERT (result->>'can_manage')::boolean IS FALSE, 'revoked duty retains ordinary member read';
  result := public.set_lab_opening_v1('open',result->>'revision',gen_random_uuid());
  ASSERT result = '{"status":"denied"}'::jsonb, 'revoked capability cannot mutate';
END;
$revoked$;
RESET ROLE;
SELECT '16 isolated transition/retry/conflict/revocation assertions passed; all rolled back' AS result;
ROLLBACK;
