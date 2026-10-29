-- LOCAL REVIEW CANDIDATE ONLY. Not a deployable/shared Grow migration.
-- auth.users has RLS enabled. Supabase's postgres role cannot grant USAGE
-- on the managed auth schema, so a custom four-column reader cannot resolve it.
-- Use the existing postgres owner for this fixed caller-only boolean boundary.
-- This owner is privileged: confinement depends on the reviewed body/ACL, not
-- on a least-privileged role. No Auth policy, role, grant or row is changed.
-- Next profile-API building block: a caller-scoped verified-email predicate.
-- Requires the existing isolated claim-storage/commit-guard slice, PostgreSQL
-- 17 and an empty public application schema. It creates no Auth identities,
-- profile table, provisioning trigger, claim writer or member admission rule.
-- In particular, a true result proves neither MEC eligibility nor activation.
--
-- All DDL/grants/revocations are inside one DO statement: either the complete
-- reviewed ACL chain becomes visible together, or the entire statement rolls
-- back. The EXECUTE body below is fixed migration text, never caller input.
-- No global default privileges or Supabase-managed Auth policies are changed.
-- Before any approved execution, separately verify idealab_private is absent
-- from the target's exposed Data API schema configuration.

DO $candidate$
DECLARE
  v_version integer;
  v_owner text;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'validation identity predicate requires the postgres maintenance role';
  END IF;

  v_version := pg_catalog.current_setting('server_version_num')::integer;
  IF v_version < 170000 OR v_version >= 180000 THEN
    RAISE EXCEPTION 'validation identity predicate requires PostgreSQL 17';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND c.relname !~ '^pg_'
  ) THEN
    RAISE EXCEPTION 'validation identity predicate requires an empty public application schema';
  END IF;

  SELECT pg_catalog.pg_get_userbyid(n.nspowner) INTO v_owner
  FROM pg_catalog.pg_namespace AS n WHERE n.nspname = 'idealab_private';
  IF v_owner IS DISTINCT FROM 'postgres'
    OR pg_catalog.to_regclass('idealab_private.mec_registration_claims_v1') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.enforce_no_committed_pending_mec_claim_v1()') IS NULL THEN
    RAISE EXCEPTION 'expected the existing isolated private claim-storage and commit-guard slice';
  END IF;

  IF pg_catalog.to_regclass('auth.users') IS NULL
    OR pg_catalog.to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'expected Supabase Auth objects; do not fabricate Auth tables or identities';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = current_user AND rolbypassrls
  ) THEN
    RAISE EXCEPTION 'maintenance role requires existing BYPASSRLS privilege';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute AS a
      WHERE a.attrelid = 'auth.users'::pg_catalog.regclass
        AND a.attnum > 0 AND NOT a.attisdropped
        AND a.attname IN ('id', 'email', 'email_confirmed_at', 'is_anonymous')) <> 4 THEN
    RAISE EXCEPTION 'expected the reviewed current Auth identity columns';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'expected Supabase API roles';
  END IF;

  IF pg_catalog.to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NOT NULL THEN
    RAISE EXCEPTION 'identity predicate already exists; inspect it rather than replacing authority';
  END IF;

  IF NOT pg_catalog.has_schema_privilege('postgres', 'auth', 'USAGE')
    OR NOT pg_catalog.has_column_privilege('postgres', 'auth.users', 'id', 'SELECT')
    OR NOT pg_catalog.has_column_privilege('postgres', 'auth.users', 'email', 'SELECT')
    OR NOT pg_catalog.has_column_privilege('postgres', 'auth.users', 'email_confirmed_at', 'SELECT')
    OR NOT pg_catalog.has_column_privilege('postgres', 'auth.users', 'is_anonymous', 'SELECT')
    OR NOT pg_catalog.has_function_privilege('postgres', 'auth.uid()', 'EXECUTE') THEN
    RAISE EXCEPTION 'maintenance owner lacks the existing Auth read chain';
  END IF;

  EXECUTE $ddl$
    CREATE FUNCTION idealab_private.has_current_verified_email_v1()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $identity$
      SELECT EXISTS (
        SELECT 1
        FROM auth.users AS identity_row
        WHERE identity_row.id = (SELECT auth.uid())
          AND identity_row.is_anonymous IS FALSE
          AND identity_row.email IS NOT NULL
          AND pg_catalog.btrim(identity_row.email) <> ''
          AND identity_row.email_confirmed_at IS NOT NULL
      );
    $identity$;
  $ddl$;

  REVOKE ALL ON FUNCTION idealab_private.has_current_verified_email_v1()
    FROM PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION idealab_private.has_current_verified_email_v1()
    TO authenticated;
  COMMENT ON FUNCTION idealab_private.has_current_verified_email_v1() IS
    'Isolated validation-only current caller email-verification predicate; no profile completion, MEC admission or operational authority.';

  -- The schema must stay absent from exposed Data API schemas. USAGE permits
  -- this exact helper in future verified-owner RLS; it is not table access.
  -- Do not make a previously unreachable, default-PUBLIC-executable routine
  -- callable as a side effect of adding USAGE. Future private routines also
  -- require their own creation-transaction revoke/grant review.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    WHERE p.pronamespace = 'idealab_private'::pg_catalog.regnamespace
      AND (
        (p.oid <> 'idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure
          AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'))
        OR pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
        OR pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
      )
  ) THEN
    RAISE EXCEPTION 'private namespace contains unexpected effective API-role routine execution; review before adding schema usage';
  END IF;

  REVOKE ALL ON SCHEMA idealab_private FROM PUBLIC, anon, service_role;
  REVOKE CREATE ON SCHEMA idealab_private FROM authenticated;
  GRANT USAGE ON SCHEMA idealab_private TO authenticated;

  -- Explicit revokes do not override privileges inherited from another role.
  -- Verify the effective schema boundary before this atomic statement commits.
  IF NOT pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
    OR pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'CREATE')
    OR pg_catalog.has_schema_privilege('anon', 'idealab_private', 'USAGE,CREATE')
    OR pg_catalog.has_schema_privilege('service_role', 'idealab_private', 'USAGE,CREATE') THEN
    RAISE EXCEPTION 'unexpected effective API-role schema privileges';
  END IF;

  IF pg_catalog.has_function_privilege('anon', 'idealab_private.has_current_verified_email_v1()', 'EXECUTE')
    OR pg_catalog.has_function_privilege('service_role', 'idealab_private.has_current_verified_email_v1()', 'EXECUTE')
    OR (SELECT pg_catalog.pg_get_userbyid(p.proowner) FROM pg_catalog.pg_proc AS p
        WHERE p.oid = 'idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure) <> 'postgres' THEN
    RAISE EXCEPTION 'unexpected predicate owner or inherited API execution';
  END IF;
END;
$candidate$;
