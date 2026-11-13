-- Isolated only. Entire script rolls back. Uses the single explicitly assigned
-- existing verified test owner as a SQL-role fixture, not a browser login proof.
-- No Auth identity or attendance fixture is created; no IDs/contact data output.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
DO $fixture$
DECLARE core uuid; peer uuid; marker text := 'lab-close-transition-fixture';
BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active) <> 1 THEN
    RAISE EXCEPTION 'requires exactly one approved active isolated test duty assignment';
  END IF;
  IF to_regclass('public.lab_sessions') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid='public.lab_sessions'::regclass
      AND attname='checkout_time' AND atttypid='timestamptz'::regtype AND attnum>0 AND NOT attisdropped)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid='public.lab_sessions'::regclass
      AND attname='checkin_time' AND atttypid='timestamptz'::regtype AND attnum>0 AND NOT attisdropped)
    OR EXISTS (SELECT 1 FROM public.lab_sessions) THEN
    RAISE EXCEPTION 'requires an empty isolated Grow-compatible lab_sessions table';
  END IF;
  SELECT user_id INTO STRICT core FROM idealab_private.lab_opening_permissions_v1 WHERE is_active;
  SELECT id INTO STRICT peer FROM public.users
    WHERE id<>core AND is_active IS TRUE AND role IN ('lab_admin','super_admin') ORDER BY id LIMIT 1;
  INSERT INTO public.lab_sessions(user_id,checkin_time,checkout_time,purpose,created_at)
  VALUES
    (core,clock_timestamp()-interval '15 minutes',NULL,marker || ':core',clock_timestamp()),
    (peer,clock_timestamp()-interval '12 minutes',NULL,marker || ':peer',clock_timestamp());
  PERFORM set_config('request.jwt.claim.sub', core::text, true);
  PERFORM set_config('test.lab_opening.revision', (SELECT revision::text FROM idealab_private.lab_opening_state_v1 WHERE singleton = 1), true);
  PERFORM set_config('test.lab_opening.change_count', (SELECT count(*)::text FROM idealab_private.lab_opening_changes_v1), true);
END;
$fixture$;
DO $ban_fixture$
BEGIN
  UPDATE auth.users SET banned_until = statement_timestamp() + interval '1 hour'
    WHERE id = current_setting('request.jwt.claim.sub')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'isolated assigned Auth user is missing'; END IF;
END;
$ban_fixture$;
SET LOCAL ROLE authenticated;
DO $active_ban$
DECLARE denied boolean := false; result jsonb;
BEGIN
  BEGIN
    PERFORM public.get_lab_opening_v1();
    RAISE EXCEPTION 'Active Auth ban was allowed to read the lab status';
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  ASSERT denied, 'active Auth ban blocks status reads';
  result := public.set_lab_opening_v1('open',current_setting('test.lab_opening.revision'),gen_random_uuid());
  ASSERT result = '{"status":"denied"}'::jsonb, 'active Auth ban blocks state changes';
END;
$active_ban$;
RESET ROLE;
DO $ban_no_mutation$
BEGIN
  ASSERT (SELECT revision::text FROM idealab_private.lab_opening_state_v1 WHERE singleton = 1)
    = current_setting('test.lab_opening.revision'), 'banned write leaves global revision unchanged';
  ASSERT (SELECT count(*)::text FROM idealab_private.lab_opening_changes_v1)
    = current_setting('test.lab_opening.change_count'), 'banned write leaves history unchanged';
END;
$ban_no_mutation$;
UPDATE auth.users SET banned_until = statement_timestamp() - interval '1 second'
  WHERE id = current_setting('request.jwt.claim.sub')::uuid;
SET LOCAL ROLE authenticated;
DO $transitions$
DECLARE initial jsonb; result jsonb; current_state jsonb; expected text; action text; other_action text;
  command uuid := gen_random_uuid(); next_command uuid := gen_random_uuid();
  close_revision bigint; close_time timestamptz; closed_sessions integer;
BEGIN
  initial := public.get_lab_opening_v1(); expected := initial->>'revision';
  ASSERT (initial->>'can_manage')::boolean, 'explicit duty owner can manage';
  ASSERT (initial->>'revision') = current_setting('test.lab_opening.revision'), 'expired Auth ban preserves member access';
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
  IF other_action = 'close' THEN
    close_revision := (result->>'revision')::bigint;
    current_state := public.get_lab_opening_v1();
    close_time := (current_state->'changes'->0->>'occurred_at')::timestamptz;
    SELECT count(*) INTO closed_sessions FROM public.lab_sessions
      WHERE purpose='lab-close-transition-fixture:core'
        AND checkout_time=close_time;
    ASSERT closed_sessions=1, 'Lab close checks out the caller session at the recorded closure timestamp';
    result := public.set_lab_opening_v1('close',current_state->>'revision',next_command);
    ASSERT result->>'status'='applied' AND result->>'revision'=close_revision::text,
      'lost-response close retry returns the same closure revision';
    PERFORM set_config('test.lab_opening.close_revision',close_revision::text,true);
    PERFORM set_config('test.lab_opening.close_time',close_time::text,true);
  END IF;
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
DO $close_audit_assertions$
DECLARE close_revision bigint := current_setting('test.lab_opening.close_revision')::bigint;
  close_time timestamptz := current_setting('test.lab_opening.close_time')::timestamptz;
BEGIN
  ASSERT (SELECT count(*)=1 FROM idealab_private.lab_opening_changes_v1 AS change WHERE change.action='close'),
    'duplicate close retry records no second closure';
  ASSERT (SELECT count(*)=2 FROM public.lab_sessions
    WHERE purpose IN ('lab-close-transition-fixture:core','lab-close-transition-fixture:peer')
      AND checkout_time=close_time), 'duplicate close retry does not change checkout time';
  ASSERT (SELECT count(*)=0 FROM public.lab_sessions
    WHERE purpose IN ('lab-close-transition-fixture:core','lab-close-transition-fixture:peer')
      AND checkout_time IS NULL), 'closure leaves no active fixture sessions';
  ASSERT EXISTS (SELECT 1 FROM idealab_private.lab_opening_changes_v1 AS change
    WHERE change.revision=close_revision AND change.action='close' AND change.occurred_at=close_time),
    'saved closure timestamp remains exact in the audit record';
END;
$close_audit_assertions$;
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
SELECT '27 isolated transition/Auth-ban/retry/conflict/revocation assertions passed; all rolled back' AS result;
ROLLBACK;
