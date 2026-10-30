-- REAL ACCOUNT ACCEPTANCE ONLY. No fabricated Auth rows or production copy.
-- Set idealab.test.verified_user_id to an owner-approved, genuinely confirmed
-- isolated Auth account UUID privately before running. No address/UUID in source.
-- SQL role/GUC instrumentation does not prove signed-JWT/Data API integration.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, extensions;
DO $fixture$
DECLARE
  v_fixture uuid;
BEGIN
  v_fixture := NULLIF(pg_catalog.current_setting('idealab.test.verified_user_id', true), '')::uuid;
  IF v_fixture IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_fixture
      AND is_anonymous IS FALSE AND email IS NOT NULL
      AND pg_catalog.btrim(email) <> '' AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'provide an approved real verified identity from the isolated test project';
  END IF;
END;
$fixture$;
SELECT plan(1);
GRANT USAGE ON SCHEMA extensions TO authenticated;
DO $verified_claims$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', current_setting('idealab.test.verified_user_id'), true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('idealab.test.verified_user_id'))::text, true);
END;
$verified_claims$;
SET LOCAL ROLE authenticated;
SELECT is(idealab_private.has_current_verified_email_v1(), true, 'the approved real verified caller satisfies the predicate');
RESET ROLE;
SELECT * FROM finish(true);
ROLLBACK;
