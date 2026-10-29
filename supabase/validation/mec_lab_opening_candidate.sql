-- Only idealab-mec-validation. New capability is separate from profile roles.
DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regprocedure('public.get_own_profile_v1()') IS NULL
    OR to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL
    OR to_regclass('idealab_private.lab_opening_permissions_v1') IS NOT NULL
    OR to_regclass('idealab_private.lab_opening_state_v1') IS NOT NULL
    OR to_regclass('idealab_private.lab_opening_changes_v1') IS NOT NULL
    OR to_regprocedure('public.get_lab_opening_v1()') IS NOT NULL
    OR to_regprocedure('public.set_lab_opening_v1(text,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'unexpected isolated lab-opening baseline';
  END IF;
  IF pg_get_function_result('public.get_own_profile_v1()'::regprocedure) IS DISTINCT FROM
    'TABLE(id uuid, name text, phone text, college_roll text, institution text, department text, study_year smallint, role text, is_active boolean, profile_completed boolean, profile_contract_version smallint, profile_revision text, mec_admitted boolean)' THEN
    RAISE EXCEPTION 'requires exact current admission projection';
  END IF;
END;
$preflight$;

CREATE TABLE idealab_private.lab_opening_permissions_v1 (
  user_id uuid PRIMARY KEY REFERENCES public.users(id),
  duty_label text NOT NULL CHECK (length(btrim(duty_label)) BETWEEN 1 AND 120 AND length(duty_label) <= 120 AND duty_label !~ '[[:cntrl:]]'),
  is_active boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  grant_reason text NOT NULL CHECK (length(btrim(grant_reason)) BETWEEN 1 AND 500)
);
CREATE TABLE idealab_private.lab_opening_state_v1 (
  singleton smallint PRIMARY KEY CHECK (singleton = 1),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  last_action text CHECK (last_action IN ('open', 'close')),
  CHECK ((revision = 0) = (last_action IS NULL))
);
INSERT INTO idealab_private.lab_opening_state_v1(singleton) VALUES (1);
CREATE TABLE idealab_private.lab_opening_changes_v1 (
  revision bigint PRIMARY KEY CHECK (revision > 0),
  command_id uuid NOT NULL UNIQUE,
  actor_id uuid NOT NULL REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN ('open', 'close')),
  actor_name text NOT NULL,
  actor_duty text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE idealab_private.lab_opening_permissions_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.lab_opening_permissions_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.lab_opening_state_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.lab_opening_state_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.lab_opening_changes_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.lab_opening_changes_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON idealab_private.lab_opening_permissions_v1, idealab_private.lab_opening_state_v1,
  idealab_private.lab_opening_changes_v1 FROM PUBLIC, anon, authenticated, service_role;

-- Explicit member-safe projection across private tables. Definer access is
-- intentional and guarded; there is no raw-table API grant or metadata authority.
CREATE FUNCTION idealab_private.lab_opening_member_ready_v1()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $ready$
  SELECT auth.uid() IS NOT NULL
    AND idealab_private.has_current_verified_email_v1()
    AND EXISTS (SELECT 1 FROM public.get_own_profile_v1() AS p
      WHERE p.id = auth.uid() AND p.is_active IS TRUE
      AND (p.role IN ('lab_admin','super_admin') OR
        (p.role = 'student' AND p.profile_completed IS TRUE
         AND p.profile_contract_version = 1 AND p.mec_admitted IS TRUE)));
$ready$;
CREATE FUNCTION idealab_private.get_lab_opening_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $read$
DECLARE v_state record; v_changes jsonb;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN
    RAISE EXCEPTION 'member access required' USING ERRCODE = '42501';
  END IF;
  SELECT revision, last_action INTO STRICT v_state FROM idealab_private.lab_opening_state_v1 WHERE singleton = 1;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'revision', c.revision::text, 'action', c.action, 'actor_name', c.actor_name,
    'actor_duty', c.actor_duty, 'occurred_at', c.occurred_at) ORDER BY c.revision DESC), '[]'::jsonb)
  INTO v_changes FROM (SELECT * FROM idealab_private.lab_opening_changes_v1 ORDER BY revision DESC LIMIT 20) AS c;
  RETURN jsonb_build_object('status', CASE v_state.last_action WHEN 'open' THEN 'open' WHEN 'close' THEN 'closed' ELSE 'unknown' END,
    'revision', v_state.revision::text,
    'can_manage', EXISTS (SELECT 1 FROM idealab_private.lab_opening_permissions_v1 WHERE user_id = auth.uid() AND is_active),
    'changes', v_changes);
END;
$read$;

CREATE FUNCTION idealab_private.set_lab_opening_v1(p_action text, p_expected_revision text, p_command_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $write$
DECLARE v_state record; v_existing record; v_name text; v_duty text; v_time timestamptz; v_revision bigint;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN
    RETURN jsonb_build_object('status','denied');
  END IF;
  -- Hold both the current profile and capability row during the transition.
  SELECT name INTO v_name FROM public.users WHERE id = auth.uid() AND is_active IS TRUE FOR SHARE;
  SELECT duty_label INTO v_duty FROM idealab_private.lab_opening_permissions_v1
    WHERE user_id = auth.uid() AND is_active IS TRUE FOR SHARE;
  IF v_name IS NULL OR v_duty IS NULL OR NOT idealab_private.lab_opening_member_ready_v1() THEN
    RETURN jsonb_build_object('status','denied');
  END IF;
  IF length(btrim(v_name)) NOT BETWEEN 1 AND 120 OR length(v_name) > 120 OR v_name ~ '[[:cntrl:]]' THEN
    RETURN jsonb_build_object('status','unavailable');
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('open','close') OR p_command_id IS NULL
    OR p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
    OR length(p_expected_revision) > 19
    OR (length(p_expected_revision) = 19 AND p_expected_revision COLLATE "C" > '9223372036854775807' COLLATE "C") THEN
    RETURN jsonb_build_object('status','invalid');
  END IF;
  SELECT revision,last_action INTO STRICT v_state FROM idealab_private.lab_opening_state_v1 WHERE singleton = 1 FOR UPDATE;
  SELECT actor_id,action INTO v_existing FROM idealab_private.lab_opening_changes_v1 WHERE command_id = p_command_id;
  IF FOUND THEN
    IF v_existing.actor_id = auth.uid() AND v_existing.action = p_action THEN
      RETURN jsonb_build_object('status','applied','revision',v_state.revision::text);
    END IF;
    RETURN jsonb_build_object('status','conflict');
  END IF;
  IF v_state.revision::text <> p_expected_revision THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF v_state.last_action = p_action THEN RETURN jsonb_build_object('status','unchanged','revision',v_state.revision::text); END IF;
  IF v_state.revision = 9223372036854775807 THEN RETURN jsonb_build_object('status','unavailable'); END IF;
  v_revision := v_state.revision + 1;
  SELECT greatest(clock_timestamp(),coalesce(max(occurred_at),'-infinity'::timestamptz)) INTO v_time
    FROM idealab_private.lab_opening_changes_v1 WHERE revision = v_state.revision;
  INSERT INTO idealab_private.lab_opening_changes_v1(revision,command_id,actor_id,action,actor_name,actor_duty,occurred_at)
    VALUES (v_revision,p_command_id,auth.uid(),p_action,v_name,v_duty,v_time);
  UPDATE idealab_private.lab_opening_state_v1 SET revision = v_revision,last_action = p_action WHERE singleton = 1;
  RETURN jsonb_build_object('status','applied','revision',v_revision::text);
END;
$write$;

CREATE FUNCTION public.get_lab_opening_v1() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $public$ SELECT idealab_private.get_lab_opening_v1(); $public$;
CREATE FUNCTION public.set_lab_opening_v1(p_action text, p_expected_revision text, p_command_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = ''
AS $public$ SELECT idealab_private.set_lab_opening_v1(p_action,p_expected_revision,p_command_id); $public$;
REVOKE ALL ON FUNCTION idealab_private.lab_opening_member_ready_v1(), idealab_private.get_lab_opening_v1(),
  idealab_private.set_lab_opening_v1(text,text,uuid), public.get_lab_opening_v1(), public.set_lab_opening_v1(text,text,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION idealab_private.lab_opening_member_ready_v1(), idealab_private.get_lab_opening_v1(),
  idealab_private.set_lab_opening_v1(text,text,uuid), public.get_lab_opening_v1(), public.set_lab_opening_v1(text,text,uuid)
  TO authenticated;
