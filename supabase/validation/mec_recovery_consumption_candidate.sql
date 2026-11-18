-- Validation candidate only. Requires the managed gateway to verify JWTs and
-- provider acceptance to establish recovery AMR, session and revocation behavior.
-- The ten-minute grant window is provisional. Review retention before enabling.
-- This consumes website authority only. It cannot constrain direct Auth calls.
DO $recovery_preflight$
DECLARE
  relation text;
BEGIN
  IF pg_catalog.to_regnamespace('idealab_private') IS NULL THEN
    RAISE EXCEPTION 'Recovery candidate requires the reviewed private account schema';
  END IF;
  IF NOT pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'USAGE') THEN
    RAISE EXCEPTION 'Recovery candidate requires authenticated private schema usage';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = current_user AND rolbypassrls)
    OR NOT pg_catalog.has_schema_privilege(current_user, 'auth', 'USAGE')
    OR NOT pg_catalog.has_function_privilege(current_user, 'auth.jwt()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Recovery candidate requires a reviewed Auth-capable function owner';
  END IF;
  FOREACH relation IN ARRAY ARRAY['auth.users', 'auth.sessions', 'auth.mfa_amr_claims'] LOOP
    IF NOT pg_catalog.has_table_privilege(current_user, relation, 'SELECT')
      OR NOT pg_catalog.has_table_privilege(current_user, relation, 'UPDATE') THEN
      RAISE EXCEPTION 'Recovery candidate owner cannot lock the required Auth relation: %', relation;
    END IF;
  END LOOP;
END;
$recovery_preflight$;

CREATE TABLE idealab_private.recovery_session_consumptions_v1 (
  session_id uuid PRIMARY KEY,
  consumed_at timestamptz NOT NULL
);
ALTER TABLE idealab_private.recovery_session_consumptions_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.recovery_session_consumptions_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE idealab_private.recovery_session_consumptions_v1
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION idealab_private.consume_recovery_session_v1(expected_user uuid, expected_session uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  claims jsonb := auth.jwt();
  checked_at timestamptz := statement_timestamp();
  checked_epoch numeric := extract(epoch FROM checked_at);
  recovery_epoch numeric;
  authorization_deadline timestamptz;
BEGIN
  IF expected_user IS NULL OR expected_session IS NULL
    OR claims->>'role' IS DISTINCT FROM 'authenticated'
    OR claims->>'sub' IS DISTINCT FROM expected_user::text
    OR claims->>'session_id' IS DISTINCT FROM expected_session::text
    OR jsonb_typeof(claims->'exp') IS DISTINCT FROM 'number'
    OR jsonb_typeof(claims->'amr') IS DISTINCT FROM 'array' THEN
    RETURN false;
  END IF;
  IF (claims->>'exp')::numeric <= checked_epoch THEN
    RETURN false;
  END IF;

  SELECT max(
    CASE WHEN entry->>'method' = 'recovery' AND jsonb_typeof(entry->'timestamp') = 'number'
      THEN (entry->>'timestamp')::numeric END
  ) INTO recovery_epoch
  FROM jsonb_array_elements(claims->'amr') AS amr(entry);
  IF recovery_epoch IS NULL OR recovery_epoch > checked_epoch
    OR recovery_epoch <= checked_epoch - 600 THEN
    RETURN false;
  END IF;

  -- Lock the matching rows while checking and inserting so concurrent account
  -- or session changes cannot silently invalidate the observed state mid-check.
  SELECT least(session.not_after, method.created_at + interval '10 minutes')
    INTO authorization_deadline
    FROM auth.users AS account
    JOIN auth.sessions AS session ON session.user_id = account.id
    JOIN auth.mfa_amr_claims AS method ON method.session_id = session.id
    WHERE account.id = expected_user AND session.id = expected_session
      AND account.email_confirmed_at IS NOT NULL
      AND account.is_anonymous IS FALSE
      AND (account.banned_until IS NULL OR account.banned_until <= checked_at)
      AND (session.not_after IS NULL OR session.not_after > checked_at)
      AND method.authentication_method::text = 'recovery'
      AND method.created_at > checked_at - interval '10 minutes'
      AND method.created_at <= checked_at
    ORDER BY method.created_at DESC
    LIMIT 1
    FOR SHARE OF account, session, method;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  checked_at := clock_timestamp();
  checked_epoch := extract(epoch FROM checked_at);
  IF authorization_deadline <= checked_at OR (claims->>'exp')::numeric <= checked_epoch
    OR recovery_epoch <= checked_epoch - 600 THEN
    RETURN false;
  END IF;

  INSERT INTO idealab_private.recovery_session_consumptions_v1 (session_id, consumed_at)
    VALUES (expected_session, checked_at)
    ON CONFLICT (session_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- An uncommitted competing receipt may have delayed the insert.
  checked_at := clock_timestamp();
  checked_epoch := extract(epoch FROM checked_at);
  IF authorization_deadline <= checked_at OR (claims->>'exp')::numeric <= checked_epoch
    OR recovery_epoch <= checked_epoch - 600 THEN
    DELETE FROM idealab_private.recovery_session_consumptions_v1 WHERE session_id = expected_session;
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE FUNCTION public.consume_recovery_session_v1(expected_user uuid, expected_session uuid)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
  SELECT idealab_private.consume_recovery_session_v1(expected_user, expected_session);
$$;
REVOKE ALL ON FUNCTION idealab_private.consume_recovery_session_v1(uuid, uuid),
  public.consume_recovery_session_v1(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION idealab_private.consume_recovery_session_v1(uuid, uuid),
  public.consume_recovery_session_v1(uuid, uuid) TO authenticated;
