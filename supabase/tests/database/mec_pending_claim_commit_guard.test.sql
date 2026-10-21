-- Database-only invariant tests. The temporary probe uses the installed
-- trigger function without inserting a synthetic Auth identity.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, public, extensions, idealab_private;

SELECT plan(5);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS trigger_row
    WHERE trigger_row.tgrelid =
      'idealab_private.mec_registration_claims_v1'::regclass
      AND trigger_row.tgname =
        'mec_registration_claims_v1_no_pending_at_commit'
      AND trigger_row.tgconstraint <> 0
      AND trigger_row.tgdeferrable
      AND trigger_row.tginitdeferred
  ),
  'persistent claim table has an initially deferred commit guard'
);

CREATE TEMP TABLE pending_claim_commit_probe (
  claim_id uuid PRIMARY KEY,
  claim_state text NOT NULL CHECK (claim_state IN ('current', 'pending'))
);

CREATE CONSTRAINT TRIGGER pending_claim_commit_probe_guard
AFTER INSERT OR UPDATE OF claim_state
ON pg_temp.pending_claim_commit_probe
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION
  idealab_private.enforce_no_committed_pending_mec_claim_v1();

CREATE FUNCTION pg_temp.resolve_pending_probe()
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  v_claim_id uuid := pg_catalog.gen_random_uuid();
BEGIN
  INSERT INTO pg_temp.pending_claim_commit_probe (claim_id, claim_state)
  VALUES (v_claim_id, 'pending');

  UPDATE pg_temp.pending_claim_commit_probe
  SET claim_state = 'current'
  WHERE claim_id = v_claim_id;

  SET CONSTRAINTS pending_claim_commit_probe_guard IMMEDIATE;
  RETURN true;
END;
$function$;

CREATE FUNCTION pg_temp.leave_pending_probe()
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO pg_temp.pending_claim_commit_probe (claim_id, claim_state)
  VALUES (pg_catalog.gen_random_uuid(), 'pending');

  SET CONSTRAINTS pending_claim_commit_probe_guard IMMEDIATE;
  RETURN true;
END;
$function$;

SELECT lives_ok(
  'SELECT pg_temp.resolve_pending_probe()',
  'pending may transition to current before transaction end'
);
SELECT is(
  (SELECT pg_catalog.count(*)::integer
   FROM pg_temp.pending_claim_commit_probe
   WHERE claim_state = 'current'),
  1,
  'resolved claim is current after the deferred check'
);
SELECT throws_ok(
  'SELECT pg_temp.leave_pending_probe()',
  '23514',
  NULL,
  'an unresolved pending claim fails the deferred check'
);
SELECT is(
  (SELECT pg_catalog.count(*)::integer
   FROM pg_temp.pending_claim_commit_probe
   WHERE claim_state = 'pending'),
  0,
  'failed pending insert is rolled back by the test savepoint'
);

SELECT * FROM finish(true);
ROLLBACK;
