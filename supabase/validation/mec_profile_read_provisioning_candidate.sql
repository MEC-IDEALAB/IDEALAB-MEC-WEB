-- LOCAL REVIEW CANDIDATE ONLY: never deploy this as a shared Grow migration.
-- Run in the approved EMPTY isolated PostgreSQL 17 project, inside BEGIN /
-- ROLLBACK, after the storage, commit-guard and verified-email helper candidates.
-- The verified-email helper must have been created in that same transaction.
-- No Auth identities, managed policies, roles or Auth grants are created/changed.
--
-- Fidelity: the first 19 columns/defaults/nullability and six existing constraints
-- reproduce docs/research/shared-profile-catalog-2026-10-21.json. The seventh
-- constraint fk_users_club is deliberately OMITTED: public.clubs and the rest of
-- the operational schema are absent. club_id stays nullable uuid. No club fixture,
-- backfill, operational tables or production migration parity is claimed. The
-- existing raw users_college_roll_key remains; normalized claims are separate.
-- The five added columns implement the approved six-field mapping/versioning;
-- required name/phone/registration already occupy three existing columns.
--
-- This is a PROFILE PROJECTION ONLY, not the final admission-bearing API.
-- No completion/save/claim transition/recovery/rate-limit or admission routine
-- exists here. Consumers must keep student workspace admission fail-closed.
-- Existing Auth identities are NOT backfilled. Real signup, conversion, retries,
-- existing-row preservation and deletion need separate genuine-account tests.
-- Provisioning intentionally blocks the Auth transaction on unexpected errors.
-- The privileged private trigger owner is the existing postgres role because
-- Auth is managed and public.users uses FORCE RLS. Confinement relies on the
-- reviewed fixed trigger body and ACL, not a least-privileged custom owner.

DO $candidate$
DECLARE
  v_role text;
  v_column record;
  v_allowed constant text[] := ARRAY[
    'id', 'name', 'phone', 'college_roll', 'institution', 'department',
    'study_year', 'role', 'is_active', 'profile_completed',
    'profile_contract_version', 'profile_revision'
  ];
BEGIN
  IF current_user <> 'postgres'
    OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999 THEN
    RAISE EXCEPTION 'profile validation requires existing postgres on PostgreSQL 17';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  ) OR pg_catalog.to_regtype('public.users') IS NOT NULL
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p
               WHERE p.pronamespace = 'public'::pg_catalog.regnamespace
                 AND p.proname = 'get_own_profile_v1')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p
               WHERE p.pronamespace = 'idealab_private'::pg_catalog.regnamespace
                 AND p.proname = 'provision_mec_profile_v1') THEN
    RAISE EXCEPTION 'requires empty public application schema and no conflicting profile objects';
  END IF;
  IF pg_catalog.to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL
    OR pg_catalog.to_regclass('idealab_private.mec_registration_claims_v1') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.enforce_no_committed_pending_mec_claim_v1()') IS NULL THEN
    RAISE EXCEPTION 'apply the reviewed isolated storage/guard/verified-email prerequisites first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    WHERE p.oid = 'idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure
      AND p.xmin::text::bigint = (pg_catalog.pg_current_xact_id()::text::numeric % 4294967296)::bigint
      AND p.proowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres')
      AND p.prosecdef AND p.prorettype = 'boolean'::pg_catalog.regtype
      AND p.proconfig = ARRAY['search_path=""']::text[]
  ) THEN
    RAISE EXCEPTION 'requires reviewed verified-email helper created in this same rollback transaction';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles
                 WHERE rolname = current_user AND rolbypassrls)
    OR NOT pg_catalog.has_schema_privilege(current_user, 'auth', 'USAGE')
    OR NOT pg_catalog.has_table_privilege(current_user, 'auth.users', 'TRIGGER')
    OR NOT pg_catalog.has_column_privilege(current_user, 'auth.users', 'id', 'REFERENCES') THEN
    RAISE EXCEPTION 'existing managed Auth privileges do not allow this isolated trigger/FK candidate';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
             WHERE tgrelid = 'auth.users'::pg_catalog.regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Auth already has user triggers; review interactions before adding provisioning';
  END IF;
  IF NOT pg_catalog.has_schema_privilege('authenticated', 'public', 'USAGE')
    OR NOT pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
    OR pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'CREATE')
    OR pg_catalog.has_schema_privilege('anon', 'idealab_private', 'USAGE,CREATE')
    OR pg_catalog.has_schema_privilege('service_role', 'idealab_private', 'USAGE,CREATE')
    OR NOT pg_catalog.has_function_privilege('authenticated', 'idealab_private.has_current_verified_email_v1()', 'EXECUTE') THEN
    RAISE EXCEPTION 'prerequisite effective schema/helper grants differ from the reviewed boundary';
  END IF;

  CREATE TABLE public.users (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    college_roll text,
    role text NOT NULL DEFAULT 'student'::text,
    club_id uuid,
    xp integer DEFAULT 0,
    level integer DEFAULT 1,
    reputation_score integer DEFAULT 100,
    qr_code_data text,
    fcm_token text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    profile_completed boolean DEFAULT false,
    avatar_url text,
    is_active boolean DEFAULT true,
    ban_reason text,
    banned_at timestamptz,
    institution text,
    department text,
    study_year smallint,
    profile_contract_version smallint NOT NULL DEFAULT 0,
    profile_revision bigint NOT NULL DEFAULT 0,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_college_roll_key UNIQUE (college_roll),
    CONSTRAINT users_qr_code_data_key UNIQUE (qr_code_data),
    CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['student'::text, 'lab_admin'::text, 'super_admin'::text])),
    CONSTRAINT users_study_year_check CHECK (study_year BETWEEN 1 AND 8),
    CONSTRAINT users_profile_contract_version_check CHECK (profile_contract_version >= 0),
    CONSTRAINT users_profile_revision_check CHECK (profile_revision >= 0)
  );
  COMMENT ON TABLE public.users IS
    'Isolated rollback-only profile candidate; omits club FK and operational dependencies, no admission or production parity.';
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
  CREATE POLICY users_verified_owner_read_v1 ON public.users
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()) AND (SELECT idealab_private.has_current_verified_email_v1()));

  REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated, service_role;
  -- Default column ACLs can differ from table ACLs. Remove both explicitly.
  FOR v_column IN SELECT a.attname FROM pg_catalog.pg_attribute AS a
                  WHERE a.attrelid = 'public.users'::pg_catalog.regclass
                    AND a.attnum > 0 AND NOT a.attisdropped LOOP
    EXECUTE pg_catalog.format(
      'REVOKE SELECT (%1$I), INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON public.users FROM PUBLIC, anon, authenticated, service_role',
      v_column.attname);
  END LOOP;
  GRANT SELECT (id, name, phone, college_roll, institution, department,
    study_year, role, is_active, profile_completed, profile_contract_version,
    profile_revision) ON public.users TO authenticated;

  EXECUTE $ddl$
    CREATE FUNCTION public.get_own_profile_v1()
    RETURNS TABLE (
      id uuid, name text, phone text, college_roll text, institution text,
      department text, study_year smallint, role text, is_active boolean,
      profile_completed boolean, profile_contract_version smallint,
      profile_revision bigint
    ) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
    AS $read$
      SELECT u.id, u.name, u.phone, u.college_roll, u.institution, u.department,
        u.study_year, u.role, u.is_active, u.profile_completed,
        u.profile_contract_version, u.profile_revision
      FROM public.users AS u WHERE u.id = (SELECT auth.uid());
    $read$;
  $ddl$;
  REVOKE ALL ON FUNCTION public.get_own_profile_v1() FROM PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.get_own_profile_v1() TO authenticated;
  COMMENT ON FUNCTION public.get_own_profile_v1() IS
    'Validation-only twelve-field own-profile projection, not final claim/admission-bearing API; missing row is not incomplete-profile success.';

  EXECUTE $ddl$
    CREATE FUNCTION idealab_private.provision_mec_profile_v1()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
    AS $provision$
    BEGIN
      IF TG_TABLE_SCHEMA <> 'auth' OR TG_TABLE_NAME <> 'users'
        OR TG_LEVEL <> 'ROW' OR TG_WHEN <> 'AFTER'
        OR TG_OP NOT IN ('INSERT', 'UPDATE') THEN
        RAISE EXCEPTION 'profile provisioning is restricted to its reviewed Auth row triggers';
      END IF;
      IF NEW.is_anonymous IS DISTINCT FROM false
        OR NEW.email IS NULL OR pg_catalog.btrim(NEW.email) = '' THEN
        RETURN NEW;
      END IF;
      IF TG_OP = 'UPDATE' THEN
        IF OLD.is_anonymous IS DISTINCT FROM true THEN
          RETURN NEW;
        END IF;
      END IF;
      -- Auth email is identity data, never role/eligibility evidence. An
      -- unconfirmed new row stays unreadable through verified-owner RLS.
      -- No editable metadata is read; an existing profile is never overwritten.
      INSERT INTO public.users (id, name, email, role, is_active,
        profile_completed, profile_contract_version, profile_revision)
      VALUES (NEW.id, '', NEW.email, 'student', true, false, 0, 0)
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $provision$;
  $ddl$;
  REVOKE ALL ON FUNCTION idealab_private.provision_mec_profile_v1()
    FROM PUBLIC, anon, authenticated, service_role;
  CREATE TRIGGER mec_profile_after_auth_insert_v1 AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION idealab_private.provision_mec_profile_v1();
  CREATE TRIGGER mec_profile_after_auth_conversion_v1
    AFTER UPDATE OF is_anonymous, email ON auth.users
    FOR EACH ROW WHEN (OLD.is_anonymous IS TRUE AND NEW.is_anonymous IS FALSE)
    EXECUTE FUNCTION idealab_private.provision_mec_profile_v1();

  -- Fail closed on inherited privileges; REVOKE alone is not a denial rule.
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF pg_catalog.has_table_privilege(v_role, 'public.users',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN
      RAISE EXCEPTION 'unexpected effective table privilege for API role %', v_role;
    END IF;
    FOR v_column IN SELECT a.attname FROM pg_catalog.pg_attribute AS a
                    WHERE a.attrelid = 'public.users'::pg_catalog.regclass
                      AND a.attnum > 0 AND NOT a.attisdropped LOOP
      IF pg_catalog.has_column_privilege(v_role, 'public.users', v_column.attname, 'INSERT,UPDATE,REFERENCES')
        OR pg_catalog.has_column_privilege(v_role, 'public.users', v_column.attname, 'SELECT')
           IS DISTINCT FROM (v_role = 'authenticated' AND v_column.attname = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'unexpected effective column privilege for API role %', v_role;
      END IF;
    END LOOP;
    IF pg_catalog.has_function_privilege(v_role, 'idealab_private.provision_mec_profile_v1()', 'EXECUTE')
      OR pg_catalog.has_function_privilege(v_role, 'public.get_own_profile_v1()', 'EXECUTE')
         IS DISTINCT FROM (v_role = 'authenticated') THEN
      RAISE EXCEPTION 'unexpected effective API routine privilege for role %', v_role;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p
    WHERE p.pronamespace = 'idealab_private'::pg_catalog.regnamespace
      AND ((p.oid <> 'idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure
            AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'))
        OR pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
        OR pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'private routine boundary unexpectedly widened';
  END IF;
END;
$candidate$;
