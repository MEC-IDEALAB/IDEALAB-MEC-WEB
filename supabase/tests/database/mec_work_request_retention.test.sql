-- Tests private retention helper with temporary new-domain rows only.
-- Does not delete any real profile or Auth account. All effects roll back.
BEGIN;
SET LOCAL plpgsql.check_asserts=on;
DO $retention$
DECLARE v_owner uuid; v_request uuid:=gen_random_uuid(); v_command uuid:=gen_random_uuid(); archive_before bigint; profile_before bigint; auth_before bigint; archived record; prior_ids uuid[];
BEGIN
  SELECT user_id INTO STRICT v_owner FROM idealab_private.mec_registration_collision_state_v1;
  IF EXISTS(SELECT 1 FROM idealab_private.work_requests_v1 q WHERE q.owner_id=v_owner) THEN RAISE EXCEPTION 'requires second test account with no request records'; END IF;
  SELECT count(*) INTO archive_before FROM idealab_private.work_request_archive_v1;
  SELECT coalesce(array_agg(archive_id),ARRAY[]::uuid[]) INTO prior_ids FROM idealab_private.work_request_archive_v1;
  SELECT count(*) INTO profile_before FROM public.users;
  SELECT count(*) INTO auth_before FROM auth.users;
  INSERT INTO idealab_private.work_requests_v1(id,owner_id,kind,service_id,title,description,technical_details,preferred_at,reference_links)
    VALUES(v_request,v_owner,'machine','cnc','PRIVATE RETENTION FIXTURE','Private temporary description must be removed','Private temporary technical text','2026-10-23T09:00:00+05:30','["https://example.com/private-fixture"]');
  INSERT INTO idealab_private.work_request_commands_v1(owner_id,command_id,payload,result)
    VALUES(v_owner,v_command,'{"private_payload":"temporary content must be removed"}',jsonb_build_object('status','submitted','request_id',v_request));
  INSERT INTO idealab_private.work_request_events_v1(request_id,revision,actor_id,command_id,status,recorded_at)
    VALUES(v_request,1,v_owner,v_command,'submitted','2026-09-30T20:00:00Z');
  PERFORM idealab_private.archive_work_requests_v1(v_owner);
  ASSERT NOT EXISTS(SELECT 1 FROM idealab_private.work_requests_v1 q WHERE q.owner_id=v_owner),'private request content removed';
  ASSERT NOT EXISTS(SELECT 1 FROM idealab_private.work_request_commands_v1 c WHERE c.owner_id=v_owner),'private retry payload removed';
  ASSERT NOT EXISTS(SELECT 1 FROM idealab_private.work_request_events_v1 e WHERE e.request_id=v_request),'identifiable event links removed';
  ASSERT (SELECT count(*) FROM idealab_private.work_request_archive_v1)=archive_before+1,'one anonymous archive record retained';
  SELECT * INTO STRICT archived FROM idealab_private.work_request_archive_v1 a WHERE NOT a.archive_id=ANY(prior_ids);
  ASSERT archived.archive_id<>v_request,'fresh archive ID does not preserve request reference';
  ASSERT archived.status='submitted' AND archived.history='[{"status":"submitted","month":"2026-10"}]','status and IST month retained without exact timestamp';
  ASSERT to_jsonb(archived)::text !~ 'PRIVATE|private-fixture|private_payload|description|technical|owner_id|actor_id|command_id|request_id|preferred_at|recorded_at','no identifying content or identifiers retained';
  PERFORM idealab_private.archive_work_requests_v1(v_owner);
  ASSERT (SELECT count(*) FROM idealab_private.work_request_archive_v1)=archive_before+1,'empty retry creates no duplicate archive';
  ASSERT (SELECT count(*) FROM public.users)=profile_before AND (SELECT count(*) FROM auth.users)=auth_before,'no profile or Auth account deleted';
END; $retention$;
ROLLBACK;
SELECT '9 work-request retention-helper assertions passed; all effects rolled back' AS result;
