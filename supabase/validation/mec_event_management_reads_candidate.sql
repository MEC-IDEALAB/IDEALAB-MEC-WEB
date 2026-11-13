-- Local review candidate, after staff scopes and event drafts. One transaction.
DO $preflight$
BEGIN
  IF to_regprocedure('idealab_private.mutate_event_draft_v1(jsonb,uuid,uuid)') IS NULL
    OR (SELECT nspowner FROM pg_namespace WHERE nspname='idealab_private') IS DISTINCT FROM current_user::regrole
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=current_user AND rolbypassrls) THEN
    RAISE EXCEPTION 'Event management read baseline needs review';
  END IF;
END;
$preflight$;

CREATE FUNCTION idealab_private.require_event_manager_identity_v1(p_expected_actor uuid) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR actor IS DISTINCT FROM p_expected_actor THEN
    RAISE EXCEPTION 'Event management access denied' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM auth.users WHERE id=actor AND (banned_until IS NULL OR banned_until<=statement_timestamp()) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event management access denied' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.users WHERE id=actor AND is_active IS TRUE FOR SHARE;
  IF NOT FOUND OR NOT idealab_private.has_current_verified_email_v1() THEN
    RAISE EXCEPTION 'Event management access denied' USING ERRCODE='42501';
  END IF;
END;
$$;

CREATE FUNCTION idealab_private.get_event_management_scopes_v1(p_expected_actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE items jsonb;
BEGIN
  PERFORM idealab_private.require_event_manager_identity_v1(p_expected_actor);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'label',s.resource_key) ORDER BY s.id),'[]'::jsonb)
  INTO items FROM (SELECT s.id,s.resource_key FROM idealab_private.staff_scopes_v1 AS s
    JOIN idealab_private.staff_scope_assignments_v1 AS a
      ON a.scope_id=s.id AND a.user_id=auth.uid() AND a.revoked_at IS NULL
    WHERE s.kind='events' ORDER BY s.id LIMIT 51) s;
  -- Never silently hide assignments and imply that the list is complete.
  IF jsonb_array_length(items)>50 THEN
    RAISE EXCEPTION 'Event assignment list needs pagination' USING ERRCODE='54000';
  END IF;
  RETURN jsonb_build_object('items',items);
END;
$$;

CREATE FUNCTION idealab_private.get_event_drafts_v1(
  p_scope_id uuid, p_event_id uuid, p_before_time timestamptz, p_before_id uuid, p_expected_actor uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rows jsonb; next_cursor jsonb := 'null'::jsonb; last_row jsonb;
BEGIN
  PERFORM idealab_private.require_event_manager_identity_v1(p_expected_actor);
  PERFORM idealab_private.require_staff_scope_head_v1(p_scope_id,'events');
  IF (p_before_time IS NULL) <> (p_before_id IS NULL)
    OR (p_before_time IS NOT NULL AND NOT isfinite(p_before_time))
    OR (p_event_id IS NOT NULL AND p_before_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Invalid event cursor' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'revision',e.revision::text,
    'details',e.details,'state',CASE WHEN e.published_event_id IS NULL THEN 'draft' ELSE 'published' END,
    'created_at',to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))
    ORDER BY e.created_at DESC,e.id DESC),'[]'::jsonb) INTO rows
  FROM (SELECT id,revision,details,published_event_id,created_at FROM idealab_private.event_management_v1
    WHERE scope_id=p_scope_id AND (p_event_id IS NULL OR id=p_event_id)
      AND (p_before_id IS NULL OR (created_at,id)<(p_before_time,p_before_id))
    ORDER BY created_at DESC,id DESC LIMIT 21) e;
  IF jsonb_array_length(rows)>20 THEN
    SELECT jsonb_agg(value ORDER BY ordinality) INTO rows
    FROM jsonb_array_elements(rows) WITH ORDINALITY WHERE ordinality<=20;
    last_row := rows->19;
    next_cursor := jsonb_build_object('created_at',last_row->>'created_at','id',last_row->>'id');
  END IF;
  RETURN jsonb_build_object('scope_id',p_scope_id,'items',rows,'cursor',next_cursor);
END;
$$;

CREATE FUNCTION public.get_event_management_scopes_v1(p_expected_actor uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT idealab_private.get_event_management_scopes_v1(p_expected_actor);
$$;
CREATE FUNCTION public.get_event_drafts_v1(p_scope_id uuid,p_event_id uuid,p_before_time timestamptz,p_before_id uuid,p_expected_actor uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT idealab_private.get_event_drafts_v1(p_scope_id,p_event_id,p_before_time,p_before_id,p_expected_actor);
$$;
REVOKE ALL ON FUNCTION idealab_private.require_event_manager_identity_v1(uuid),
  idealab_private.get_event_management_scopes_v1(uuid), public.get_event_management_scopes_v1(uuid),
  idealab_private.get_event_drafts_v1(uuid,uuid,timestamptz,uuid,uuid), public.get_event_drafts_v1(uuid,uuid,timestamptz,uuid,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_event_management_scopes_v1(uuid), public.get_event_management_scopes_v1(uuid),
  idealab_private.get_event_drafts_v1(uuid,uuid,timestamptz,uuid,uuid), public.get_event_drafts_v1(uuid,uuid,timestamptz,uuid,uuid)
  TO authenticated;
