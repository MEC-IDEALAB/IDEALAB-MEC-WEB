-- Existing second real account, managed SQL-role context, outer rollback.
-- Proves admission guards, not positive cross-member/browser acceptance.
BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $identity$
BEGIN
  IF (SELECT count(*) FROM idealab_private.mec_registration_collision_state_v1)<>1 THEN RAISE EXCEPTION 'requires observed conflict account'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.mec_registration_collision_state_v1),true);
  PERFORM set_config('idealab_test.project_id',(SELECT id::text FROM public.projects ORDER BY created_at LIMIT 1),true);
END;
$identity$;
SET LOCAL ROLE authenticated;
DO $cases$
DECLARE denied boolean:=false;
BEGIN
  ASSERT (SELECT profile_completed AND NOT mec_admitted FROM public.get_own_profile_v1()),'complete profile is not admission';
  ASSERT NOT EXISTS(SELECT 1 FROM public.get_own_lab_visits_v1()),'no attendance projection';
  ASSERT public.check_in_lab_v1('Admission guard rollback test',gen_random_uuid())='{"status":"denied"}'::jsonb,'check-in denied';
  ASSERT public.check_out_lab_v1(gen_random_uuid(),gen_random_uuid())='{"status":"denied"}'::jsonb,'checkout denied';
  ASSERT public.set_lab_opening_v1('open','1',gen_random_uuid())='{"status":"denied"}'::jsonb,'duty transition denied';
  BEGIN PERFORM public.get_lab_opening_v1(); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'opening read denied'; denied:=false;
  BEGIN PERFORM public.get_projects_v1('discover','',NULL,NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'project discovery denied'; denied:=false;
  BEGIN PERFORM public.get_project_v1(current_setting('idealab_test.project_id')::uuid); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'actual other project detail denied'; denied:=false;
  BEGIN PERFORM public.get_own_project_requests_v1(); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  ASSERT denied,'join request list denied';
  ASSERT public.mutate_project_v1('{"kind":"create","title":"Not admitted","description":"Should not save","visibility":"public"}',gen_random_uuid())='{"status":"denied"}'::jsonb,'project create denied';
END;
$cases$;
RESET ROLE;
ROLLBACK;
SELECT '10 existing unadmitted-account admission-guard assertions passed' AS result;
