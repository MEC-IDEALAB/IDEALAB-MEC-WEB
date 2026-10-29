-- Two existing real identities; no Auth/profile/claim changes or fake users.
-- The other owner's request is a managed SQL fixture, not a browser submission.
BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $fixture$
DECLARE v_actor uuid; v_other uuid; v_id uuid:=gen_random_uuid();
BEGIN
  SELECT user_id INTO STRICT v_actor FROM idealab_private.lab_opening_permissions_v1 WHERE is_active;
  SELECT user_id INTO STRICT v_other FROM idealab_private.mec_registration_collision_state_v1;
  ASSERT v_actor<>v_other,'two distinct existing identities';
  INSERT INTO idealab_private.work_requests_v1(id,owner_id,kind,service_id,title,description)
    VALUES(v_id,v_other,'operations','ics','ROLLBACK other-owner fixture','Temporary SQL-role privacy fixture only.');
  PERFORM set_config('request.jwt.claim.sub',v_actor::text,true);
  PERFORM set_config('idealab_test.other_request_id',v_id::text,true);
END; $fixture$;
SET LOCAL ROLE authenticated;
DO $cases$
DECLARE v_id uuid:=current_setting('idealab_test.other_request_id')::uuid;
BEGIN
  ASSERT public.get_own_work_request_v1(v_id) IS NULL,'admitted actor cannot read another owner request';
  ASSERT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.get_own_work_requests_v1(NULL,NULL)->'items') i WHERE i->>'id'=v_id::text),'own listing excludes other owner';
  ASSERT public.cancel_work_request_v1(v_id,'1',gen_random_uuid())='{"status":"denied"}'::jsonb,'admitted actor cannot cancel another owner request';
END; $cases$;
RESET ROLE;
DO $integrity$
BEGIN
  ASSERT (SELECT status='submitted' AND revision=1 FROM idealab_private.work_requests_v1 WHERE id=current_setting('idealab_test.other_request_id')::uuid),'cross-owner denial leaves request unchanged';
  ASSERT NOT EXISTS(SELECT 1 FROM idealab_private.work_request_events_v1 WHERE request_id=current_setting('idealab_test.other_request_id')::uuid),'cross-owner denial appends no event';
END; $integrity$;
ROLLBACK;
SELECT '6 admitted-caller owner-isolation assertions passed; managed rows rolled back' AS result;
