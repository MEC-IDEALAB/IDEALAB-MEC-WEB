-- Isolated-only candidate. Run with catalog assertions in ONE explicit transaction.
-- Caller must separately confirm exact project identity; never apply to shared DB.
DO $preflight$ BEGIN
  IF current_user<>'postgres' OR current_database()<>'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regprocedure('idealab_private.lab_opening_member_ready_v1()') IS NULL
    OR to_regclass('public.events') IS NOT NULL
    OR to_regprocedure('public.get_events_v1(text,timestamptz,uuid)') IS NOT NULL
    OR to_regprocedure('public.get_event_v1(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'unexpected isolated Events baseline';
  END IF;
END; $preflight$;
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,description text,
  event_type text DEFAULT 'workshop' CHECK(event_type IN ('workshop','hackathon','talk','competition','open_lab','other')),
  club_id uuid, -- isolated clubs absent; shared club FK reconciliation remains required
  event_date timestamptz NOT NULL,end_date timestamptz,venue text,capacity integer,rsvp_count integer DEFAULT 0,
  image_url text,created_by uuid REFERENCES public.users(id),
  status text DEFAULT 'upcoming' CHECK(status IN ('upcoming','ongoing','completed','cancelled')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX events_programme_v1 ON public.events(event_date DESC,id DESC);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION idealab_private.get_events_v1(p_status text,p_before_time timestamptz,p_before_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE items jsonb; more boolean; last_item jsonb;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN RAISE EXCEPTION 'member access required' USING ERRCODE='42501'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('all','upcoming','ongoing','completed','cancelled')
    OR (p_before_time IS NULL)<>(p_before_id IS NULL)
    OR (p_before_time IS NOT NULL AND NOT isfinite(p_before_time)) THEN
    RAISE EXCEPTION 'invalid programme page' USING ERRCODE='22023';
  END IF;
  WITH page AS (
    SELECT id,title,event_type,event_date,end_date,venue,status FROM public.events
    WHERE (p_status='all' OR status=p_status) AND (p_before_time IS NULL OR (event_date,id)<(p_before_time,p_before_id))
    ORDER BY event_date DESC,id DESC LIMIT 21
  ), numbered AS (SELECT *,row_number() OVER(ORDER BY event_date DESC,id DESC) AS n FROM page)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'event_type',event_type,'event_date',event_date,'end_date',end_date,'venue',venue,'status',status) ORDER BY event_date DESC,id DESC) FILTER(WHERE n<=20),'[]'::jsonb),count(*)>20
  INTO items,more FROM numbered;
  last_item:=items->19;
  RETURN jsonb_build_object('items',items,'cursor',CASE WHEN more THEN jsonb_build_object('event_date',last_item->'event_date','id',last_item->'id') ELSE NULL END);
END; $fn$;
CREATE FUNCTION idealab_private.get_event_v1(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE result jsonb;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN RAISE EXCEPTION 'member access required' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object('id',id,'title',title,'event_type',event_type,'event_date',event_date,'end_date',end_date,'venue',venue,'status',status,'description',description)
    INTO result FROM public.events WHERE id=p_id;
  RETURN result;
END; $fn$;
CREATE FUNCTION public.get_events_v1(p_status text,p_before_time timestamptz,p_before_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$ SELECT idealab_private.get_events_v1(p_status,p_before_time,p_before_id) $fn$;
CREATE FUNCTION public.get_event_v1(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$ SELECT idealab_private.get_event_v1(p_id) $fn$;
REVOKE ALL ON FUNCTION idealab_private.get_events_v1(text,timestamptz,uuid),idealab_private.get_event_v1(uuid),public.get_events_v1(text,timestamptz,uuid),public.get_event_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_events_v1(text,timestamptz,uuid),idealab_private.get_event_v1(uuid),public.get_events_v1(text,timestamptz,uuid),public.get_event_v1(uuid) TO authenticated;
