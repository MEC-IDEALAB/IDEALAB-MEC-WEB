-- Isolated validation delta only. Run in a reviewed outer transaction.
-- No Auth row, existing profile or claim is changed by installing this delta.
-- This is not a production rollout or a backfill for previously stale emails.
DO $candidate$
BEGIN
  IF current_user <> 'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regprocedure('idealab_private.provision_mec_profile_v1()') IS NULL
    OR to_regprocedure('public.get_own_profile_v1()') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class
      WHERE oid = 'public.users'::regclass AND relrowsecurity AND relforcerowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
      WHERE tgrelid = 'auth.users'::regclass AND tgname = 'mec_profile_after_auth_insert_v1' AND NOT tgisinternal)
    OR to_regprocedure('idealab_private.sync_mec_profile_email_v1()') IS NOT NULL
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
      WHERE tgrelid = 'auth.users'::regclass AND tgname = 'mec_profile_after_auth_email_update_v1') THEN
    RAISE EXCEPTION 'email synchronization requires the reviewed isolated PG17 profile baseline and an unused delta';
  END IF;

  EXECUTE $ddl$
    CREATE FUNCTION idealab_private.sync_mec_profile_email_v1()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
    AS $sync$
    BEGIN
      IF TG_TABLE_SCHEMA <> 'auth' OR TG_TABLE_NAME <> 'users'
        OR TG_NAME <> 'mec_profile_after_auth_email_update_v1'
        OR TG_LEVEL <> 'ROW' OR TG_WHEN <> 'AFTER' OR TG_OP <> 'UPDATE' THEN
        RAISE EXCEPTION 'profile email synchronization is restricted to its reviewed Auth trigger';
      END IF;
      IF NEW.is_anonymous IS DISTINCT FROM false
        OR NEW.email_confirmed_at IS NULL
        OR NEW.email IS NULL OR pg_catalog.btrim(NEW.email) = '' THEN
        RETURN NEW;
      END IF;
      -- Auth owns email identity. Never derive eligibility or role from it.
      -- Do not provision a missing profile or overwrite editable profile fields.
      -- Email is outside the versioned six-field projection, so its sync does
      -- not advance profile_revision or invalidate an unrelated profile draft.
      UPDATE public.users SET email = NEW.email
      WHERE id = NEW.id AND email IS DISTINCT FROM NEW.email;
      RETURN NEW;
    END;
    $sync$;
  $ddl$;

  REVOKE ALL ON FUNCTION idealab_private.sync_mec_profile_email_v1()
    FROM PUBLIC, anon, authenticated, service_role;
  CREATE TRIGGER mec_profile_after_auth_email_update_v1
    AFTER UPDATE OF email, email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION idealab_private.sync_mec_profile_email_v1();
  COMMENT ON FUNCTION idealab_private.sync_mec_profile_email_v1() IS
    'Validation-only confirmed Auth email projection sync; no backfill, role/admission change or client API.';
END;
$candidate$;
