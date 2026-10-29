-- LOCAL ROLLBACK-ONLY REVIEW CANDIDATE: never a production/shared migration.
-- Requires reviewed identity/profile/admission/save candidates from this SAME
-- outer transaction in the approved isolated PG17 project, with empty users.
-- Existing private claim storage may persist; no Auth identities are fabricated.
-- No managed Auth policy/role/grant, provisioning or existing function is changed.
-- The retained club-FK/operational fidelity and coordinated activation gaps remain.
--
-- Self-declaration v1 means: I currently attend Model Engineering College and
-- this registration number was issued to me. This records the caller's statement,
-- not college-record verification, ownership proof, staff authority or attendance.
-- Prefix validation requires MDL/LMDL, case-insensitively; the rest is bounded
-- display text, NOT an exhaustive official year/course/suffix format validator.
-- A 4096-code-point raw-input resource cap runs before normalization/regex;
-- accepted inputs still preserve whitespace/display semantics within that cap.
-- No claim withdrawal, staff reassignment or disputed-ownership repair endpoint.
--
-- Uses the save candidate's shared UID collision array and same users-row lock.
-- Owner-approved limit: FIVE collisions/FIFTEEN minutes. Every failed
-- raw-unique lookup, INCLUDING normalized-equivalent display edits, consumes the
-- limit: retaining raw users_college_roll_key otherwise creates an unbounded
-- occupancy oracle. Successful display edits consume no collision; exact retries
-- write nothing and bypass the limit. Changed display edits can be throttled
-- before their raw uniqueness lookup while five collisions remain live.
--
-- Atomic inner subtransaction contains reservation, old-claim deletion, promotion
-- and profile/revision update. Any raw-unique failure rolls that entire swap back
-- BEFORE recording its timestamp. Forced IMMEDIATE pending-guard mode safely
-- returns not_claimed with the old claim/profile intact; no constraint mode is
-- changed. Normal Data API transactions use the existing initially-deferred guard.
-- Real identity, persistence, retries, collisions and concurrency need separate
-- genuine-account acceptance. A claimed response must be followed by own-profile
-- reread; no potentially stale same-statement admission boolean is returned.

DO $candidate$
DECLARE
  v_tx bigint := (pg_catalog.pg_current_xact_id()::text::numeric % 4294967296)::bigint;
  v_role text;
BEGIN
  IF current_user <> 'postgres'
    OR pg_catalog.current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = current_user AND rolbypassrls) THEN
    RAISE EXCEPTION 'claim validation requires existing postgres BYPASSRLS on PG17';
  END IF;
  IF pg_catalog.to_regclass('public.users') IS NULL
    OR pg_catalog.to_regclass('idealab_private.mec_registration_claims_v1') IS NULL
    OR pg_catalog.to_regclass('idealab_private.mec_registration_collision_state_v1') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.current_student_mec_admitted_v1()') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.validate_required_profile_v1(jsonb,smallint)') IS NULL
    OR pg_catalog.to_regprocedure('idealab_private.save_current_profile_v1(jsonb,text)') IS NULL THEN
    RAISE EXCEPTION 'requires reviewed identity/profile/admission/save/storage prerequisites';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid = 'public.users'::pg_catalog.regclass
                 AND xmin::text::bigint = v_tx AND relrowsecurity AND relforcerowsecurity
                 AND relowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres'))
    OR EXISTS (SELECT 1 FROM public.users)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
               WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f') AND c.relname <> 'users')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc
               WHERE oid IN ('idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure,
                             'idealab_private.current_student_mec_admitted_v1()'::pg_catalog.regprocedure,
                             'idealab_private.validate_required_profile_v1(jsonb,smallint)'::pg_catalog.regprocedure,
                             'idealab_private.save_current_profile_v1(jsonb,text)'::pg_catalog.regprocedure)
                 AND xmin::text::bigint <> v_tx)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class
                    WHERE oid = 'idealab_private.mec_registration_collision_state_v1'::pg_catalog.regclass
                      AND xmin::text::bigint = v_tx AND relrowsecurity AND relforcerowsecurity) THEN
    RAISE EXCEPTION 'requires empty same-transaction isolated profile/save candidates';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
               WHERE (n.nspname = 'public' AND p.proname = 'claim_mec_registration_v1')
                  OR (n.nspname = 'idealab_private' AND p.proname IN ('validate_mec_claim_display_v1', 'claim_current_mec_registration_v1'))) THEN
    RAISE EXCEPTION 'claim functions already exist; inspect rather than replacing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
                 WHERE tgrelid = 'idealab_private.mec_registration_claims_v1'::pg_catalog.regclass
                   AND tgname = 'mec_registration_claims_v1_no_pending_at_commit'
                   AND tgdeferrable AND tginitdeferred AND tgenabled = 'O'
                   AND tgfoid = 'idealab_private.enforce_no_committed_pending_mec_claim_v1()'::pg_catalog.regprocedure)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_collation
                    WHERE oid = 'idealab_private.mec_registration_ci'::pg_catalog.regcollation
                      AND collprovider = 'i' AND NOT collisdeterministic AND colllocale = 'und-u-ks-level2'
                      AND collversion IS NOT DISTINCT FROM pg_catalog.pg_collation_actual_version(oid))
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_index
                    WHERE indexrelid = 'idealab_private.mec_registration_claims_v1_normalized_uidx'::pg_catalog.regclass
                      AND indrelid = 'idealab_private.mec_registration_claims_v1'::pg_catalog.regclass
                      AND indisunique AND indisvalid AND indpred IS NULL) THEN
    RAISE EXCEPTION 'requires reviewed pending guard, normalized uniqueness and current ICU comparison';
  END IF;
  IF NOT pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
    OR pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'CREATE')
    OR pg_catalog.has_schema_privilege('anon', 'idealab_private', 'USAGE,CREATE')
    OR pg_catalog.has_schema_privilege('service_role', 'idealab_private', 'USAGE,CREATE') THEN
    RAISE EXCEPTION 'unexpected effective private schema privileges';
  END IF;

  EXECUTE $ddl$
    CREATE FUNCTION idealab_private.validate_mec_claim_display_v1(p_display_number text)
    RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = ''
    AS $validate$
      SELECT CASE WHEN p_display_number IS NULL
        OR pg_catalog.char_length(p_display_number) > 4096 THEN false
      ELSE COALESCE(
        pg_catalog.char_length(idealab_private.normalize_mec_registration_v1(p_display_number)) BETWEEN 1 AND 64
        AND p_display_number !~ '[[:cntrl:]]'
        AND idealab_private.normalize_mec_registration_v1(p_display_number) ~* '^(LMDL|MDL)', false) END;
    $validate$;
  $ddl$;
  REVOKE ALL ON FUNCTION idealab_private.validate_mec_claim_display_v1(text) FROM PUBLIC, anon, authenticated, service_role;

  EXECUTE $ddl$
    CREATE FUNCTION idealab_private.claim_current_mec_registration_v1(
      p_display_number text, p_expected_revision text, p_self_declaration boolean)
    RETURNS TABLE (status text, profile_revision text)
    LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
    AS $claim$
    DECLARE
      v_uid uuid := auth.uid();
      v_user public.users%ROWTYPE;
      v_current idealab_private.mec_registration_claims_v1%ROWTYPE;
      v_has_current boolean;
      v_valid record;
      v_now timestamptz;
      v_times timestamptz[];
      v_same_normalized boolean := false;
      v_collision boolean := false;
      v_constraint text;
      v_pending_id uuid;
      v_next bigint;
    BEGIN
      IF v_uid IS NULL OR NOT idealab_private.has_current_verified_email_v1() THEN
        RETURN QUERY SELECT 'verification_required'::text, NULL::text; RETURN;
      END IF;
      SELECT u.* INTO v_user FROM public.users AS u WHERE u.id = v_uid FOR UPDATE;
      IF NOT FOUND THEN RETURN QUERY SELECT 'unavailable'::text, NULL::text; RETURN; END IF;
      v_now := pg_catalog.clock_timestamp();
      IF v_user.is_active IS DISTINCT FROM true THEN
        RETURN QUERY SELECT 'inactive'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF v_user.role IS DISTINCT FROM 'student'
        OR v_user.profile_contract_version IS NULL OR v_user.profile_contract_version NOT IN (0, 1)
        OR v_user.profile_revision IS NULL OR v_user.profile_revision < 0 THEN
        RETURN QUERY SELECT 'unavailable'::text, NULL::text; RETURN;
      END IF;
      IF p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
        OR p_expected_revision ~ '[^0-9]' THEN
        RETURN QUERY SELECT 'invalid'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF p_expected_revision::numeric > 9223372036854775807
        OR p_self_declaration IS DISTINCT FROM true
        OR NOT idealab_private.validate_mec_claim_display_v1(p_display_number) THEN
        RETURN QUERY SELECT 'invalid'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF v_user.profile_contract_version <> 1 OR v_user.profile_completed IS DISTINCT FROM true
        OR v_user.institution IS DISTINCT FROM 'Model Engineering College' THEN
        RETURN QUERY SELECT 'profile_required'::text, v_user.profile_revision::text; RETURN;
      END IF;
      SELECT * INTO v_valid FROM idealab_private.validate_required_profile_v1(pg_catalog.jsonb_build_object(
        'name', v_user.name, 'phone', v_user.phone, 'college_roll', v_user.college_roll,
        'institution', v_user.institution, 'department', v_user.department, 'study_year', v_user.study_year), 1::smallint);
      IF NOT v_valid.valid OR NOT v_valid.complete THEN
        RETURN QUERY SELECT 'profile_required'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF EXISTS (SELECT 1 FROM idealab_private.mec_registration_claims_v1 AS c
                  WHERE c.user_id = v_uid AND c.claim_state = 'pending') THEN
        RETURN QUERY SELECT 'unavailable'::text, v_user.profile_revision::text; RETURN;
      END IF;
      SELECT c.* INTO v_current FROM idealab_private.mec_registration_claims_v1 AS c
        WHERE c.user_id = v_uid AND c.claim_state = 'current';
      v_has_current := FOUND;
      IF v_has_current THEN
        IF v_current.attestation_version <> 1 OR v_current.attested_at IS NULL OR v_current.attested_at > v_now
          OR NOT idealab_private.validate_mec_claim_display_v1(v_current.display_value)
          OR v_current.normalized_value IS DISTINCT FROM
            idealab_private.normalize_mec_registration_v1(v_user.college_roll) COLLATE idealab_private.mec_registration_ci THEN
          RETURN QUERY SELECT 'unavailable'::text, v_user.profile_revision::text; RETURN;
        END IF;
        v_same_normalized := v_current.normalized_value =
          idealab_private.normalize_mec_registration_v1(p_display_number) COLLATE idealab_private.mec_registration_ci;
        IF v_same_normalized AND v_current.display_value = p_display_number AND v_user.college_roll = p_display_number THEN
          -- Narrow lost-response retry exception: all authority/profile/claim
          -- checks and revision representation validation already passed.
          RETURN QUERY SELECT 'claimed'::text, v_user.profile_revision::text; RETURN;
        END IF;
      END IF;
      IF p_expected_revision::bigint <> v_user.profile_revision THEN
        RETURN QUERY SELECT 'conflict'::text, v_user.profile_revision::text; RETURN;
      END IF;
      IF v_user.profile_revision = 9223372036854775807 THEN
        RETURN QUERY SELECT 'unavailable'::text, v_user.profile_revision::text; RETURN;
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
      IF pg_catalog.cardinality(v_times) >= 5 THEN
        RETURN QUERY SELECT 'not_claimed'::text, v_user.profile_revision::text; RETURN;
      END IF;
      v_next := v_user.profile_revision + 1;
      BEGIN
        IF v_same_normalized THEN
          UPDATE idealab_private.mec_registration_claims_v1 AS c SET display_value = p_display_number
            WHERE c.claim_id = v_current.claim_id AND c.user_id = v_uid AND c.claim_state = 'current';
        ELSE
          INSERT INTO idealab_private.mec_registration_claims_v1
            (user_id, display_value, claim_state, attested_at, attestation_version)
          VALUES (v_uid, p_display_number, 'pending', v_now, 1)
          ON CONFLICT (normalized_value) DO NOTHING RETURNING claim_id INTO v_pending_id;
          IF NOT FOUND THEN
            v_collision := true;
          ELSE
            IF v_has_current THEN
              DELETE FROM idealab_private.mec_registration_claims_v1 AS c
                WHERE c.claim_id = v_current.claim_id AND c.user_id = v_uid AND c.claim_state = 'current';
            END IF;
            UPDATE idealab_private.mec_registration_claims_v1 AS c SET claim_state = 'current'
              WHERE c.claim_id = v_pending_id AND c.user_id = v_uid AND c.claim_state = 'pending';
          END IF;
        END IF;
        IF NOT v_collision THEN
          UPDATE public.users AS u SET college_roll = p_display_number, profile_revision = v_next WHERE u.id = v_uid;
        END IF;
      EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
        IF v_constraint IN ('users_college_roll_key', 'mec_registration_claims_v1_normalized_uidx') THEN
          v_collision := true;
        ELSE
          RETURN QUERY SELECT 'not_claimed'::text, v_user.profile_revision::text; RETURN;
        END IF;
      WHEN check_violation THEN
        -- Includes a caller-forced IMMEDIATE pending guard. The entire inner
        -- swap is rolled back before returning; no occupied-number inference.
        RETURN QUERY SELECT 'not_claimed'::text, v_user.profile_revision::text; RETURN;
      END;
      IF v_collision THEN
        INSERT INTO idealab_private.mec_registration_collision_state_v1 (user_id, collision_times)
          VALUES (v_uid, pg_catalog.array_append(v_times, v_now))
          ON CONFLICT (user_id) DO UPDATE SET collision_times = EXCLUDED.collision_times;
        RETURN QUERY SELECT 'not_claimed'::text, v_user.profile_revision::text; RETURN;
      END IF;
      RETURN QUERY SELECT 'claimed'::text, v_next::text;
    END;
    $claim$;
  $ddl$;
  REVOKE ALL ON FUNCTION idealab_private.claim_current_mec_registration_v1(text,text,boolean) FROM PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION idealab_private.claim_current_mec_registration_v1(text,text,boolean) TO authenticated;
  EXECUTE $ddl$
    CREATE FUNCTION public.claim_mec_registration_v1(
      p_display_number text, p_expected_revision text, p_self_declaration boolean)
    RETURNS TABLE (status text, profile_revision text)
    LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
    AS $wrapper$
      SELECT result.status, result.profile_revision FROM idealab_private.claim_current_mec_registration_v1(
        p_display_number, p_expected_revision, p_self_declaration) AS result;
    $wrapper$;
  $ddl$;
  REVOKE ALL ON FUNCTION public.claim_mec_registration_v1(text,text,boolean) FROM PUBLIC, anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.claim_mec_registration_v1(text,text,boolean) TO authenticated;

  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF pg_catalog.has_function_privilege(v_role, 'public.claim_mec_registration_v1(text,text,boolean)', 'EXECUTE')
      IS DISTINCT FROM (v_role = 'authenticated') THEN
      RAISE EXCEPTION 'unexpected effective claim wrapper execution';
    END IF;
  END LOOP;
  IF NOT pg_catalog.has_function_privilege('authenticated', 'idealab_private.claim_current_mec_registration_v1(text,text,boolean)', 'EXECUTE')
    OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc AS p WHERE p.pronamespace = 'idealab_private'::pg_catalog.regnamespace
        AND ((p.oid NOT IN ('idealab_private.has_current_verified_email_v1()'::pg_catalog.regprocedure,
                           'idealab_private.current_student_mec_admitted_v1()'::pg_catalog.regprocedure,
                           'idealab_private.save_current_profile_v1(jsonb,text)'::pg_catalog.regprocedure,
                           'idealab_private.claim_current_mec_registration_v1(text,text,boolean)'::pg_catalog.regprocedure)
              AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'))
          OR pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
          OR pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE'))
    ) THEN
    RAISE EXCEPTION 'unexpected effective private claim routine privileges';
  END IF;
END;
$candidate$;
