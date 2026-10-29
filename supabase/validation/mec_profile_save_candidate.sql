-- LOCAL ROLLBACK-ONLY REVIEW CANDIDATE. Not a shared Grow migration.
-- Requires identity/profile/admission candidates in this SAME outer transaction
-- in the approved isolated PG17 project, with no existing profile rows. No Auth
-- fixtures, managed Auth policies/roles/grants, provisioning or claim writes.
-- Prior omitted club FK/operational fidelity and activation gates still apply.
--
-- Collision threshold FIVE per FIFTEEN minutes is a TECHNICAL CANDIDATE, NOT
-- OWNER-APPROVED FOR PRODUCTION. Save and any future claim writer MUST lock the
-- same public.users row before using this shared UID-only timestamp state.
-- Only occupied raw-roll unique collisions consume the save limit; a changed
-- nonnull roll is throttled before probing uniqueness. No number/IP/UA is stored
-- in counter state and there is no availability endpoint. This limits one UID;
-- it does not prevent distributed guessing or prove registration ownership.
--
-- Save returns status + decimal-string revision, never profile/constraint data.
-- Full Auth, partial/full persistence, conflict, preservation, collision timing,
-- concurrency and genuine-account acceptance remain UNVERIFIED. The public read
-- still requires the independent stored self-declaration/claim for admission.

DO $candidate$
DECLARE
  v_tx bigint := (pg_catalog.pg_current_xact_id()::text::numeric % 4294967296)::bigint;
  v_role text;
  v_column record;
BEGIN
  IF current_user <> 'postgres'
    OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = current_user AND rolbypassrls) THEN
    RAISE EXCEPTION 'save validation requires existing postgres BYPASSRLS on PG17';
  END IF;
  IF pg_catalog.to_regclass('public.users') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.current_student_mec_admitted_v1()') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.normalize_mec_registration_v1(text)') IS NULL
    OR pg_catalog.to_regclass('idealab_private.mec_registration_claims_v1') IS NULL THEN
    RAISE EXCEPTION 'requires reviewed identity/profile/admission/storage prerequisites';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid = 'public.users'::pg_catalog.regclass
                 AND xmin::text::bigint = v_tx AND relrowsecurity AND relforcerowsecurity
                 AND relowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres'))
    OR EXISTS (SELECT 1 FROM public.users)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
               WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f') AND c.relname <> 'users')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc
               WHERE oid IN ('idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure,
                             'idealab_private.current_student_mec_admitted_v1()'::pg_catalog.regprocedure)
                 AND xmin::text::bigint <> v_tx) THEN
    RAISE EXCEPTION 'requires empty same-transaction isolated profile/admission candidates';
  END IF;
  IF pg_catalog.to_regclass('idealab_private.mec_registration_collision_state_v1') IS NOT NULL
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
               WHERE (n.nspname = 'public' AND p.proname = 'save_own_profile_v1')
                  OR (n.nspname = 'idealab_private' AND p.proname IN ('validate_required_profile_v1', 'save_current_profile_v1'))) THEN
    RAISE EXCEPTION 'save/collision objects already exist; inspect rather than replacing';
  END IF;
  IF NOT pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
    OR pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'CREATE')
    OR pg_catalog.has_schema_privilege('anon', 'idealab_private', 'USAGE,CREATE')
    OR pg_catalog.has_schema_privilege('service_role', 'idealab_private', 'USAGE,CREATE') THEN
    RAISE EXCEPTION 'unexpected effective private schema privileges';
  END IF;

  CREATE TABLE idealab_private.mec_registration_collision_state_v1 (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    collision_times timestamptz[] NOT NULL,
    CONSTRAINT mec_collision_bound_v1 CHECK (pg_catalog.cardinality(collision_times) BETWEEN 1 AND 5),
    CONSTRAINT mec_collision_no_null_v1 CHECK (pg_catalog.array_position(collision_times, NULL::timestamptz) IS NULL)
  );
  ALTER TABLE idealab_private.mec_registration_collision_state_v1 ENABLE ROW LEVEL SECURITY;
  ALTER TABLE idealab_private.mec_registration_collision_state_v1 FORCE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE idealab_private.mec_registration_collision_state_v1 FROM PUBLIC, anon, authenticated, service_role;
  REVOKE SELECT (user_id, collision_times), INSERT (user_id, collision_times),
    UPDATE (user_id, collision_times), REFERENCES (user_id, collision_times)
    ON idealab_private.mec_registration_collision_state_v1 FROM PUBLIC, anon, authenticated, service_role;

  EXECUTE $ddl$
    CREATE FUNCTION idealab_private.validate_required_profile_v1(p_profile jsonb, p_contract_version smallint)
    RETURNS TABLE (valid boolean, normalized jsonb, complete boolean)
    LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = ''
    AS $validate$
    DECLARE
      v_key text;
      v_text text;
      v_normalized jsonb := '{}'::jsonb;
      v_complete boolean;
    BEGIN
      IF p_contract_version IS NULL OR p_contract_version NOT IN (0, 1)
        OR pg_catalog.jsonb_typeof(p_profile) IS DISTINCT FROM 'object' THEN
        RETURN QUERY SELECT false, NULL::jsonb, false; RETURN;
      END IF;
      IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_profile)) <> 6
        OR NOT (p_profile ?& ARRAY['name', 'phone', 'college_roll', 'institution', 'department', 'study_year']) THEN
        RETURN QUERY SELECT false, NULL::jsonb, false; RETURN;
      END IF;
      FOREACH v_key IN ARRAY ARRAY['name', 'phone', 'college_roll', 'institution', 'department'] LOOP
        IF pg_catalog.jsonb_typeof(p_profile -> v_key) = 'null' AND v_key <> 'name' THEN
          v_normalized := v_normalized || pg_catalog.jsonb_build_object(v_key, NULL::text);
          CONTINUE;
        END IF;
        IF pg_catalog.jsonb_typeof(p_profile -> v_key) IS DISTINCT FROM 'string' THEN
          RETURN QUERY SELECT false, NULL::jsonb, false; RETURN;
        END IF;
        v_text := p_profile ->> v_key;
        IF v_text ~ '[[:cntrl:]]' THEN
          RETURN QUERY SELECT false, NULL::jsonb, false; RETURN;
        END IF;
        IF v_key = 'college_roll' THEN
          -- Normalize for validation/comparison, but preserve nonempty display.
          IF pg_catalog.char_length(idealab_private.normalize_mec_registration_v1(v_text)) > 64 THEN
            RETURN QUERY SELECT false, NULL::jsonb, false; RETURN;
          END IF;
          IF idealab_private.normalize_mec_registration_v1(v_text) = '' THEN v_text := NULL; END IF;
        ELSE
          v_text := pg_catalog.regexp_replace(v_text, '^[[:space:]]+|[[:space:]]+$', '', 'g');
          IF v_key <> 'name' AND v_text = '' THEN v_text := NULL; END IF;
          IF (v_key IN ('name', 'department') AND pg_catalog.char_length(v_text) > 120)
            OR (v_key = 'institution' AND (pg_catalog.char_length(v_text) > 200 OR v_text <> 'Model Engineering College'))
            OR (v_key = 'phone' AND v_text !~ '^[+][1-9][0-9]{1,14}$') THEN
            RETURN QUERY SELECT false, NULL::jsonb, false; RETURN;
          END IF;
        END IF;
        v_normalized := v_normalized || pg_catalog.jsonb_build_object(v_key, v_text);
      END LOOP;
      IF pg_catalog.jsonb_typeof(p_profile -> 'study_year') = 'null' THEN
        v_normalized := v_normalized || '{"study_year":null}'::jsonb;
      ELSIF pg_catalog.jsonb_typeof(p_profile -> 'study_year') = 'number'
        AND (p_profile ->> 'study_year') ~ '^[1-8]$' THEN
        v_normalized := v_normalized || pg_catalog.jsonb_build_object('study_year', (p_profile ->> 'study_year')::smallint);
      ELSE
        RETURN QUERY SELECT false, NULL::jsonb, false; RETURN;
      END IF;
      v_complete := (v_normalized ->> 'name') <> ''
        AND (v_normalized ->> 'phone') IS NOT NULL AND (v_normalized ->> 'college_roll') IS NOT NULL
        AND (v_normalized ->> 'institution') IS NOT NULL AND (v_normalized ->> 'department') IS NOT NULL
        AND (v_normalized ->> 'study_year') IS NOT NULL;
      IF p_contract_version = 1 AND NOT v_complete THEN
        RETURN QUERY SELECT false, NULL::jsonb, false; RETURN;
      END IF;
      RETURN QUERY SELECT true, v_normalized, v_complete;
    END;
    $validate$;
  $ddl$;
  REVOKE ALL ON FUNCTION idealab_private.validate_required_profile_v1(jsonb, smallint)
    FROM PUBLIC, anon, authenticated, service_role;

  EXECUTE $ddl$
    CREATE FUNCTION idealab_private.save_current_profile_v1(p_profile jsonb, p_expected_revision text)
    RETURNS TABLE (status text, profile_revision text)
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
    AS $save$
    DECLARE
      v_uid uuid := auth.uid();
      v_user public.users%ROWTYPE;
      v_valid record;
      v_now timestamptz;
      v_times timestamptz[];
      v_changed_roll boolean;
      v_constraint text;
      v_next bigint;
    BEGIN
      IF v_uid IS NULL OR NOT idealab_private.has_current_verified_email_v1() THEN
        RETURN QUERY SELECT 'verification_required'::text, NULL::text; RETURN;
      END IF;
      SELECT u.* INTO v_user FROM public.users AS u WHERE u.id = v_uid FOR UPDATE;
      IF NOT FOUND THEN RETURN QUERY SELECT 'unavailable'::text, NULL::text; RETURN; END IF;
      v_now := pg_catalog.clock_timestamp(); -- capture AFTER any own-row lock wait
      IF v_user.is_active IS DISTINCT FROM true THEN
        RETURN QUERY SELECT 'inactive'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF v_user.profile_contract_version IS NULL OR v_user.profile_contract_version NOT IN (0, 1)
        OR v_user.profile_revision IS NULL OR v_user.profile_revision < 0 THEN
        RETURN QUERY SELECT 'unavailable'::text, NULL::text; RETURN;
      END IF;
      IF p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$' THEN
        RETURN QUERY SELECT 'invalid'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF p_expected_revision::numeric > 9223372036854775807 THEN
        RETURN QUERY SELECT 'invalid'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF p_expected_revision::bigint <> v_user.profile_revision THEN
        RETURN QUERY SELECT 'conflict'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF v_user.profile_revision = 9223372036854775807 THEN
        RETURN QUERY SELECT 'unavailable'::text, v_user.profile_revision::text; RETURN;
      END IF;
      SELECT * INTO v_valid FROM idealab_private.validate_required_profile_v1(p_profile, v_user.profile_contract_version);
      IF NOT v_valid.valid THEN
        RETURN QUERY SELECT 'invalid'::text, v_user.profile_revision::text; RETURN;
      END IF;
      v_changed_roll := (v_valid.normalized ->> 'college_roll') IS DISTINCT FROM v_user.college_roll;
      IF v_changed_roll AND EXISTS (SELECT 1 FROM idealab_private.mec_registration_claims_v1 AS c
                                    WHERE c.user_id = v_uid AND c.claim_state = 'current') THEN
        RETURN QUERY SELECT 'claim_transition_required'::text, v_user.profile_revision::text; RETURN;
      END IF;
      SELECT COALESCE(pg_catalog.array_agg(t.at ORDER BY t.at), ARRAY[]::timestamptz[]) INTO v_times
      FROM idealab_private.mec_registration_collision_state_v1 AS s
      CROSS JOIN LATERAL pg_catalog.unnest(s.collision_times) AS t(at)
      WHERE s.user_id = v_uid AND t.at > v_now - interval '15 minutes';
      IF pg_catalog.cardinality(v_times) = 0 THEN
        DELETE FROM idealab_private.mec_registration_collision_state_v1 AS s WHERE s.user_id = v_uid;
      ELSE
        UPDATE idealab_private.mec_registration_collision_state_v1 AS s SET collision_times = v_times WHERE s.user_id = v_uid;
      END IF;
      IF v_changed_roll AND (v_valid.normalized ->> 'college_roll') IS NOT NULL
        AND pg_catalog.cardinality(v_times) >= 5 THEN
        RETURN QUERY SELECT 'not_saved'::text, v_user.profile_revision::text; RETURN;
      END IF;
      v_next := v_user.profile_revision + 1;
      BEGIN
        UPDATE public.users AS u SET
          name = v_valid.normalized ->> 'name', phone = v_valid.normalized ->> 'phone',
          college_roll = v_valid.normalized ->> 'college_roll', institution = v_valid.normalized ->> 'institution',
          department = v_valid.normalized ->> 'department', study_year = (v_valid.normalized ->> 'study_year')::smallint,
          profile_completed = v_valid.complete, profile_contract_version = CASE WHEN v_valid.complete THEN 1 ELSE 0 END,
          profile_revision = v_next
        WHERE u.id = v_uid;
      EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
        IF v_constraint = 'users_college_roll_key' AND v_changed_roll
          AND (v_valid.normalized ->> 'college_roll') IS NOT NULL THEN
          INSERT INTO idealab_private.mec_registration_collision_state_v1 AS s (user_id, collision_times)
          VALUES (v_uid, pg_catalog.array_append(v_times, v_now))
          ON CONFLICT (user_id) DO UPDATE SET collision_times = EXCLUDED.collision_times;
        END IF;
        RETURN QUERY SELECT 'not_saved'::text, v_user.profile_revision::text; RETURN;
      END;
      RETURN QUERY SELECT 'saved'::text, v_next::text;
    END;
    $save$;
  $ddl$;
  REVOKE ALL ON FUNCTION idealab_private.save_current_profile_v1(jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION idealab_private.save_current_profile_v1(jsonb, text) TO authenticated;
  EXECUTE $ddl$
    CREATE FUNCTION public.save_own_profile_v1(p_profile jsonb, p_expected_revision text)
    RETURNS TABLE (status text, profile_revision text)
    LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
    AS $wrapper$
      SELECT result.status, result.profile_revision
      FROM idealab_private.save_current_profile_v1(p_profile, p_expected_revision) AS result;
    $wrapper$;
  $ddl$;
  REVOKE ALL ON FUNCTION public.save_own_profile_v1(jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.save_own_profile_v1(jsonb, text) TO authenticated;

  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF pg_catalog.has_table_privilege(v_role, 'idealab_private.mec_registration_collision_state_v1',
      'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN
      RAISE EXCEPTION 'unexpected effective collision-state table privilege';
    END IF;
    FOR v_column IN SELECT attname FROM pg_catalog.pg_attribute
                    WHERE attrelid = 'idealab_private.mec_registration_collision_state_v1'::pg_catalog.regclass
                      AND attnum > 0 AND NOT attisdropped LOOP
      IF pg_catalog.has_column_privilege(v_role, 'idealab_private.mec_registration_collision_state_v1',
        v_column.attname, 'SELECT,INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'unexpected effective collision-state column privilege';
      END IF;
    END LOOP;
    IF pg_catalog.has_function_privilege(v_role, 'public.save_own_profile_v1(jsonb,text)', 'EXECUTE')
      IS DISTINCT FROM (v_role = 'authenticated') THEN
      RAISE EXCEPTION 'unexpected effective save-wrapper privilege';
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS p WHERE p.pronamespace = 'idealab_private'::pg_catalog.regnamespace
      AND ((p.oid NOT IN ('idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure,
                         'idealab_private.current_student_mec_admitted_v1()'::pg_catalog.regprocedure,
                         'idealab_private.save_current_profile_v1(jsonb,text)'::pg_catalog.regprocedure)
            AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'))
        OR pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
        OR pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE'))
  ) OR NOT pg_catalog.has_function_privilege('authenticated', 'idealab_private.save_current_profile_v1(jsonb,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'unexpected effective private routine privileges';
  END IF;
END;
$candidate$;
