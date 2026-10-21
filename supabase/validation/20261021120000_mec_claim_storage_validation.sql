-- VALIDATION-ONLY prototype for the owner-approved Free project
-- idealab-mec-validation. This is not a production or shared Grow migration.
-- It intentionally requires an empty public application schema so it fails
-- closed if someone points it at the populated Grow project.

DO $preflight$
DECLARE
  v_version integer;
  v_private_owner text;
  v_provider text;
  v_deterministic boolean;
  v_locale text;
  v_recorded_version text;
  v_actual_version text;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'validation candidate must run as postgres so scoped default ACLs apply to the intended owner';
  END IF;

  v_version := pg_catalog.current_setting('server_version_num')::integer;
  IF v_version < 170000 OR v_version >= 180000 THEN
    RAISE EXCEPTION 'validation candidate requires PostgreSQL 17; found %',
      pg_catalog.current_setting('server_version');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_namespace AS n
    WHERE n.nspname = 'idealab_private'
  ) THEN
    RAISE EXCEPTION 'expected the pre-created idealab_private validation schema';
  END IF;

  SELECT pg_catalog.pg_get_userbyid(n.nspowner)
  INTO v_private_owner
  FROM pg_catalog.pg_namespace AS n
  WHERE n.nspname = 'idealab_private';

  IF v_private_owner <> 'postgres' THEN
    RAISE EXCEPTION 'idealab_private must be owned by postgres in this validation project';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND c.relname !~ '^pg_'
  ) THEN
    RAISE EXCEPTION 'validation candidate requires an empty public application schema';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    WHERE c.relnamespace = 'idealab_private'::pg_catalog.regnamespace
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  ) OR EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    WHERE p.pronamespace = 'idealab_private'::pg_catalog.regnamespace
  ) THEN
    RAISE EXCEPTION 'validation candidate requires an empty idealab_private application namespace';
  END IF;

  SELECT
    c.collprovider::text,
    c.collisdeterministic,
    c.colllocale,
    c.collversion,
    pg_catalog.pg_collation_actual_version(c.oid)
  INTO
    v_provider,
    v_deterministic,
    v_locale,
    v_recorded_version,
    v_actual_version
  FROM pg_catalog.pg_collation AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.collnamespace
  WHERE n.nspname = 'idealab_private'
    AND c.collname = 'mec_registration_ci';

  IF NOT FOUND
    OR v_provider <> 'i'
    OR v_deterministic
    OR v_locale <> 'und-u-ks-level2'
    OR v_recorded_version IS DISTINCT FROM v_actual_version THEN
    RAISE EXCEPTION 'the reviewed MEC ICU case-insensitive collation is absent or stale';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION 'expected Supabase anon and authenticated roles';
  END IF;
END;
$preflight$;

-- API roles do not receive access to the private claim namespace. The default
-- ACLs are scoped to this new schema so later private objects stay closed too.
REVOKE ALL ON SCHEMA idealab_private FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA idealab_private
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA idealab_private
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA idealab_private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

CREATE FUNCTION idealab_private.normalize_mec_registration_v1(p_display_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = ''
AS $function$
  SELECT pg_catalog.btrim(
    pg_catalog.regexp_replace(p_display_value, '[[:space:]]+', ' ', 'g')
  );
$function$;
REVOKE ALL ON FUNCTION idealab_private.normalize_mec_registration_v1(text)
  FROM PUBLIC, anon, authenticated;

CREATE TABLE idealab_private.mec_registration_claims_v1 (
  claim_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_value text NOT NULL,
  normalized_value text COLLATE idealab_private.mec_registration_ci
    GENERATED ALWAYS AS (
      idealab_private.normalize_mec_registration_v1(display_value)
    ) STORED,
  claim_state text NOT NULL CHECK (claim_state IN ('current', 'pending')),
  attested_at timestamptz NOT NULL,
  attestation_version integer NOT NULL CHECK (attestation_version > 0),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT mec_registration_claims_v1_nonempty_display
    CHECK (
      idealab_private.normalize_mec_registration_v1(display_value) <> ''
    )
);

CREATE UNIQUE INDEX mec_registration_claims_v1_normalized_uidx
  ON idealab_private.mec_registration_claims_v1 (normalized_value);
CREATE UNIQUE INDEX mec_registration_claims_v1_one_current_per_user_uidx
  ON idealab_private.mec_registration_claims_v1 (user_id)
  WHERE claim_state = 'current';
CREATE UNIQUE INDEX mec_registration_claims_v1_one_pending_per_user_uidx
  ON idealab_private.mec_registration_claims_v1 (user_id)
  WHERE claim_state = 'pending';

ALTER TABLE idealab_private.mec_registration_claims_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.mec_registration_claims_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE idealab_private.mec_registration_claims_v1
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE idealab_private.mec_registration_claims_v1 IS
  'Isolated validation storage prototype only; no API, admission decision, or production rollout.';
COMMENT ON COLUMN idealab_private.mec_registration_claims_v1.display_value IS
  'Original registration text, preserved separately from normalized comparison.';
COMMENT ON COLUMN idealab_private.mec_registration_claims_v1.normalized_value IS
  'Generated whitespace-normalized value compared with the reviewed MEC ICU collation.';
