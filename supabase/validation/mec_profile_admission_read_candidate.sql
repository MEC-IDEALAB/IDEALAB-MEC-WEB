-- LOCAL REVIEW CANDIDATE ONLY. Never deploy to shared Grow as a migration.
-- Apply after the reviewed identity and profile/provisioning candidates in the
-- SAME outer BEGIN/ROLLBACK in the approved isolated PG17 project. No Auth rows,
-- grants/policies/roles, profile/claim writes or provisioning changes occur here.
-- The profile candidate still omits club FK and operational-schema fidelity.
--
-- This extends the validation projection to thirteen fields: the twelve prior
-- fields, with profile_revision now a decimal TEXT string, plus mec_admitted.
-- Existing twelve-field RPC consumers must be updated together before activation.
-- Admission is current caller-only, self-declared MEC eligibility; it does NOT
-- prove registration ownership against college records or confer staff powers.
-- The technical six-field bounds are the reviewed proposal's bounds, not a
-- complete official MEC prefix/course regex. No save/claim writer, recovery,
-- save limits, operational authorization or production rollout is implemented.
-- Genuine verified Student/staff/claim integration cases remain unverified.

DO $candidate$
DECLARE
  v_tx bigint := (pg_catalog.pg_current_xact_id()::text::numeric % 4294967296)::bigint;
BEGIN
  IF current_user <> 'postgres'
    OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = current_user AND rolbypassrls) THEN
    RAISE EXCEPTION 'admission validation requires existing postgres BYPASSRLS on PG17';
  END IF;
  IF pg_catalog.to_regclass('public.users') IS NULL
    OR pg_catalog.to_regprocedure('public.get_own_profile_v1()') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.normalize_mec_registration_v1(text)') IS NULL
    OR pg_catalog.to_regclass('idealab_private.mec_registration_claims_v1') IS NULL THEN
    RAISE EXCEPTION 'requires reviewed identity/profile/claim-storage prerequisites';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc
             WHERE pronamespace = 'idealab_private'::pg_catalog.regnamespace
               AND proname = 'current_student_mec_admitted_v1') THEN
    RAISE EXCEPTION 'admission predicate already exists; do not replace an authority boundary';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class WHERE oid = 'public.users'::pg_catalog.regclass
      AND xmin::text::bigint = v_tx AND relowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres')
      AND relrowsecurity AND relforcerowsecurity
  ) OR EXISTS (SELECT 1 FROM public.users) THEN
    RAISE EXCEPTION 'requires empty forced-RLS profile table created in this same rollback transaction';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc WHERE oid = 'public.get_own_profile_v1()'::pg_catalog.regprocedure
      AND xmin::text::bigint = v_tx AND NOT prosecdef AND provolatile = 's'
      AND proconfig = ARRAY['search_path=""']::text[] AND pronargs = 0
      AND proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres')
      AND proargnames = ARRAY['id', 'name', 'phone', 'college_roll', 'institution', 'department',
        'study_year', 'role', 'is_active', 'profile_completed', 'profile_contract_version', 'profile_revision']::text[]
      AND proallargtypes = ARRAY['uuid'::pg_catalog.regtype, 'text'::pg_catalog.regtype,
        'text'::pg_catalog.regtype, 'text'::pg_catalog.regtype, 'text'::pg_catalog.regtype,
        'text'::pg_catalog.regtype, 'smallint'::pg_catalog.regtype, 'text'::pg_catalog.regtype,
        'boolean'::pg_catalog.regtype, 'boolean'::pg_catalog.regtype,
        'smallint'::pg_catalog.regtype, 'bigint'::pg_catalog.regtype]::oid[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc WHERE oid = 'idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure
      AND xmin::text::bigint = v_tx AND prosecdef AND proconfig = ARRAY['search_path=""']::text[]
      AND proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres')
  ) THEN
    RAISE EXCEPTION 'requires unchanged reviewed twelve-field RPC and helper from this same transaction';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_collation WHERE oid = 'idealab_private.mec_registration_ci'::pg_catalog.regcollation
      AND collprovider = 'i' AND NOT collisdeterministic AND colllocale = 'und-u-ks-level2'
      AND collversion IS NOT DISTINCT FROM pg_catalog.pg_collation_actual_version(oid)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid = 'idealab_private.mec_registration_claims_v1'::pg_catalog.regclass
      AND attname = 'normalized_value' AND attgenerated = 's'
      AND attcollation = 'idealab_private.mec_registration_ci'::pg_catalog.regcollation
  ) THEN
    RAISE EXCEPTION 'requires the reviewed generated claim comparison column and current ICU collation';
  END IF;
  IF NOT pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
    OR pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'CREATE')
    OR pg_catalog.has_schema_privilege('anon', 'idealab_private', 'USAGE,CREATE')
    OR pg_catalog.has_schema_privilege('service_role', 'idealab_private', 'USAGE,CREATE') THEN
    RAISE EXCEPTION 'private schema effective privileges differ from reviewed prerequisites';
  END IF;

  EXECUTE $ddl$
    CREATE FUNCTION idealab_private.current_student_mec_admitted_v1()
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
    AS $admission$
      SELECT EXISTS (
        SELECT 1 FROM public.users AS u
        JOIN idealab_private.mec_registration_claims_v1 AS c ON c.user_id = u.id
        WHERE u.id = (SELECT auth.uid())
          AND (SELECT idealab_private.has_current_verified_email_v1())
          AND u.role = 'student' AND u.is_active IS TRUE
          AND u.profile_contract_version = 1 AND u.profile_completed IS TRUE
          AND pg_catalog.char_length(pg_catalog.regexp_replace(u.name,
            '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 1 AND 120
          AND u.name !~ '[[:cntrl:]]'
          AND u.phone ~ '^[+][1-9][0-9]{1,14}$'
          AND u.phone !~ '[[:cntrl:]]'
          AND pg_catalog.char_length(idealab_private.normalize_mec_registration_v1(u.college_roll)) BETWEEN 1 AND 64
          AND u.college_roll !~ '[[:cntrl:]]'
          AND u.institution = 'Model Engineering College'
          AND pg_catalog.char_length(u.institution) BETWEEN 1 AND 200
          AND pg_catalog.char_length(pg_catalog.regexp_replace(u.department,
            '^[[:space:]]+|[[:space:]]+$', '', 'g')) BETWEEN 1 AND 120
          AND u.department !~ '[[:cntrl:]]'
          AND u.study_year BETWEEN 1 AND 8
          AND c.claim_state = 'current' AND c.attestation_version = 1
          AND c.attested_at IS NOT NULL AND c.attested_at <= pg_catalog.statement_timestamp()
          AND pg_catalog.char_length(idealab_private.normalize_mec_registration_v1(c.display_value)) BETWEEN 1 AND 64
          AND c.display_value !~ '[[:cntrl:]]'
          AND c.normalized_value = idealab_private.normalize_mec_registration_v1(u.college_roll)
            COLLATE idealab_private.mec_registration_ci
      );
    $admission$;
  $ddl$;
  REVOKE ALL ON FUNCTION idealab_private.current_student_mec_admitted_v1()
    FROM PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION idealab_private.current_student_mec_admitted_v1() TO authenticated;

  -- A different return type requires DROP/CREATE, guarded above to affect only
  -- our newly created same-transaction projection. No CASCADE or table grants.
  DROP FUNCTION public.get_own_profile_v1();
  EXECUTE $ddl$
    CREATE FUNCTION public.get_own_profile_v1()
    RETURNS TABLE (
      id uuid, name text, phone text, college_roll text, institution text,
      department text, study_year smallint, role text, is_active boolean,
      profile_completed boolean, profile_contract_version smallint,
      profile_revision text, mec_admitted boolean
    ) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
    AS $read$
      SELECT u.id, u.name, u.phone, u.college_roll, u.institution, u.department,
        u.study_year, u.role, u.is_active, u.profile_completed,
        u.profile_contract_version, u.profile_revision::text,
        (SELECT idealab_private.current_student_mec_admitted_v1())
      FROM public.users AS u WHERE u.id = (SELECT auth.uid());
    $read$;
  $ddl$;
  REVOKE ALL ON FUNCTION public.get_own_profile_v1() FROM PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.get_own_profile_v1() TO authenticated;
  COMMENT ON FUNCTION public.get_own_profile_v1() IS
    'Validation-only own profile with decimal-string revision and current self-declared MEC admission boolean; not production activated.';

  IF NOT pg_catalog.has_function_privilege('authenticated', 'idealab_private.current_student_mec_admitted_v1()', 'EXECUTE')
    OR NOT pg_catalog.has_function_privilege('authenticated', 'public.get_own_profile_v1()', 'EXECUTE')
    OR pg_catalog.has_function_privilege('anon', 'public.get_own_profile_v1()', 'EXECUTE')
    OR pg_catalog.has_function_privilege('service_role', 'public.get_own_profile_v1()', 'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc AS p WHERE p.pronamespace = 'idealab_private'::pg_catalog.regnamespace
        AND ((p.oid NOT IN ('idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure,
                           'idealab_private.current_student_mec_admitted_v1()'::pg_catalog.regprocedure)
              AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'))
          OR pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
          OR pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE'))
    ) THEN
    RAISE EXCEPTION 'unexpected effective admission/profile routine privileges';
  END IF;
END;
$candidate$;
