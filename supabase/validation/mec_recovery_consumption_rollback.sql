-- Validation only. Run inside a transaction before accepting recovery traffic.
-- Retained receipts require a reviewed recovery plan.
LOCK TABLE idealab_private.recovery_session_consumptions_v1 IN ACCESS EXCLUSIVE MODE;
DO $recovery_rollback$
BEGIN
  IF EXISTS (SELECT FROM idealab_private.recovery_session_consumptions_v1) THEN
    RAISE EXCEPTION 'Retained recovery receipts require a recovery plan';
  END IF;
END;
$recovery_rollback$;
DROP FUNCTION public.consume_recovery_session_v1(uuid, uuid);
DROP FUNCTION idealab_private.consume_recovery_session_v1(uuid, uuid);
DROP TABLE idealab_private.recovery_session_consumptions_v1;
