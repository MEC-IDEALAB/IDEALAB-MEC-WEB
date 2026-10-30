-- Run only in approved isolated validation, concurrently with overlap_b.
-- Managed real-account SQL role; no Auth/profile mutation. All writes roll back.
BEGIN;
SET LOCAL application_name='idealab_intake_overlap_a';
SET LOCAL statement_timeout='20s';
SET LOCAL plpgsql.check_asserts=on;
DO $identity$ BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active)<>1 THEN RAISE EXCEPTION 'requires approved isolated identity'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active),true);
END; $identity$;
SET LOCAL ROLE authenticated;
DO $submit$ DECLARE r jsonb; BEGIN
  r:=public.submit_work_request_v1('{"kind":"machine","service_id":"cnc","title":"ROLLBACK overlap fixture A","description":"Managed overlap validation only; no work requested.","technical_details":"","preferred_at":null,"references":[]}', '814d9c1e-f47a-4a10-9fe9-901187de9041');
  ASSERT r->>'status'='submitted','first overlapping submission accepted';
  PERFORM pg_sleep(8);
END; $submit$;
ROLLBACK;
SELECT 'Overlap A accepted then rolled back' AS result;
