-- Run only against the isolated validation database, in a rollback transaction.
-- Existing identities supply authorization; synthetic request/receipt rows roll back.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
DO $setup$
DECLARE v_actor uuid; v_other uuid; v_request uuid := gen_random_uuid(); v_command uuid := gen_random_uuid(); v_cancel uuid := gen_random_uuid(); v_other_request uuid := gen_random_uuid(); v_other_command uuid := gen_random_uuid(); v_malformed uuid := gen_random_uuid();
BEGIN
  SELECT user_id INTO STRICT v_actor FROM idealab_private.lab_opening_permissions_v1 WHERE is_active;
  SELECT user_id INTO STRICT v_other FROM idealab_private.mec_registration_collision_state_v1;
  ASSERT v_actor <> v_other, 'distinct identities required';
  INSERT INTO idealab_private.work_requests_v1(id, owner_id, kind, service_id, title, description)
    VALUES (v_request, v_actor, 'machine', '3d-printing', 'ROLLBACK receipt test', 'Synthetic private receipt test fixture.'),
           (v_other_request, v_other, 'machine', '3d-printing', 'ROLLBACK other receipt', 'Synthetic private receipt test fixture.');
  INSERT INTO idealab_private.work_request_commands_v1(owner_id, command_id, payload, result)
    VALUES (v_actor, v_command, '{"action":"submit","intake":{"private":"not returned"}}', jsonb_build_object('status','submitted','request_id',v_request)),
           (v_actor, v_cancel, '{"action":"cancel"}', jsonb_build_object('status','cancelled','request_id',v_request)),
           (v_other, v_other_command, '{"action":"submit"}', jsonb_build_object('status','submitted','request_id',v_other_request)),
           (v_actor, v_malformed, '{"action":"submit"}', '{"status":"submitted","request_id":"not-a-uuid"}');
  PERFORM set_config('idealab_test.actor', v_actor::text, true);
  PERFORM set_config('idealab_test.other', v_other::text, true);
  PERFORM set_config('idealab_test.request', v_request::text, true);
  PERFORM set_config('idealab_test.command', v_command::text, true);
  PERFORM set_config('idealab_test.cancel', v_cancel::text, true);
  PERFORM set_config('idealab_test.other_command', v_other_command::text, true);
  PERFORM set_config('idealab_test.malformed', v_malformed::text, true);
END; $setup$;
DO $acl$
BEGIN
  ASSERT NOT has_function_privilege('anon','public.get_own_submit_receipt_v1(uuid)','EXECUTE'), 'anonymous execute denied';
  ASSERT NOT has_function_privilege('anon','idealab_private.get_own_submit_receipt_v1(uuid)','EXECUTE'), 'anonymous private execute denied';
  ASSERT has_function_privilege('authenticated','public.get_own_submit_receipt_v1(uuid)','EXECUTE'), 'authenticated wrapper granted';
  ASSERT NOT has_table_privilege('authenticated','idealab_private.work_request_commands_v1','SELECT'), 'receipt table denied';
END; $acl$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub', current_setting('idealab_test.actor'), true); END $$;
DO $owner$
DECLARE result jsonb;
BEGIN
  result := public.get_own_submit_receipt_v1(current_setting('idealab_test.command')::uuid);
  ASSERT result = jsonb_build_object('status','submitted','request_id',current_setting('idealab_test.request')::uuid), 'only owned receipt returned';
  ASSERT public.get_own_submit_receipt_v1(current_setting('idealab_test.cancel')::uuid) IS NULL, 'cancel not projected';
  ASSERT public.get_own_submit_receipt_v1(gen_random_uuid()) IS NULL, 'missing is unresolved';
  ASSERT public.get_own_submit_receipt_v1(NULL) IS NULL, 'null is unresolved';
  ASSERT public.get_own_submit_receipt_v1(current_setting('idealab_test.other_command')::uuid) IS NULL, 'other owner receipt denied';
  ASSERT public.get_own_submit_receipt_v1(current_setting('idealab_test.malformed')::uuid) IS NULL, 'malformed result unresolved';
END; $owner$;
DO $$ BEGIN PERFORM set_config('request.jwt.claim.sub', current_setting('idealab_test.other'), true); END $$;
DO $other$
BEGIN
  ASSERT public.get_own_submit_receipt_v1(current_setting('idealab_test.command')::uuid) IS NULL, 'other account sees no receipt';
END; $other$;
ROLLBACK;
SELECT 'Receipt lookup rollback checks completed' AS result;
