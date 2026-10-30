-- Isolated managed SQL-role fixture. All attendance/commands/opening changes
-- roll back; no Auth identities are created and no IDs/contact data output.
BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $fixture$
BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active) <> 1 THEN RAISE EXCEPTION 'requires one approved isolated test duty account'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active),true);
END;
$fixture$;
SET LOCAL ROLE authenticated;
DO $cases$
DECLARE s jsonb; r jsonb; first_id uuid; later_id uuid; count_before integer;
  in_command uuid:=gen_random_uuid(); unchanged_command uuid:=gen_random_uuid(); out_command uuid:=gen_random_uuid();
BEGIN
  SELECT count(*) INTO count_before FROM public.get_own_lab_visits_v1();
  IF count_before>17 OR EXISTS(SELECT 1 FROM public.get_own_lab_visits_v1() WHERE checkout_time IS NULL) THEN RAISE EXCEPTION 'requires bounded history with no active visit'; END IF;
  s:=public.get_lab_opening_v1();
  PERFORM public.set_lab_opening_v1('close',s->>'revision',gen_random_uuid());
  r:=public.check_in_lab_v1('Closed test',gen_random_uuid());
  ASSERT r='{"status":"closed"}'::jsonb, 'closed check-in blocked';
  ASSERT (SELECT count(*) FROM public.get_own_lab_visits_v1())=count_before, 'no attendance on closed attempt';
  s:=public.get_lab_opening_v1(); PERFORM public.set_lab_opening_v1('open',s->>'revision',gen_random_uuid());
  r:=public.check_in_lab_v1('Transactional isolated test',in_command); first_id:=(r->>'visit_id')::uuid;
  ASSERT r->>'status'='checked_in', 'open check-in applies';
  ASSERT (SELECT count(*) FROM public.get_own_lab_visits_v1() WHERE checkout_time IS NULL)=1, 'one active visit';
  ASSERT (SELECT purpose='Transactional isolated test' AND checkin_time IS NOT NULL FROM public.get_own_lab_visits_v1() WHERE id=first_id), 'purpose and server check-in saved';
  r:=public.check_in_lab_v1('Transactional isolated test',in_command);
  ASSERT r->>'status'='checked_in' AND (r->>'visit_id')::uuid=first_id, 'same command replays';
  r:=public.check_in_lab_v1('Different purpose',in_command); ASSERT r='{"status":"conflict"}'::jsonb, 'changed meaning conflicts';
  r:=public.check_in_lab_v1('Another intent',unchanged_command); ASSERT r->>'status'='already_in', 'new same-state command is recorded';
  ASSERT (SELECT count(*) FROM public.get_own_lab_visits_v1())=count_before+1, 'only one attendance created';
  s:=public.get_lab_opening_v1(); PERFORM public.set_lab_opening_v1('close',s->>'revision',gen_random_uuid());
  r:=public.check_in_lab_v1('Transactional isolated test',in_command); ASSERT r->>'status'='checked_in', 'old retry survives closure';
  r:=public.check_out_lab_v1(first_id,out_command); ASSERT r->>'status'='checked_out', 'checkout allowed after closure';
  ASSERT (SELECT checkout_time>=checkin_time FROM public.get_own_lab_visits_v1() WHERE id=first_id), 'chronological server checkout';
  r:=public.check_in_lab_v1('Another intent',unchanged_command); ASSERT r->>'status'='already_in', 'old unchanged retry creates no later visit';
  ASSERT (SELECT count(*) FROM public.get_own_lab_visits_v1() WHERE checkout_time IS NULL)=0, 'no accidental reopening';
  s:=public.get_lab_opening_v1(); PERFORM public.set_lab_opening_v1('open',s->>'revision',gen_random_uuid());
  r:=public.check_in_lab_v1('Later visit',gen_random_uuid()); later_id:=(r->>'visit_id')::uuid;
  ASSERT r->>'status'='checked_in' AND later_id<>first_id, 'later independent visit';
  r:=public.check_out_lab_v1(first_id,out_command); ASSERT r->>'status'='checked_out', 'old checkout replays exact target';
  ASSERT EXISTS(SELECT 1 FROM public.get_own_lab_visits_v1() WHERE id=later_id AND checkout_time IS NULL), 'later visit remains active';
  r:=public.check_out_lab_v1(later_id,out_command); ASSERT r='{"status":"conflict"}'::jsonb, 'changed checkout target conflicts';
  r:=public.check_out_lab_v1(gen_random_uuid(),gen_random_uuid()); ASSERT r='{"status":"conflict"}'::jsonb, 'unknown target generic';
  r:=public.check_in_lab_v1(E'\t\n ',gen_random_uuid()); ASSERT r='{"status":"invalid"}'::jsonb, 'blank purpose rejected';
  r:=public.check_in_lab_v1(repeat('x',1001),gen_random_uuid()); ASSERT r='{"status":"invalid"}'::jsonb, 'oversized purpose rejected';
  r:=public.check_in_lab_v1(E'a\001b',gen_random_uuid()); ASSERT r='{"status":"invalid"}'::jsonb, 'control purpose rejected';
END;
$cases$;
RESET ROLE;
UPDATE idealab_private.lab_opening_permissions_v1 SET is_active=false WHERE user_id=auth.uid();
SET LOCAL ROLE authenticated;
DO $ordinary_member$
DECLARE r jsonb; target uuid;
BEGIN
  ASSERT (public.get_lab_opening_v1()->>'can_manage')::boolean IS FALSE, 'ordinary member has no opening capability';
  SELECT id INTO STRICT target FROM public.get_own_lab_visits_v1() WHERE checkout_time IS NULL;
  r:=public.check_out_lab_v1(target,gen_random_uuid()); ASSERT r->>'status'='checked_out', 'ordinary member can checkout';
  r:=public.check_in_lab_v1('Ordinary member test',gen_random_uuid()); ASSERT r->>'status'='checked_in', 'opening duty not needed for member check-in';
END;
$ordinary_member$;
RESET ROLE;
SAVEPOINT inactive_member;
UPDATE public.users SET is_active=false WHERE id=auth.uid();
SET LOCAL ROLE authenticated;
DO $inactive$
BEGIN
  ASSERT public.check_in_lab_v1('Inactive test',gen_random_uuid())='{"status":"denied"}'::jsonb, 'inactive member cannot check in';
  ASSERT public.check_out_lab_v1(gen_random_uuid(),gen_random_uuid())='{"status":"denied"}'::jsonb, 'inactive member cannot check out';
END;
$inactive$;
RESET ROLE;
ROLLBACK TO SAVEPOINT inactive_member;
SELECT '27 own-visit transition/retry/member-state assertions passed; all rolled back' AS result;
ROLLBACK;
