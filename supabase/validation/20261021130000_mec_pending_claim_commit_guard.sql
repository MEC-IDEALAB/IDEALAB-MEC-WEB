-- VALIDATION-ONLY follow-up for the approved Free project
-- idealab-mec-validation. This prevents transaction-local pending claims from
-- being committed before a future claim API is implemented.

DO $preflight$
DECLARE
  v_version integer;
  v_table_owner text;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'validation guard must run as postgres';
  END IF;

  v_version := pg_catalog.current_setting('server_version_num')::integer;
  IF v_version < 170000 OR v_version >= 180000 THEN
    RAISE EXCEPTION 'validation guard requires PostgreSQL 17';
  END IF;

  SELECT pg_catalog.pg_get_userbyid(c.relowner)
  INTO v_table_owner
  FROM pg_catalog.pg_class AS c
  WHERE c.oid = pg_catalog.to_regclass(
    'idealab_private.mec_registration_claims_v1'
  );

  IF v_table_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'expected the postgres-owned validation claim table';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM idealab_private.mec_registration_claims_v1 AS claim
    WHERE claim.claim_state = 'pending'
  ) THEN
    RAISE EXCEPTION 'resolve existing validation claims before adding commit guard';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS trigger_row
    WHERE trigger_row.tgrelid = pg_catalog.to_regclass(
      'idealab_private.mec_registration_claims_v1'
    )
      AND trigger_row.tgname =
        'mec_registration_claims_v1_no_pending_at_commit'
  ) THEN
    RAISE EXCEPTION 'validation commit guard already exists';
  END IF;
END;
$preflight$;

CREATE FUNCTION idealab_private.enforce_no_committed_pending_mec_claim_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_pending boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  EXECUTE pg_catalog.format(
    'SELECT EXISTS (
       SELECT 1 FROM %I.%I
       WHERE claim_id = $1 AND claim_state = $2
     )',
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME
  )
  INTO v_pending
  USING NEW.claim_id, 'pending';

  IF v_pending THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'pending MEC registration claim cannot remain at transaction end';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION
  idealab_private.enforce_no_committed_pending_mec_claim_v1()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE CONSTRAINT TRIGGER mec_registration_claims_v1_no_pending_at_commit
AFTER INSERT OR UPDATE OF claim_state
ON idealab_private.mec_registration_claims_v1
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION
  idealab_private.enforce_no_committed_pending_mec_claim_v1();

COMMENT ON FUNCTION
  idealab_private.enforce_no_committed_pending_mec_claim_v1() IS
  'Validation-only commit guard: every pending claim must be resolved in the same transaction.';
