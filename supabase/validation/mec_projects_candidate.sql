-- Isolated only. Canonical Grow columns/vocabulary; no live data import.
DO $preflight$
BEGIN
  IF current_user<>'postgres' OR current_database()<>'postgres'
    OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regprocedure('idealab_private.lab_opening_member_ready_v1()') IS NULL
    OR to_regclass('idealab_private.mec_registration_claims_v1') IS NULL
    OR to_regclass('public.projects') IS NOT NULL OR to_regclass('public.project_members') IS NOT NULL
    OR to_regclass('idealab_private.project_controls_v1') IS NOT NULL
    OR to_regprocedure('public.mutate_project_v1(jsonb,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'unexpected isolated project baseline';
  END IF;
  IF pg_get_function_result('public.get_own_profile_v1()'::regprocedure) IS DISTINCT FROM
    'TABLE(id uuid, name text, phone text, college_roll text, institution text, department text, study_year smallint, role text, is_active boolean, profile_completed boolean, profile_contract_version smallint, profile_revision text, mec_admitted boolean)' THEN
    RAISE EXCEPTION 'requires exact current admission projection';
  END IF;
END;
$preflight$;

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text,
  club_id uuid, -- unused isolated club FK omitted; shared rollout requires reconciliation
  status text DEFAULT 'ideation' CHECK(status IN ('ideation','in_progress','completed','showcase')),
  created_by uuid REFERENCES public.users(id),
  visibility text DEFAULT 'public' CHECK(visibility IN ('public','club','private')),
  showcase_url text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id),
  role text DEFAULT 'member' CHECK(role IN ('admin','lead','member','mentor')),
  joined_at timestamptz DEFAULT now(), UNIQUE(project_id,user_id)
);
CREATE INDEX project_members_owner_v1 ON public.project_members(user_id,project_id);
CREATE INDEX projects_recent_v1 ON public.projects(updated_at DESC,id DESC);
CREATE TABLE idealab_private.project_controls_v1 (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
  join_code text NOT NULL UNIQUE DEFAULT upper(replace(gen_random_uuid()::text,'-','')) CHECK(join_code ~ '^[A-F0-9]{32}$')
);
CREATE TABLE idealab_private.project_join_requests_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','cancelled')),
  revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(project_id,user_id)
);
CREATE INDEX project_requests_owner_recent_v1 ON idealab_private.project_join_requests_v1(user_id,updated_at DESC,id);
CREATE INDEX project_requests_pending_v1 ON idealab_private.project_join_requests_v1(project_id,created_at,id) WHERE status='pending';
CREATE TABLE idealab_private.project_commands_v1 (
  user_id uuid NOT NULL REFERENCES public.users(id), command_id uuid NOT NULL,
  request jsonb NOT NULL, result jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(user_id,command_id)
);
CREATE TABLE idealab_private.project_join_attempts_v1 (
  user_id uuid PRIMARY KEY REFERENCES public.users(id), window_started timestamptz NOT NULL,
  attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 10)
);
CREATE TABLE idealab_private.project_events_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES public.projects(id),
  actor_id uuid NOT NULL REFERENCES public.users(id), command_id uuid NOT NULL,
  action text NOT NULL, outcome text NOT NULL, request_revision bigint,
  request_id uuid REFERENCES idealab_private.project_join_requests_v1(id), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(actor_id,command_id) REFERENCES idealab_private.project_commands_v1(user_id,command_id)
);
DO $tables$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.projects','public.project_members','idealab_private.project_controls_v1',
    'idealab_private.project_join_requests_v1','idealab_private.project_commands_v1',
    'idealab_private.project_join_attempts_v1','idealab_private.project_events_v1'] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON %s FROM PUBLIC,anon,authenticated,service_role',t);
  END LOOP;
END;
$tables$;

-- Internal applicant check; no API-role EXECUTE. It never returns profile data.
CREATE FUNCTION idealab_private.project_applicant_ready_v1(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $eligible$
  SELECT EXISTS(SELECT 1 FROM public.users u JOIN auth.users a ON a.id=u.id
    WHERE u.id=p_id AND u.is_active IS TRUE AND a.is_anonymous IS FALSE
      AND a.email_confirmed_at IS NOT NULL AND length(btrim(a.email))>0
      AND (u.role IN ('lab_admin','super_admin') OR (u.role='student'
        AND u.profile_completed IS TRUE AND u.profile_contract_version=1
        AND length(regexp_replace(u.name,'^[[:space:]]+|[[:space:]]+$','','g')) BETWEEN 1 AND 120 AND u.name !~ '[[:cntrl:]]'
        AND u.phone ~ '^[+][1-9][0-9]{1,14}$' AND u.phone !~ '[[:cntrl:]]'
        AND length(idealab_private.normalize_mec_registration_v1(u.college_roll)) BETWEEN 1 AND 64 AND u.college_roll !~ '[[:cntrl:]]'
        AND u.institution='Model Engineering College'
        AND length(regexp_replace(u.department,'^[[:space:]]+|[[:space:]]+$','','g')) BETWEEN 1 AND 120 AND u.department !~ '[[:cntrl:]]'
        AND u.study_year BETWEEN 1 AND 8
        AND EXISTS(SELECT 1 FROM idealab_private.mec_registration_claims_v1 c WHERE c.user_id=u.id
          AND c.claim_state='current' AND c.attestation_version=1 AND c.attested_at IS NOT NULL AND c.attested_at<=statement_timestamp()
          AND length(idealab_private.normalize_mec_registration_v1(c.display_value)) BETWEEN 1 AND 64 AND c.display_value !~ '[[:cntrl:]]'
          AND c.normalized_value=idealab_private.normalize_mec_registration_v1(u.college_roll) COLLATE idealab_private.mec_registration_ci))));
$eligible$;
CREATE FUNCTION idealab_private.project_card_v1(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $card$
  SELECT jsonb_build_object('id',p.id,'title',p.title,'description',p.description,'status',p.status,'visibility',p.visibility,
    'created_at',p.created_at,'updated_at',p.updated_at,'revision',c.revision::text,
    'relation',CASE WHEN p.created_by=auth.uid() THEN 'creator' WHEN EXISTS(SELECT 1 FROM public.project_members m WHERE m.project_id=p.id AND m.user_id=auth.uid()) THEN 'member' ELSE 'none' END,
    'member_count',(SELECT count(*) FROM public.project_members m WHERE m.project_id=p.id))
  FROM public.projects p JOIN idealab_private.project_controls_v1 c ON c.project_id=p.id WHERE p.id=p_id;
$card$;
CREATE FUNCTION idealab_private.get_projects_v1(p_view text,p_query text,p_before_time timestamptz,p_before_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $list$
DECLARE v_ids uuid[]; v_items jsonb; v_cursor jsonb:=NULL; v_last record;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN RAISE EXCEPTION 'member access required' USING ERRCODE='42501'; END IF;
  IF p_view IS NULL OR p_view NOT IN ('discover','mine') OR p_query IS NULL OR length(p_query)>100
    OR (p_before_time IS NULL) IS DISTINCT FROM (p_before_id IS NULL) THEN RAISE EXCEPTION 'invalid list input' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.projects p WHERE
    ((p_view='discover' AND p.visibility='public') OR (p_view='mine' AND (p.created_by=auth.uid() OR EXISTS(SELECT 1 FROM public.project_members m WHERE m.project_id=p.id AND m.user_id=auth.uid()))))
    AND (p.updated_at IS NULL OR NOT EXISTS(SELECT 1 FROM idealab_private.project_controls_v1 c WHERE c.project_id=p.id))) THEN
    RAISE EXCEPTION 'incomplete project contract';
  END IF;
  SELECT array_agg(s.id ORDER BY s.updated_at DESC,s.id DESC) INTO v_ids FROM (
    SELECT p.id,p.updated_at FROM public.projects p WHERE
      ((p_view='discover' AND p.visibility='public') OR (p_view='mine' AND (p.created_by=auth.uid() OR EXISTS(SELECT 1 FROM public.project_members m WHERE m.project_id=p.id AND m.user_id=auth.uid()))))
      AND (p_query='' OR strpos(lower(p.title),lower(p_query))>0)
      AND (p_before_time IS NULL OR (p.updated_at,p.id)<(p_before_time,p_before_id))
      ORDER BY p.updated_at DESC,p.id DESC LIMIT 21) s;
  SELECT coalesce(jsonb_agg(idealab_private.project_card_v1(s.id) ORDER BY s.ord),'[]'::jsonb) INTO v_items
    FROM unnest(v_ids[1:20]) WITH ORDINALITY s(id,ord);
  IF cardinality(v_ids)>20 THEN
    SELECT updated_at,id INTO STRICT v_last FROM public.projects WHERE id=v_ids[20];
    v_cursor:=jsonb_build_object('updated_at',v_last.updated_at,'id',v_last.id);
  END IF;
  RETURN jsonb_build_object('items',v_items,'cursor',v_cursor);
END;
$list$;
CREATE FUNCTION idealab_private.get_project_v1(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $detail$
DECLARE v_project public.projects%ROWTYPE; v_control idealab_private.project_controls_v1%ROWTYPE;
  v_team boolean; v_members jsonb:='[]'::jsonb; v_requests jsonb:='[]'::jsonb; v_pending bigint:=0;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN RAISE EXCEPTION 'member access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_project FROM public.projects WHERE id=p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_team:=v_project.created_by=auth.uid() OR EXISTS(SELECT 1 FROM public.project_members WHERE project_id=p_id AND user_id=auth.uid());
  IF v_project.visibility IS DISTINCT FROM 'public' AND NOT coalesce(v_team,false) THEN RETURN NULL; END IF;
  SELECT * INTO STRICT v_control FROM idealab_private.project_controls_v1 WHERE project_id=p_id;
  IF v_team THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'role',m.role,'is_self',m.user_id=auth.uid(),'joined_at',m.joined_at) ORDER BY m.joined_at,m.id),'[]'::jsonb)
      INTO v_members FROM (SELECT * FROM public.project_members WHERE project_id=p_id ORDER BY joined_at,id LIMIT 50) m;
  END IF;
  IF v_project.created_by=auth.uid() THEN
    SELECT count(*) INTO v_pending FROM idealab_private.project_join_requests_v1 WHERE project_id=p_id AND status='pending';
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'revision',r.revision::text,'created_at',r.created_at) ORDER BY r.created_at,r.id),'[]'::jsonb)
      INTO v_requests FROM (SELECT * FROM idealab_private.project_join_requests_v1 WHERE project_id=p_id AND status='pending' ORDER BY created_at,id LIMIT 20) r;
  END IF;
  RETURN jsonb_build_object('project',idealab_private.project_card_v1(p_id),
    'join_code',CASE WHEN v_project.created_by=auth.uid() THEN v_control.join_code ELSE NULL END,
    'members',v_members,'requests',v_requests,'pending_count',v_pending);
END;
$detail$;
CREATE FUNCTION idealab_private.get_own_project_requests_v1() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $requests$
DECLARE v_result jsonb;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN RAISE EXCEPTION 'member access required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'status',s.status,'revision',s.revision::text,
    'created_at',s.created_at,'updated_at',s.updated_at,'project_id',CASE WHEN s.visible THEN s.project_id ELSE NULL END,
    'project_title',CASE WHEN s.visible THEN s.title ELSE NULL END) ORDER BY s.updated_at DESC,s.id),'[]'::jsonb)
  INTO v_result FROM (SELECT r.*,p.title,(p.visibility='public' OR p.created_by=auth.uid() OR EXISTS(SELECT 1 FROM public.project_members m WHERE m.project_id=p.id AND m.user_id=auth.uid())) AS visible
    FROM idealab_private.project_join_requests_v1 r JOIN public.projects p ON p.id=r.project_id
    WHERE r.user_id=auth.uid() ORDER BY r.updated_at DESC,r.id LIMIT 20) s;
  RETURN v_result;
END;
$requests$;

CREATE FUNCTION idealab_private.mutate_project_v1(p_command jsonb,p_command_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $mutation$
DECLARE v_actor uuid:=auth.uid(); v_kind text; v_keys text[]; v_expected_keys text[]; v_key text;
  v_project_id uuid; v_request_id uuid; v_applicant uuid; v_owner uuid; v_result jsonb; v_receipt record;
  v_project public.projects%ROWTYPE; v_control idealab_private.project_controls_v1%ROWTYPE;
  v_request idealab_private.project_join_requests_v1%ROWTYPE; v_attempt idealab_private.project_join_attempts_v1%ROWTYPE;
  v_time timestamptz; v_status text; v_changed boolean:=false; v_request_revision bigint;
BEGIN
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN RETURN jsonb_build_object('status','denied'); END IF;
  IF p_command_id IS NULL OR jsonb_typeof(p_command) IS DISTINCT FROM 'object' OR pg_column_size(p_command)>25000 THEN RETURN jsonb_build_object('status','invalid'); END IF;
  v_kind:=p_command->>'kind';
  v_expected_keys:=CASE v_kind
    WHEN 'create' THEN ARRAY['kind','title','description','visibility']
    WHEN 'update' THEN ARRAY['kind','project_id','expected_revision','title','description','visibility','stage']
    WHEN 'rotate_code' THEN ARRAY['kind','project_id','expected_revision']
    WHEN 'join' THEN ARRAY['kind','code']
    WHEN 'decide' THEN ARRAY['kind','request_id','expected_revision','decision']
    WHEN 'cancel' THEN ARRAY['kind','request_id','expected_revision']
    WHEN 'leave' THEN ARRAY['kind','project_id'] ELSE NULL END;
  SELECT array_agg(k ORDER BY k) INTO v_keys FROM jsonb_object_keys(p_command) k;
  IF v_expected_keys IS NULL OR cardinality(v_keys)<>cardinality(v_expected_keys) OR NOT v_keys @> v_expected_keys THEN RETURN jsonb_build_object('status','invalid'); END IF;
  FOREACH v_key IN ARRAY v_expected_keys LOOP
    IF jsonb_typeof(p_command->v_key) IS DISTINCT FROM 'string' THEN RETURN jsonb_build_object('status','invalid'); END IF;
  END LOOP;
  IF v_kind IN ('create','update') AND (
    length(p_command->>'title') NOT BETWEEN 1 AND 160 OR (p_command->>'title') ~ '^[[:space:]]*$' OR (p_command->>'title') ~ '[[:cntrl:]]'
    OR length(p_command->>'description') NOT BETWEEN 1 AND 4000 OR (p_command->>'description') ~ '^[[:space:]]*$'
    OR regexp_replace(p_command->>'description',E'[\t\n\r]','','g') ~ '[[:cntrl:]]'
    OR (p_command->>'visibility') NOT IN ('public','private')) THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF v_kind='update' AND (p_command->>'stage') NOT IN ('ideation','in_progress','completed','showcase') THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF v_kind='decide' AND (p_command->>'decision') NOT IN ('approve','decline') THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF p_command ? 'expected_revision' AND ((p_command->>'expected_revision') !~ '^[1-9][0-9]{0,18}$'
    OR (length(p_command->>'expected_revision')=19 AND (p_command->>'expected_revision') COLLATE "C">'9223372036854775807' COLLATE "C")) THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF p_command ? 'project_id' THEN
    IF (p_command->>'project_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN jsonb_build_object('status','invalid'); END IF;
    v_project_id:=(p_command->>'project_id')::uuid;
  END IF;
  IF p_command ? 'request_id' THEN
    IF (p_command->>'request_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN jsonb_build_object('status','invalid'); END IF;
    v_request_id:=(p_command->>'request_id')::uuid;
    SELECT r.project_id,r.user_id,p.created_by INTO v_project_id,v_applicant,v_owner
      FROM idealab_private.project_join_requests_v1 r JOIN public.projects p ON p.id=r.project_id WHERE r.id=v_request_id;
    IF NOT FOUND OR (v_kind='decide' AND v_owner IS DISTINCT FROM v_actor) OR (v_kind='cancel' AND v_applicant IS DISTINCT FROM v_actor) THEN RETURN jsonb_build_object('status','denied'); END IF;
  END IF;
  -- Deterministic profile order before project/request locks, including applicants.
  PERFORM 1 FROM public.users WHERE id=v_actor OR (v_kind='decide' AND id=v_applicant) ORDER BY id FOR UPDATE;
  IF NOT idealab_private.lab_opening_member_ready_v1() THEN RETURN jsonb_build_object('status','denied'); END IF;
  SELECT request,result INTO v_receipt FROM idealab_private.project_commands_v1 WHERE user_id=v_actor AND command_id=p_command_id;
  IF FOUND THEN
    IF v_receipt.request IS DISTINCT FROM p_command THEN RETURN jsonb_build_object('status','conflict'); END IF;
    RETURN v_receipt.result;
  END IF;
  v_time:=clock_timestamp();
  IF v_kind='create' THEN
    INSERT INTO public.projects(title,description,visibility,status,created_by,created_at,updated_at)
      VALUES(p_command->>'title',p_command->>'description',p_command->>'visibility','ideation',v_actor,v_time,v_time) RETURNING id INTO v_project_id;
    INSERT INTO idealab_private.project_controls_v1(project_id) VALUES(v_project_id);
    INSERT INTO public.project_members(project_id,user_id,role,joined_at) VALUES(v_project_id,v_actor,'lead',v_time);
    v_result:=jsonb_build_object('status','saved','project_id',v_project_id,'revision','1');
    v_changed:=true;
  ELSE
    IF v_kind='join' THEN
      SELECT * INTO v_attempt FROM idealab_private.project_join_attempts_v1 WHERE user_id=v_actor;
      IF NOT FOUND OR v_time>=v_attempt.window_started+interval '15 minutes' THEN
        INSERT INTO idealab_private.project_join_attempts_v1(user_id,window_started,attempts) VALUES(v_actor,v_time,1)
          ON CONFLICT(user_id) DO UPDATE SET window_started=excluded.window_started,attempts=1;
      ELSIF v_attempt.attempts>=10 THEN RETURN jsonb_build_object('status','try_later');
      ELSE UPDATE idealab_private.project_join_attempts_v1 SET attempts=attempts+1 WHERE user_id=v_actor; END IF;
      IF (p_command->>'code') !~ '^[A-F0-9]{32}$' THEN RETURN jsonb_build_object('status','request_unavailable'); END IF;
      SELECT project_id INTO v_project_id FROM idealab_private.project_controls_v1 WHERE join_code=p_command->>'code';
      IF NOT FOUND THEN RETURN jsonb_build_object('status','request_unavailable'); END IF;
    END IF;
    SELECT * INTO v_project FROM public.projects WHERE id=v_project_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status',CASE WHEN v_kind='join' THEN 'request_unavailable' ELSE 'denied' END); END IF;
    SELECT * INTO STRICT v_control FROM idealab_private.project_controls_v1 WHERE project_id=v_project_id;
    IF v_kind='join' THEN
      IF v_control.join_code IS DISTINCT FROM p_command->>'code' THEN RETURN jsonb_build_object('status','request_unavailable'); END IF;
      IF v_project.created_by=v_actor OR EXISTS(SELECT 1 FROM public.project_members WHERE project_id=v_project_id AND user_id=v_actor) THEN
        v_result:=jsonb_build_object('status','already_member','project_id',v_project_id);
      ELSE
        SELECT * INTO v_request FROM idealab_private.project_join_requests_v1 WHERE project_id=v_project_id AND user_id=v_actor FOR UPDATE;
        IF FOUND AND v_request.status='pending' THEN
          v_request_id:=v_request.id;
        ELSIF FOUND THEN
          IF v_request.revision=9223372036854775807 THEN RETURN jsonb_build_object('status','unavailable'); END IF;
          UPDATE idealab_private.project_join_requests_v1 SET status='pending',revision=revision+1,created_at=v_time,updated_at=v_time WHERE id=v_request.id RETURNING id,revision INTO v_request_id,v_request_revision;
          v_changed:=true;
        ELSE
          INSERT INTO idealab_private.project_join_requests_v1(project_id,user_id,created_at,updated_at) VALUES(v_project_id,v_actor,v_time,v_time) RETURNING id,revision INTO v_request_id,v_request_revision;
          v_changed:=true;
        END IF;
        v_result:=jsonb_build_object('status','requested','request_id',v_request_id);
      END IF;
    ELSIF v_kind IN ('update','rotate_code') THEN
      IF v_project.created_by IS DISTINCT FROM v_actor THEN RETURN jsonb_build_object('status','denied'); END IF;
      IF v_control.revision::text IS DISTINCT FROM p_command->>'expected_revision' THEN RETURN jsonb_build_object('status','conflict'); END IF;
      IF v_control.revision=9223372036854775807 THEN RETURN jsonb_build_object('status','unavailable'); END IF;
      IF v_kind='update' THEN
        UPDATE public.projects SET title=p_command->>'title',description=p_command->>'description',visibility=p_command->>'visibility',status=p_command->>'stage',updated_at=v_time WHERE id=v_project_id;
        UPDATE idealab_private.project_controls_v1 SET revision=revision+1 WHERE project_id=v_project_id;
      ELSE
        UPDATE idealab_private.project_controls_v1 SET join_code=upper(replace(gen_random_uuid()::text,'-','')),revision=revision+1 WHERE project_id=v_project_id;
        UPDATE public.projects SET updated_at=v_time WHERE id=v_project_id;
      END IF;
      v_result:=jsonb_build_object('status','saved','project_id',v_project_id,'revision',(v_control.revision+1)::text); v_changed:=true;
    ELSIF v_kind='leave' THEN
      IF v_project.created_by=v_actor THEN RETURN jsonb_build_object('status','creator_must_remain'); END IF;
      IF NOT EXISTS(SELECT 1 FROM public.project_members WHERE project_id=v_project_id AND user_id=v_actor) THEN RETURN jsonb_build_object('status','denied'); END IF;
      DELETE FROM public.project_members WHERE project_id=v_project_id AND user_id=v_actor;
      v_changed:=FOUND; v_result:=jsonb_build_object('status','left');
    ELSE
      SELECT * INTO STRICT v_request FROM idealab_private.project_join_requests_v1 WHERE id=v_request_id FOR UPDATE;
      IF v_request.status<>'pending' OR v_request.revision::text IS DISTINCT FROM p_command->>'expected_revision' THEN RETURN jsonb_build_object('status','conflict'); END IF;
      IF v_request.revision=9223372036854775807 THEN RETURN jsonb_build_object('status','unavailable'); END IF;
      IF v_kind='decide' THEN
        IF v_project.created_by IS DISTINCT FROM v_actor THEN RETURN jsonb_build_object('status','denied'); END IF;
        IF p_command->>'decision'='approve' THEN
          IF NOT idealab_private.project_applicant_ready_v1(v_applicant) THEN RETURN jsonb_build_object('status','applicant_unavailable'); END IF;
          INSERT INTO public.project_members(project_id,user_id,role,joined_at) VALUES(v_project_id,v_applicant,'member',v_time)
            ON CONFLICT(project_id,user_id) DO NOTHING;
          v_status:='approved';
        ELSE v_status:='declined'; END IF;
      ELSE v_status:='cancelled'; END IF;
      UPDATE idealab_private.project_join_requests_v1 SET status=v_status,revision=revision+1,updated_at=v_time WHERE id=v_request_id;
      v_request_revision:=v_request.revision+1;
      v_result:=jsonb_build_object('status','saved','project_id',CASE WHEN v_kind='decide' THEN v_project_id ELSE NULL END); v_changed:=true;
    END IF;
  END IF;
  INSERT INTO idealab_private.project_commands_v1(user_id,command_id,request,result) VALUES(v_actor,p_command_id,p_command,v_result);
  IF v_changed THEN INSERT INTO idealab_private.project_events_v1(project_id,actor_id,command_id,action,outcome,request_id,request_revision,recorded_at)
    VALUES(v_project_id,v_actor,p_command_id,v_kind,coalesce(v_status,CASE v_kind WHEN 'join' THEN 'pending' ELSE v_kind END),v_request_id,v_request_revision,v_time); END IF;
  RETURN v_result;
END;
$mutation$;

CREATE FUNCTION public.get_projects_v1(p_view text,p_query text,p_before_time timestamptz,p_before_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $p$ SELECT idealab_private.get_projects_v1(p_view,p_query,p_before_time,p_before_id); $p$;
CREATE FUNCTION public.get_project_v1(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $p$ SELECT idealab_private.get_project_v1(p_id); $p$;
CREATE FUNCTION public.get_own_project_requests_v1() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $p$ SELECT idealab_private.get_own_project_requests_v1(); $p$;
CREATE FUNCTION public.mutate_project_v1(p_command jsonb,p_command_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $p$ SELECT idealab_private.mutate_project_v1(p_command,p_command_id); $p$;
REVOKE ALL ON FUNCTION idealab_private.project_applicant_ready_v1(uuid),idealab_private.project_card_v1(uuid),
  idealab_private.get_projects_v1(text,text,timestamptz,uuid),idealab_private.get_project_v1(uuid),
  idealab_private.get_own_project_requests_v1(),idealab_private.mutate_project_v1(jsonb,uuid),
  public.get_projects_v1(text,text,timestamptz,uuid),public.get_project_v1(uuid),public.get_own_project_requests_v1(),public.mutate_project_v1(jsonb,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_projects_v1(text,text,timestamptz,uuid),idealab_private.get_project_v1(uuid),
  idealab_private.get_own_project_requests_v1(),idealab_private.mutate_project_v1(jsonb,uuid),
  public.get_projects_v1(text,text,timestamptz,uuid),public.get_project_v1(uuid),public.get_own_project_requests_v1(),public.mutate_project_v1(jsonb,uuid)
  TO authenticated;
