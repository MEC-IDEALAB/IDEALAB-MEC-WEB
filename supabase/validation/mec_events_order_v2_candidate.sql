-- Candidate for isolated validation only; not a migration or an authorization
-- to change the shared Grow database. Verify the project ref independently.
DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regclass('public.events') IS NULL
    OR to_regprocedure('idealab_private.lab_opening_member_ready_v1()') IS NULL
    OR to_regprocedure('public.get_events_v1(text,timestamptz,uuid)') IS NULL
    OR to_regprocedure('idealab_private.get_events_v2(text,timestamptz,uuid)') IS NOT NULL
    OR to_regprocedure('public.get_events_v2(text,timestamptz,uuid)') IS NOT NULL
    OR NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.events'::regclass)
    OR has_table_privilege('anon', 'public.events', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege('authenticated', 'public.events', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege('service_role', 'public.events', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
    RAISE EXCEPTION 'unexpected isolated Events baseline';
  END IF;
END; $preflight$;

CREATE FUNCTION idealab_private.get_events_v2(p_status text, p_cursor_time timestamptz, p_cursor_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE items jsonb; more boolean; last_item jsonb;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN
    RAISE EXCEPTION 'member access required' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('all','upcoming','ongoing','completed','cancelled')
    OR (p_cursor_time IS NULL) <> (p_cursor_id IS NULL)
    OR (p_cursor_time IS NOT NULL AND NOT isfinite(p_cursor_time)) THEN
    RAISE EXCEPTION 'invalid programme page' USING ERRCODE = '22023';
  END IF;
  WITH page AS (
    SELECT id,title,event_type,event_date,end_date,venue,status
    FROM public.events
    WHERE (p_status = 'all' OR status = p_status)
      AND (p_cursor_time IS NULL
        OR (p_status = 'upcoming' AND (event_date,id) > (p_cursor_time,p_cursor_id))
        OR (p_status <> 'upcoming' AND (event_date,id) < (p_cursor_time,p_cursor_id)))
    ORDER BY CASE WHEN p_status = 'upcoming' THEN event_date END ASC,
      CASE WHEN p_status = 'upcoming' THEN id END ASC,
      CASE WHEN p_status <> 'upcoming' THEN event_date END DESC,
      CASE WHEN p_status <> 'upcoming' THEN id END DESC
    LIMIT 21
  ), numbered AS (
    SELECT *, row_number() OVER (ORDER BY
      CASE WHEN p_status = 'upcoming' THEN event_date END ASC,
      CASE WHEN p_status = 'upcoming' THEN id END ASC,
      CASE WHEN p_status <> 'upcoming' THEN event_date END DESC,
      CASE WHEN p_status <> 'upcoming' THEN id END DESC) AS n FROM page
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'event_type',event_type,
      'event_date',event_date,'end_date',end_date,'venue',venue,'status',status) ORDER BY n)
      FILTER (WHERE n <= 20), '[]'::jsonb), count(*) > 20
    INTO items, more FROM numbered;
  last_item := items->19;
  RETURN jsonb_build_object('items', items, 'cursor', CASE WHEN more THEN
    jsonb_build_object('event_date',last_item->'event_date','id',last_item->'id') ELSE NULL END);
END; $fn$;

CREATE FUNCTION public.get_events_v2(p_status text, p_cursor_time timestamptz, p_cursor_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT idealab_private.get_events_v2(p_status,p_cursor_time,p_cursor_id)
$fn$;
REVOKE ALL ON FUNCTION idealab_private.get_events_v2(text,timestamptz,uuid),
  public.get_events_v2(text,timestamptz,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_events_v2(text,timestamptz,uuid),
  public.get_events_v2(text,timestamptz,uuid) TO authenticated;
