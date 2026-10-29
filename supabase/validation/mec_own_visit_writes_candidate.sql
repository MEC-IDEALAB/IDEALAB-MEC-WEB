-- Isolated only; preflight intentionally rejects any preexisting attendance.
DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regprocedure('idealab_private.lab_opening_member_ready_v1()') IS NULL
    OR to_regprocedure('public.get_own_lab_visits_v1()') IS NULL
    OR to_regclass('idealab_private.lab_opening_state_v1') IS NULL
    OR to_regclass('public.lab_sessions') IS NULL
    OR to_regclass('idealab_private.own_visit_commands_v1') IS NOT NULL
    OR to_regprocedure('public.check_in_lab_v1(text,uuid)') IS NOT NULL
    OR to_regprocedure('public.check_out_lab_v1(uuid,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'unexpected isolated own-visit baseline';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lab_sessions) THEN RAISE EXCEPTION 'requires empty isolated attendance baseline'; END IF;
  IF has_table_privilege('authenticated','public.lab_sessions','INSERT,UPDATE,DELETE')
    OR has_any_column_privilege('authenticated','public.lab_sessions','INSERT,UPDATE')
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.lab_sessions'::regclass AND relrowsecurity AND relforcerowsecurity) THEN
    RAISE EXCEPTION 'requires denied direct writers and forced RLS';
  END IF;
END;
$preflight$;

CREATE UNIQUE INDEX lab_sessions_one_active_owner_v1 ON public.lab_sessions(user_id) WHERE checkout_time IS NULL;
CREATE TABLE idealab_private.own_visit_commands_v1 (
  user_id uuid NOT NULL REFERENCES public.users(id),
  command_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('in','out')),
  request_purpose text,
  request_visit_id uuid,
  result_status text NOT NULL CHECK (result_status IN ('checked_in','already_in','checked_out','already_out')),
  result_visit_id uuid NOT NULL REFERENCES public.lab_sessions(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(user_id,command_id),
  CHECK ((action='in' AND request_purpose IS NOT NULL AND request_visit_id IS NULL AND result_status IN ('checked_in','already_in'))
    OR (action='out' AND request_purpose IS NULL AND request_visit_id IS NOT NULL AND result_status IN ('checked_out','already_out')))
);
ALTER TABLE idealab_private.own_visit_commands_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.own_visit_commands_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON idealab_private.own_visit_commands_v1 FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION idealab_private.change_own_visit_v1(p_action text,p_purpose text,p_visit_id uuid,p_command_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $write$
DECLARE v_owner uuid := auth.uid(); v_command record; v_visit record; v_opening text; v_id uuid; v_status text; v_time timestamptz;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN RETURN jsonb_build_object('status','denied'); END IF;
  -- Serializes this member's attendance and supported profile/admission writes.
  PERFORM 1 FROM public.users WHERE id=v_owner AND is_active IS TRUE FOR UPDATE;
  IF NOT FOUND OR NOT idealab_private.lab_opening_member_ready_v1() THEN RETURN jsonb_build_object('status','denied'); END IF;
  IF p_command_id IS NULL OR p_action IS NULL OR p_action NOT IN ('in','out')
    OR (p_action='in' AND (p_visit_id IS NOT NULL OR p_purpose IS NULL
      OR length(p_purpose) NOT BETWEEN 1 AND 1000 OR p_purpose ~ '^[[:space:]]*$'
      OR regexp_replace(p_purpose,E'[\t\n\r]','','g') ~ '[[:cntrl:]]'))
    OR (p_action='out' AND (p_visit_id IS NULL OR p_purpose IS NOT NULL)) THEN
    RETURN jsonb_build_object('status','invalid');
  END IF;
  SELECT action,request_purpose,request_visit_id,result_status,result_visit_id INTO v_command
    FROM idealab_private.own_visit_commands_v1 WHERE user_id=v_owner AND command_id=p_command_id;
  IF FOUND THEN
    IF v_command.action IS DISTINCT FROM p_action OR v_command.request_purpose IS DISTINCT FROM p_purpose
      OR v_command.request_visit_id IS DISTINCT FROM p_visit_id THEN RETURN jsonb_build_object('status','conflict'); END IF;
    RETURN jsonb_build_object('status',v_command.result_status,'visit_id',v_command.result_visit_id);
  END IF;
  IF p_action='in' THEN
    SELECT id,checkin_time INTO v_visit FROM public.lab_sessions WHERE user_id=v_owner AND checkout_time IS NULL;
    IF FOUND THEN
      IF v_visit.checkin_time IS NULL THEN RETURN jsonb_build_object('status','unavailable'); END IF;
      v_id := v_visit.id; v_status := 'already_in';
    ELSE
      SELECT last_action INTO STRICT v_opening FROM idealab_private.lab_opening_state_v1 WHERE singleton=1 FOR SHARE;
      IF v_opening IS DISTINCT FROM 'open' THEN RETURN jsonb_build_object('status','closed'); END IF;
      v_time := clock_timestamp();
      INSERT INTO public.lab_sessions(user_id,checkin_time,checkout_time,purpose,created_at)
        VALUES(v_owner,v_time,NULL,p_purpose,v_time) RETURNING id INTO v_id;
      v_status := 'checked_in';
    END IF;
  ELSE
    SELECT id,checkin_time,checkout_time INTO v_visit FROM public.lab_sessions WHERE id=p_visit_id AND user_id=v_owner FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status','conflict'); END IF;
    IF v_visit.checkin_time IS NULL THEN RETURN jsonb_build_object('status','unavailable'); END IF;
    v_id := v_visit.id;
    IF v_visit.checkout_time IS NOT NULL THEN v_status := 'already_out';
    ELSE
      UPDATE public.lab_sessions SET checkout_time=greatest(clock_timestamp(),v_visit.checkin_time) WHERE id=v_id AND user_id=v_owner;
      v_status := 'checked_out';
    END IF;
  END IF;
  INSERT INTO idealab_private.own_visit_commands_v1(user_id,command_id,action,request_purpose,request_visit_id,result_status,result_visit_id)
    VALUES(v_owner,p_command_id,p_action,p_purpose,p_visit_id,v_status,v_id);
  RETURN jsonb_build_object('status',v_status,'visit_id',v_id);
END;
$write$;
CREATE FUNCTION public.check_in_lab_v1(p_purpose text,p_command_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $public$ SELECT idealab_private.change_own_visit_v1('in',p_purpose,NULL,p_command_id); $public$;
CREATE FUNCTION public.check_out_lab_v1(p_visit_id uuid,p_command_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $public$ SELECT idealab_private.change_own_visit_v1('out',NULL,p_visit_id,p_command_id); $public$;
REVOKE ALL ON FUNCTION idealab_private.change_own_visit_v1(text,text,uuid,uuid), public.check_in_lab_v1(text,uuid), public.check_out_lab_v1(uuid,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION idealab_private.change_own_visit_v1(text,text,uuid,uuid), public.check_in_lab_v1(text,uuid), public.check_out_lab_v1(uuid,uuid)
  TO authenticated;
