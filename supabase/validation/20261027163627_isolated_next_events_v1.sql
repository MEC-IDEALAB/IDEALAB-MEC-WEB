-- Isolated validation project only. Shared Grow production requires a separate
-- reviewed migration and cross-client rollout. The caller must verify the exact
-- project ref externally; this preflight checks the schema, not project identity.
DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regclass('public.events') IS NULL
    OR to_regprocedure('idealab_private.lab_opening_member_ready_v1()') IS NULL
    OR to_regprocedure('public.get_events_v1(text,timestamptz,uuid)') IS NULL
    OR to_regprocedure('idealab_private.get_upcoming_events_v1()') IS NOT NULL
    OR to_regprocedure('public.get_upcoming_events_v1()') IS NOT NULL
    OR has_table_privilege('anon', 'public.events', 'SELECT')
    OR has_table_privilege('authenticated', 'public.events', 'SELECT') THEN
    RAISE EXCEPTION 'unexpected isolated Events baseline';
  END IF;
END; $preflight$;

CREATE FUNCTION idealab_private.get_upcoming_events_v1() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE items jsonb;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN
    RAISE EXCEPTION 'member access required' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'title', e.title, 'event_type', e.event_type,
    'event_date', e.event_date, 'end_date', e.end_date,
    'venue', e.venue, 'status', e.status
  ) ORDER BY e.event_date ASC, e.id ASC), '[]'::jsonb)
  INTO items
  FROM (
    SELECT id, title, event_type, event_date, end_date, venue, status
    FROM public.events
    WHERE status = 'upcoming' AND event_date >= now()
    ORDER BY event_date ASC, id ASC
    LIMIT 3
  ) AS e;
  RETURN jsonb_build_object('items', items, 'cursor', NULL);
END; $fn$;

CREATE FUNCTION public.get_upcoming_events_v1() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT idealab_private.get_upcoming_events_v1()
$fn$;

REVOKE ALL ON FUNCTION idealab_private.get_upcoming_events_v1(), public.get_upcoming_events_v1()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_upcoming_events_v1(), public.get_upcoming_events_v1()
  TO authenticated;
