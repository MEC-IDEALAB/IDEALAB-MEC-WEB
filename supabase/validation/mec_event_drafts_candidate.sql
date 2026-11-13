-- Review candidate for private event drafts and atomic publication.
-- Run in one transaction after the scoped-authority candidate.
-- Existing programme readers continue to read published public.events rows.
-- The inspected events table has no attendee-visibility field and this candidate
-- adds no attendee-list reader. Until that contract exists, published events may
-- only use the restrictive Event Head-only setting; other preferences stay on
-- the private draft and publication fails closed with SQLSTATE 22023.
DO $preflight$
DECLARE api_role text; relation text; routine regprocedure;
BEGIN
  IF to_regprocedure('idealab_private.require_staff_scope_head_v1(uuid,text)') IS NULL
    OR to_regclass('public.events') IS NULL OR to_regclass('public.rsvps') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolbypassrls)
    OR (SELECT relowner FROM pg_class WHERE oid = 'public.events'::regclass) IS DISTINCT FROM current_user::regrole THEN
    RAISE EXCEPTION 'Event draft baseline needs review';
  END IF;
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    FOREACH relation IN ARRAY ARRAY['public.events','public.rsvps'] LOOP
      IF has_table_privilege(api_role, relation, 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
        OR has_any_column_privilege(api_role, relation, 'INSERT,UPDATE') THEN
        RAISE EXCEPTION 'Existing direct event/RSVP writes require coordinated hardening';
      END IF;
    END LOOP;
    FOR routine IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname IN ('increment_rsvp_count','decrement_rsvp_count') LOOP
      IF has_function_privilege(api_role,routine,'EXECUTE') THEN
        RAISE EXCEPTION 'Legacy RSVP counter routines require coordinated hardening';
      END IF;
    END LOOP;
  END LOOP;
END;
$preflight$;

CREATE TABLE idealab_private.event_management_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL REFERENCES idealab_private.staff_scopes_v1(id),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  details jsonb NOT NULL,
  published_event_id uuid UNIQUE REFERENCES public.events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX event_management_scope_recent_v1 ON idealab_private.event_management_v1(scope_id, created_at DESC, id DESC);
CREATE TABLE idealab_private.event_management_commands_v1 (
  actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  command_id uuid NOT NULL,
  payload jsonb NOT NULL,
  result jsonb NOT NULL,
  PRIMARY KEY (actor_id, command_id)
);
CREATE TABLE idealab_private.event_management_history_v1 (
  event_id uuid NOT NULL REFERENCES idealab_private.event_management_v1(id),
  revision bigint NOT NULL CHECK (revision > 0),
  actor_id uuid,
  action text NOT NULL CHECK (action IN ('created', 'edited', 'published')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (event_id, revision)
);
ALTER TABLE idealab_private.event_management_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.event_management_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.event_management_commands_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.event_management_commands_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.event_management_history_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.event_management_history_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON idealab_private.event_management_v1, idealab_private.event_management_commands_v1,
  idealab_private.event_management_history_v1 FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION idealab_private.valid_event_draft_v1(p_details jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = '' SET timezone = 'UTC' AS $$
DECLARE keys text[]; field text; starts_at timestamptz; ends_at timestamptz;
BEGIN
  IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  SELECT array_agg(key ORDER BY key) INTO keys FROM jsonb_object_keys(p_details) key;
  IF keys IS DISTINCT FROM ARRAY['attendee_visibility','audience','capacity','description','end_date','event_date','event_type','fee_paise','title','venue'] THEN
    RETURN false;
  END IF;
  FOREACH field IN ARRAY ARRAY['title','description','event_type','event_date','venue','audience','attendee_visibility','fee_paise'] LOOP
    IF jsonb_typeof(p_details->field) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  END LOOP;
  IF length(p_details->>'title') NOT BETWEEN 3 AND 160 OR p_details->>'title' <> btrim(p_details->>'title')
    OR p_details->>'title' ~ '[[:cntrl:]]'
    OR length(p_details->>'description') NOT BETWEEN 20 AND 10000
    OR regexp_replace(p_details->>'description', E'[\t\r\n]', '', 'g') ~ '[[:cntrl:]]'
    OR length(btrim(p_details->>'venue')) NOT BETWEEN 1 AND 300 OR p_details->>'venue' ~ '[[:cntrl:]]'
    OR p_details->>'event_type' NOT IN ('workshop','hackathon','talk','competition','open_lab','other')
    OR p_details->>'audience' NOT IN ('open','invite_only')
    OR p_details->>'attendee_visibility' NOT IN ('registered','members','head')
    OR p_details->>'fee_paise' !~ '^(0|[1-9][0-9]{0,8})$' THEN RETURN false; END IF;
  IF p_details->'capacity' <> 'null'::jsonb AND
    (jsonb_typeof(p_details->'capacity') IS DISTINCT FROM 'number'
      OR (p_details->>'capacity') !~ '^[1-9][0-9]{0,8}$') THEN RETURN false; END IF;
  IF p_details->>'event_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN RETURN false; END IF;
  starts_at := (p_details->>'event_date')::timestamptz;
  IF NOT isfinite(starts_at) THEN RETURN false; END IF;
  IF p_details->'end_date' <> 'null'::jsonb THEN
    IF jsonb_typeof(p_details->'end_date') IS DISTINCT FROM 'string'
      OR p_details->>'end_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN RETURN false; END IF;
    ends_at := (p_details->>'end_date')::timestamptz;
    IF NOT isfinite(ends_at) OR ends_at <= starts_at THEN RETURN false; END IF;
  END IF;
  RETURN true;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN false;
END;
$$;

CREATE FUNCTION idealab_private.mutate_event_draft_v1(
  p_command jsonb, p_command_id uuid, p_expected_actor uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid(); command_action text; keys text[]; scope uuid;
  event_row idealab_private.event_management_v1%ROWTYPE;
  details jsonb; receipt idealab_private.event_management_commands_v1%ROWTYPE;
  result jsonb; event_id uuid; expected_revision bigint; stamp timestamptz;
BEGIN
  IF actor IS NULL OR actor IS DISTINCT FROM p_expected_actor THEN
    RAISE EXCEPTION 'Event management access denied' USING ERRCODE = '42501';
  END IF;
  IF p_command_id IS NULL OR jsonb_typeof(p_command) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid event command' USING ERRCODE = '22023';
  END IF;
  SELECT array_agg(key ORDER BY key) INTO keys FROM jsonb_object_keys(p_command) key;
  command_action := p_command->>'action';
  IF jsonb_typeof(p_command->'action') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Invalid event command' USING ERRCODE = '22023';
  END IF;
  IF command_action = 'create' AND keys = ARRAY['action','details','scope_id'] THEN
    IF jsonb_typeof(p_command->'scope_id') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Invalid event scope' USING ERRCODE = '22023';
    END IF;
    scope := (p_command->>'scope_id')::uuid;
  ELSIF command_action IN ('edit','publish') AND
    keys = (CASE WHEN command_action = 'edit' THEN ARRAY['action','details','event_id','revision'] ELSE ARRAY['action','event_id','revision'] END) THEN
    IF jsonb_typeof(p_command->'event_id') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_command->'revision') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Invalid event identity or revision' USING ERRCODE = '22023';
    END IF;
    event_id := (p_command->>'event_id')::uuid;
    SELECT scope_id INTO scope FROM idealab_private.event_management_v1 WHERE id = event_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Event management access denied' USING ERRCODE = '42501'; END IF;
    IF p_command->>'revision' !~ '^[1-9][0-9]{0,17}$' THEN
      RAISE EXCEPTION 'Invalid event revision' USING ERRCODE = '22023';
    END IF;
    expected_revision := (p_command->>'revision')::bigint;
  ELSE
    RAISE EXCEPTION 'Invalid event command' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('event-command:' || actor::text || ':' || p_command_id::text, 0));
  PERFORM idealab_private.require_staff_scope_head_v1(scope, 'events');
  SELECT * INTO receipt FROM idealab_private.event_management_commands_v1
    WHERE actor_id = actor AND command_id = p_command_id;
  IF FOUND THEN
    IF receipt.payload IS DISTINCT FROM p_command THEN
      RAISE EXCEPTION 'Event command conflict' USING ERRCODE = '22023';
    END IF;
    RETURN receipt.result;
  END IF;
  stamp := clock_timestamp();
  IF command_action = 'create' THEN
    details := p_command->'details';
    IF NOT idealab_private.valid_event_draft_v1(details) THEN
      RAISE EXCEPTION 'Invalid event details' USING ERRCODE = '22023';
    END IF;
    INSERT INTO idealab_private.event_management_v1(scope_id, details, created_at, updated_at)
    VALUES (scope, details, stamp, stamp) RETURNING * INTO event_row;
  ELSE
    SELECT * INTO event_row FROM idealab_private.event_management_v1 WHERE id = event_id FOR UPDATE;
    IF event_row.revision IS DISTINCT FROM expected_revision OR event_row.published_event_id IS NOT NULL THEN
      RAISE EXCEPTION 'Event revision conflict' USING ERRCODE = '40001';
    END IF;
    IF command_action = 'edit' THEN
      details := p_command->'details';
      IF NOT idealab_private.valid_event_draft_v1(details) THEN
        RAISE EXCEPTION 'Invalid event details' USING ERRCODE = '22023';
      END IF;
      UPDATE idealab_private.event_management_v1
      SET details = p_command->'details', revision = revision + 1, updated_at = stamp
      WHERE id = event_id RETURNING * INTO event_row;
    ELSE
      details := event_row.details;
      IF NOT idealab_private.valid_event_draft_v1(details) OR (details->>'event_date')::timestamptz <= stamp THEN
        RAISE EXCEPTION 'Check event details before publication' USING ERRCODE = '22023';
      END IF;
      IF details->>'fee_paise' <> '0' OR details->>'audience' <> 'open' THEN
        RAISE EXCEPTION 'Paid and invite-only publication awaits the registration contract' USING ERRCODE = '22023';
      END IF;
      IF details->>'attendee_visibility' <> 'head' THEN
        RAISE EXCEPTION 'Attendee visibility must remain Event Head-only until the RSVP visibility read contract is available' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.events (id,title,description,event_type,event_date,end_date,venue,capacity,rsvp_count,created_by,status,created_at)
      VALUES (event_row.id, details->>'title', details->>'description', details->>'event_type',
        (details->>'event_date')::timestamptz, (details->>'end_date')::timestamptz,
        details->>'venue', (details->>'capacity')::integer, 0, actor, 'upcoming', stamp);
      UPDATE idealab_private.event_management_v1
      SET published_event_id = id, revision = revision + 1, updated_at = stamp
      WHERE id = event_id RETURNING * INTO event_row;
    END IF;
  END IF;
  INSERT INTO idealab_private.event_management_history_v1(event_id,revision,actor_id,action,recorded_at)
  VALUES (event_row.id, event_row.revision, actor,
    CASE command_action WHEN 'create' THEN 'created' WHEN 'edit' THEN 'edited' ELSE 'published' END, stamp);
  result := jsonb_build_object('status','saved','event_id',event_row.id,'revision',event_row.revision::text,
    'state',CASE WHEN event_row.published_event_id IS NULL THEN 'draft' ELSE 'published' END);
  INSERT INTO idealab_private.event_management_commands_v1(actor_id,command_id,payload,result)
  VALUES (actor,p_command_id,p_command,result);
  RETURN result;
END;
$$;

CREATE FUNCTION public.mutate_event_draft_v1(p_command jsonb, p_command_id uuid, p_expected_actor uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT idealab_private.mutate_event_draft_v1(p_command,p_command_id,p_expected_actor);
$$;
REVOKE ALL ON FUNCTION idealab_private.valid_event_draft_v1(jsonb),
  idealab_private.mutate_event_draft_v1(jsonb,uuid,uuid), public.mutate_event_draft_v1(jsonb,uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION idealab_private.mutate_event_draft_v1(jsonb,uuid,uuid),
  public.mutate_event_draft_v1(jsonb,uuid,uuid) TO authenticated;
