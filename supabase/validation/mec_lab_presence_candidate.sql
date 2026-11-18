-- Isolated validation candidate. Apply in a transaction after the visit baseline.
CREATE FUNCTION idealab_private.get_lab_presence_v1() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  presence jsonb;
BEGIN
  IF auth.uid() IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM auth.users AS account
      WHERE account.id = auth.uid()
        AND (account.banned_until IS NULL OR account.banned_until <= statement_timestamp())
    )
    OR idealab_private.current_student_mec_admitted_v1() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Member admission required' USING ERRCODE = '42501';
  END IF;

  WITH present AS MATERIALIZED (
    SELECT DISTINCT member.id, left(btrim(member.name), 200) AS name
    FROM public.lab_sessions AS visit
    JOIN public.users AS member ON member.id = visit.user_id
    WHERE visit.checkout_time IS NULL AND member.is_active IS TRUE
  ), visible AS (
    SELECT coalesce(nullif(name, ''), 'Lab member') AS name
    FROM present ORDER BY name NULLS LAST, id LIMIT 30
  )
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM present),
    'names', coalesce((SELECT jsonb_agg(name ORDER BY name) FROM visible), '[]'::jsonb)
  ) INTO presence;

  RETURN presence;
END;
$$;
CREATE FUNCTION public.get_lab_presence_v1() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT idealab_private.get_lab_presence_v1();
$$;
REVOKE ALL ON FUNCTION idealab_private.get_lab_presence_v1(), public.get_lab_presence_v1()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_lab_presence_v1(), public.get_lab_presence_v1()
  TO authenticated;
