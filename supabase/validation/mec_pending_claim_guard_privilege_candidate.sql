-- Isolated validation delta for the observed authenticated deferred-check 42501.
-- Does not insert, edit or attest a claim. Apply and test in one outer transaction.
DO $candidate$
BEGIN
  IF current_user <> 'postgres'
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid='idealab_private.enforce_no_committed_pending_mec_claim_v1()'::regprocedure
        AND pg_catalog.pg_get_userbyid(p.proowner)='postgres' AND NOT p.prosecdef
        AND pg_catalog.md5(p.prosrc)='a9863d0bc61b88509100274abb1787ad')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t
      WHERE t.tgrelid='idealab_private.mec_registration_claims_v1'::regclass
        AND t.tgname='mec_registration_claims_v1_no_pending_at_commit'
        AND t.tgfoid='idealab_private.enforce_no_committed_pending_mec_claim_v1()'::regprocedure
        AND t.tgdeferrable AND t.tginitdeferred AND t.tgenabled='O' AND t.tgtype=21)
    OR EXISTS (SELECT 1 FROM idealab_private.mec_registration_claims_v1 WHERE claim_state='pending') THEN
    RAISE EXCEPTION 'commit-guard delta requires the exact reviewed isolated invoker baseline with no pending claim';
  END IF;
  EXECUTE $ddl$
    CREATE OR REPLACE FUNCTION idealab_private.enforce_no_committed_pending_mec_claim_v1()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
    AS $guard$
    BEGIN
      IF TG_TABLE_SCHEMA <> 'idealab_private'
        OR TG_TABLE_NAME <> 'mec_registration_claims_v1'
        OR TG_NAME <> 'mec_registration_claims_v1_no_pending_at_commit'
        OR TG_LEVEL <> 'ROW' OR TG_WHEN <> 'AFTER'
        OR TG_OP NOT IN ('INSERT','UPDATE') THEN
        RAISE EXCEPTION 'MEC claim commit guard requires its exact internal trigger';
      END IF;
      -- Deferred events can run after the caller-scoped definer RPC returns.
      -- Read only this fixed private table as its owner; never grant client
      -- SELECT and never interpret the trigger attachment as a table name.
      IF EXISTS (SELECT 1 FROM idealab_private.mec_registration_claims_v1 c
                 WHERE c.claim_id=NEW.claim_id AND c.claim_state='pending') THEN
        RAISE EXCEPTION USING ERRCODE='23514',
          MESSAGE='pending MEC registration claim cannot remain at transaction end';
      END IF;
      RETURN NEW;
    END;
    $guard$;
  $ddl$;
  REVOKE ALL ON FUNCTION idealab_private.enforce_no_committed_pending_mec_claim_v1()
    FROM PUBLIC, anon, authenticated, service_role;
  COMMENT ON FUNCTION idealab_private.enforce_no_committed_pending_mec_claim_v1() IS
    'Validation-only fixed-target definer commit guard; pending claims cannot remain at transaction end; no client execution.';
END;
$candidate$;
