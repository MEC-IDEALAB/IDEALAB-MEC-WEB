-- Start after overlap_a holds its profile lock; verify blocking via pg_stat_activity.
-- This proves wait/release under rollback, NOT committed idempotency or head races.
BEGIN;
SET LOCAL application_name='idealab_intake_overlap_b';
SET LOCAL statement_timeout='20s';
SET LOCAL plpgsql.check_asserts=on;
DO $identity$ BEGIN
  IF (SELECT count(*) FROM idealab_private.lab_opening_permissions_v1 WHERE is_active)<>1 THEN RAISE EXCEPTION 'requires approved isolated identity'; END IF;
  PERFORM set_config('request.jwt.claim.sub',(SELECT user_id::text FROM idealab_private.lab_opening_permissions_v1 WHERE is_active),true);
END; $identity$;
SET LOCAL ROLE authenticated;
DO $submit$ DECLARE r jsonb; started timestamptz:=clock_timestamp(); BEGIN
  r:=public.submit_work_request_v1('{"kind":"machine","service_id":"cnc","title":"ROLLBACK overlap fixture B","description":"Managed overlap validation only; no work requested.","technical_details":"","preferred_at":null,"references":[]}', '814d9c1e-f47a-4a10-9fe9-901187de9042');
  ASSERT r->>'status'='submitted','second overlapping submission accepted after release';
  ASSERT clock_timestamp()-started>=interval '3 seconds','observed submission wait';
END; $submit$;
ROLLBACK;
SELECT 'Overlap B waited, accepted then rolled back' AS result;
