-- Isolated validation only. Mirrors the inspected Grow lab_sessions columns;
-- no production changes, copied records or check-in/out writers.
DO $preflight$
BEGIN
  IF current_user <> 'postgres'
    OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regprocedure('public.get_own_profile_v1()') IS NULL
    OR to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL
    OR to_regclass('public.lab_sessions') IS NOT NULL
    OR to_regprocedure('public.get_own_lab_visits_v1()') IS NOT NULL THEN
    RAISE EXCEPTION 'unexpected isolated visit-read baseline';
  END IF;
  IF pg_catalog.pg_get_function_result('public.get_own_profile_v1()'::regprocedure) IS DISTINCT FROM
    'TABLE(id uuid, name text, phone text, college_roll text, institution text, department text, study_year smallint, role text, is_active boolean, profile_completed boolean, profile_contract_version smallint, profile_revision text, mec_admitted boolean)' THEN
    RAISE EXCEPTION 'requires exact thirteen-field admission projection';
  END IF;
END;
$preflight$;

CREATE TABLE public.lab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  checkin_time timestamptz DEFAULT now(),
  checkout_time timestamptz,
  purpose text,
  created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.lab_sessions IS
  'Isolated Grow-compatible visit read baseline; no client writes and no imported records.';
ALTER TABLE public.lab_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lab_sessions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT (id, user_id, checkin_time, checkout_time, purpose) ON public.lab_sessions TO authenticated;
CREATE INDEX lab_sessions_owner_recent_v1 ON public.lab_sessions(user_id, checkin_time DESC, id);

CREATE POLICY own_ready_member_visits_v1 ON public.lab_sessions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (SELECT idealab_private.has_current_verified_email_v1())
    AND EXISTS (
      SELECT 1 FROM public.get_own_profile_v1() AS profile
      WHERE profile.id = (SELECT auth.uid()) AND profile.is_active IS TRUE
        AND (profile.role IN ('lab_admin', 'super_admin')
          OR (profile.role = 'student' AND profile.profile_completed IS TRUE
            AND profile.profile_contract_version = 1 AND profile.mec_admitted IS TRUE))
    )
  );

CREATE FUNCTION public.get_own_lab_visits_v1()
RETURNS TABLE (id uuid, user_id uuid, checkin_time timestamptz, checkout_time timestamptz, purpose text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $read$
  SELECT visit.id, visit.user_id, visit.checkin_time, visit.checkout_time, visit.purpose
  FROM public.lab_sessions AS visit
  WHERE visit.user_id = (SELECT auth.uid())
  ORDER BY (visit.checkout_time IS NULL) DESC, visit.checkin_time DESC NULLS LAST, visit.id
  LIMIT 20;
$read$;
REVOKE ALL ON FUNCTION public.get_own_lab_visits_v1() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_own_lab_visits_v1() TO authenticated;
