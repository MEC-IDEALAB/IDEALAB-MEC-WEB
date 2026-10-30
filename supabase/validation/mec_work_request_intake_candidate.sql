-- Isolated-only intake, no production receiver/staff authority.
-- MUST execute in one explicit transaction including final ACL/catalog checks.
-- No partial/autocommit application: definer functions are revoked before commit.
DO $preflight$ BEGIN
  IF current_user<>'postgres' OR current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999
    OR to_regprocedure('idealab_private.current_student_mec_admitted_v1()') IS NULL
    OR to_regclass('idealab_private.work_requests_v1') IS NOT NULL OR to_regclass('public.work_requests') IS NOT NULL
    OR to_regclass('idealab_private.work_request_commands_v1') IS NOT NULL OR to_regclass('idealab_private.work_request_events_v1') IS NOT NULL
    OR to_regclass('idealab_private.work_request_archive_v1') IS NOT NULL
    OR to_regprocedure('public.submit_work_request_v1(jsonb,uuid)') IS NOT NULL
    OR to_regprocedure('public.cancel_work_request_v1(uuid,text,uuid)') IS NOT NULL
    OR to_regprocedure('public.get_own_work_request_v1(uuid)') IS NOT NULL
    OR to_regprocedure('public.get_own_work_requests_v1(timestamptz,uuid)') IS NOT NULL THEN RAISE EXCEPTION 'unexpected isolated intake baseline'; END IF;
END; $preflight$;
CREATE TABLE idealab_private.work_requests_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('machine','operations')), service_id text NOT NULL,
  title text NOT NULL, description text NOT NULL, technical_details text NOT NULL DEFAULT '',
  preferred_at timestamptz, reference_links jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','cancelled')),
  revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
  head_claimed_at timestamptz, review_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX work_requests_owner_recent_v1 ON idealab_private.work_requests_v1(owner_id,created_at DESC,id DESC);
CREATE TABLE idealab_private.work_request_commands_v1 (
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, command_id uuid NOT NULL,
  payload jsonb NOT NULL, result jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(owner_id,command_id)
);
CREATE TABLE idealab_private.work_request_events_v1 (
  request_id uuid NOT NULL REFERENCES idealab_private.work_requests_v1(id) ON DELETE CASCADE, revision bigint NOT NULL CHECK(revision IN (1,2)),
  actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, command_id uuid NOT NULL,
  status text NOT NULL CHECK(status IN ('submitted','cancelled')), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(request_id,revision), FOREIGN KEY(actor_id,command_id) REFERENCES idealab_private.work_request_commands_v1(owner_id,command_id) ON DELETE CASCADE
);
CREATE TABLE idealab_private.work_request_archive_v1 (
  archive_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('machine','operations')),
  service_id text NOT NULL, status text NOT NULL CHECK(status IN ('submitted','cancelled')), history jsonb NOT NULL
);
DO $tables$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['idealab_private.work_requests_v1','idealab_private.work_request_commands_v1','idealab_private.work_request_events_v1','idealab_private.work_request_archive_v1'] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',t); EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON %s FROM PUBLIC,anon,authenticated,service_role',t);
  END LOOP;
END; $tables$;
-- Private archive holds fresh IDs and service/status/month only. No original
-- account/request/command IDs, private text, links or exact timestamps survive.
CREATE FUNCTION idealab_private.archive_work_requests_v1(p_owner uuid) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $archive$
BEGIN
  PERFORM 1 FROM public.users WHERE id=p_owner FOR UPDATE;
  INSERT INTO idealab_private.work_request_archive_v1(kind,service_id,status,history)
    SELECT r.kind,r.service_id,r.status,coalesce((SELECT jsonb_agg(jsonb_build_object('status',e.status,
      'month',to_char(e.recorded_at AT TIME ZONE 'Asia/Kolkata','YYYY-MM')) ORDER BY e.revision)
      FROM idealab_private.work_request_events_v1 e WHERE e.request_id=r.id),'[]'::jsonb)
    FROM idealab_private.work_requests_v1 r WHERE r.owner_id=p_owner;
  DELETE FROM idealab_private.work_requests_v1 WHERE owner_id=p_owner;
  DELETE FROM idealab_private.work_request_commands_v1 WHERE owner_id=p_owner;
END; $archive$;
CREATE FUNCTION idealab_private.archive_deleted_user_work_requests_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $trigger$
BEGIN
  IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME<>'users' OR TG_NAME<>'archive_deleted_user_work_requests_v1'
    OR TG_OP<>'DELETE' OR TG_LEVEL<>'ROW' OR TG_WHEN<>'BEFORE' THEN RAISE EXCEPTION 'requires exact internal user-delete trigger'; END IF;
  PERFORM idealab_private.archive_work_requests_v1(OLD.id);
  RETURN OLD;
END; $trigger$;
CREATE TRIGGER archive_deleted_user_work_requests_v1 BEFORE DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION idealab_private.archive_deleted_user_work_requests_v1();
-- HTTP URL projection used by the JS URL parser: ASCII authority, IP literals,
-- bounded port, canonicalized path. No credentials, whitespace or backslashes.
CREATE FUNCTION idealab_private.valid_work_reference_v1(p text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $url$
DECLARE authority text; hostname text; port text; ip inet; tail text;
BEGIN
  IF p IS NULL OR length(p)>2048 OR p !~ '^https?://[^/?#]+/' OR p ~ '[[:space:][:cntrl:]]' OR strpos(p,chr(92))>0 THEN RETURN false; END IF;
  authority:=substring(p FROM '^https?://([^/?#]+)');
  IF strpos(authority,'@')>0 THEN RETURN false; END IF;
  IF left(authority,1)='[' THEN
    IF authority !~ '^\[[0-9a-fA-F: .]+\](:[0-9]{1,5})?$' THEN RETURN false; END IF;
    hostname:=substring(authority FROM '^\[([^]]+)\]'); port:=substring(authority FROM '\]:([0-9]+)$');
    BEGIN ip:=hostname::inet; IF family(ip)<>6 THEN RETURN false; END IF; EXCEPTION WHEN OTHERS THEN RETURN false; END;
  ELSE
    IF authority !~ '^[A-Za-z0-9_.-]+(:[0-9]{1,5})?$' THEN RETURN false; END IF;
    hostname:=split_part(authority,':',1); port:=substring(authority FROM ':([0-9]+)$');
    IF hostname ~* '(^|[.])xn--([.]|$)' THEN RETURN false; END IF;
    tail:=substring(rtrim(hostname,'.') FROM '[^.]+$');
    IF tail ~* '^(0x[0-9a-f]+|[0-9]+)$' THEN
      IF hostname !~ '^[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+$' THEN RETURN false; END IF;
      BEGIN ip:=hostname::inet; IF family(ip)<>4 OR host(ip)<>hostname THEN RETURN false; END IF; EXCEPTION WHEN OTHERS THEN RETURN false; END;
    END IF;
    IF length(hostname)=0 THEN RETURN false; END IF;
  END IF;
  IF port IS NOT NULL AND port::integer>65535 THEN RETURN false; END IF;
  RETURN true;
END; $url$;
CREATE FUNCTION idealab_private.valid_work_intake_v1(p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $validate$
DECLARE keys text[]; k text; link jsonb; stamp timestamptz;
  edge_space text:=E'(^[[:space:]\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]|[[:space:]\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]$)';
BEGIN
  IF jsonb_typeof(p) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  SELECT array_agg(x ORDER BY x) INTO keys FROM jsonb_object_keys(p) x;
  IF keys IS DISTINCT FROM ARRAY['description','kind','preferred_at','references','service_id','technical_details','title']::text[] THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['description','kind','service_id','technical_details','title'] LOOP
    IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  END LOOP;
  IF NOT ((p->>'kind'='machine' AND p->>'service_id' IN ('laser-cutting','3d-printing','cnc','cup-printing','t-shirt-printing','3d-design','laser-design','lathe','woodwork'))
    OR (p->>'kind'='operations' AND p->>'service_id' IN ('components','ics','electronics-tools','hardware'))) THEN RETURN false; END IF;
  IF length(p->>'title') NOT BETWEEN 5 AND 120 OR p->>'title' ~ edge_space OR p->>'title' ~ '[[:cntrl:]]'
    OR length(p->>'description') NOT BETWEEN 20 AND 5000 OR p->>'description' ~ edge_space
    OR length(btrim(p->>'description'))<20 OR regexp_replace(p->>'description',E'[\t\n\r]','','g') ~ '[[:cntrl:]]'
    OR length(p->>'technical_details')>2000 OR regexp_replace(p->>'technical_details',E'[\t\n\r]','','g') ~ '[[:cntrl:]]' THEN RETURN false; END IF;
  IF p->'preferred_at'<>'null'::jsonb THEN
    IF jsonb_typeof(p->'preferred_at') IS DISTINCT FROM 'string' OR length(p->>'preferred_at')>40 OR p->>'preferred_at' !~ '^[0-9]{4}-(0[1-9]|1[0-2])-([012][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN RETURN false; END IF;
    BEGIN stamp:=(p->>'preferred_at')::timestamptz; IF NOT isfinite(stamp) THEN RETURN false; END IF; EXCEPTION WHEN OTHERS THEN RETURN false; END;
  END IF;
  IF jsonb_typeof(p->'references') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(p->'references')>5 THEN RETURN false; END IF;
  FOR link IN SELECT value FROM jsonb_array_elements(p->'references') LOOP
    IF jsonb_typeof(link) IS DISTINCT FROM 'string' OR NOT idealab_private.valid_work_reference_v1(link#>>'{}') THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END; $validate$;
CREATE FUNCTION idealab_private.work_request_card_v1(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $card$
  SELECT jsonb_build_object('id',id,'kind',kind,'service_id',service_id,'title',title,'status',status,'revision',revision::text,
    'created_at',created_at,'updated_at',updated_at,'can_cancel',status='submitted' AND head_claimed_at IS NULL AND review_started_at IS NULL)
  FROM idealab_private.work_requests_v1 WHERE id=p_id AND owner_id=auth.uid();
$card$;
CREATE FUNCTION idealab_private.get_own_work_requests_v1(p_before_time timestamptz,p_before_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $list$
DECLARE ids uuid[]; items jsonb; cursor jsonb:=NULL; last_row record;
BEGIN
  IF NOT idealab_private.current_student_mec_admitted_v1() THEN RAISE EXCEPTION 'student admission required' USING ERRCODE='42501'; END IF;
  IF (p_before_time IS NULL) IS DISTINCT FROM (p_before_id IS NULL) THEN RAISE EXCEPTION 'invalid cursor' USING ERRCODE='22023'; END IF;
  SELECT array_agg(s.id ORDER BY s.created_at DESC,s.id DESC) INTO ids FROM (SELECT id,created_at FROM idealab_private.work_requests_v1
    WHERE owner_id=auth.uid() AND (p_before_time IS NULL OR (created_at,id)<(p_before_time,p_before_id)) ORDER BY created_at DESC,id DESC LIMIT 21) s;
  SELECT coalesce(jsonb_agg(idealab_private.work_request_card_v1(s.id) ORDER BY s.ord),'[]'::jsonb) INTO items FROM unnest(ids[1:20]) WITH ORDINALITY s(id,ord);
  IF cardinality(ids)>20 THEN SELECT created_at,id INTO STRICT last_row FROM idealab_private.work_requests_v1 WHERE id=ids[20]; cursor:=jsonb_build_object('created_at',last_row.created_at,'id',last_row.id); END IF;
  RETURN jsonb_build_object('items',items,'cursor',cursor);
END; $list$;
CREATE FUNCTION idealab_private.get_own_work_request_v1(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $detail$
DECLARE r idealab_private.work_requests_v1%ROWTYPE; history jsonb;
BEGIN
  IF NOT idealab_private.current_student_mec_admitted_v1() THEN RAISE EXCEPTION 'student admission required' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM idealab_private.work_requests_v1 WHERE id=p_id AND owner_id=auth.uid(); IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('status',status,'recorded_at',recorded_at) ORDER BY revision),'[]'::jsonb) INTO history FROM idealab_private.work_request_events_v1 WHERE request_id=p_id;
  RETURN idealab_private.work_request_card_v1(p_id)||jsonb_build_object('description',r.description,'technical_details',r.technical_details,'preferred_at',r.preferred_at,'references',r.reference_links,'history',history);
END; $detail$;
CREATE FUNCTION idealab_private.submit_work_request_v1(p_intake jsonb,p_command_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $submit$
DECLARE actor uuid:=auth.uid(); receipt record; request_id uuid; result jsonb; stamp timestamptz; payload jsonb;
BEGIN
  IF NOT idealab_private.current_student_mec_admitted_v1() THEN RETURN '{"status":"denied"}'::jsonb; END IF;
  IF p_command_id IS NULL OR NOT idealab_private.valid_work_intake_v1(p_intake) THEN RETURN '{"status":"invalid"}'::jsonb; END IF;
  PERFORM 1 FROM public.users WHERE id=actor FOR UPDATE;
  IF NOT idealab_private.current_student_mec_admitted_v1() THEN RETURN '{"status":"denied"}'::jsonb; END IF;
  payload:=jsonb_build_object('action','submit','intake',p_intake);
  SELECT c.payload,c.result INTO receipt FROM idealab_private.work_request_commands_v1 c WHERE owner_id=actor AND command_id=p_command_id;
  IF FOUND THEN IF receipt.payload IS DISTINCT FROM payload THEN RETURN '{"status":"conflict"}'::jsonb; END IF; RETURN receipt.result; END IF;
  stamp:=clock_timestamp();
  INSERT INTO idealab_private.work_requests_v1(owner_id,kind,service_id,title,description,technical_details,preferred_at,reference_links,created_at,updated_at)
    VALUES(actor,p_intake->>'kind',p_intake->>'service_id',p_intake->>'title',p_intake->>'description',p_intake->>'technical_details',(p_intake->>'preferred_at')::timestamptz,p_intake->'references',stamp,stamp) RETURNING id INTO request_id;
  result:=jsonb_build_object('status','submitted','request_id',request_id);
  INSERT INTO idealab_private.work_request_commands_v1(owner_id,command_id,payload,result) VALUES(actor,p_command_id,payload,result);
  INSERT INTO idealab_private.work_request_events_v1(request_id,revision,actor_id,command_id,status,recorded_at) VALUES(request_id,1,actor,p_command_id,'submitted',stamp);
  RETURN result;
END; $submit$;
CREATE FUNCTION idealab_private.cancel_work_request_v1(p_id uuid,p_expected_revision text,p_command_id uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $cancel$
DECLARE actor uuid:=auth.uid(); receipt record; r idealab_private.work_requests_v1%ROWTYPE; result jsonb; payload jsonb; stamp timestamptz;
BEGIN
  IF NOT idealab_private.current_student_mec_admitted_v1() THEN RETURN '{"status":"denied"}'::jsonb; END IF;
  IF p_id IS NULL OR p_command_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision !~ '^[1-9][0-9]{0,18}$'
    OR (length(p_expected_revision)=19 AND p_expected_revision COLLATE "C">'9223372036854775807' COLLATE "C") THEN RETURN '{"status":"invalid"}'::jsonb; END IF;
  PERFORM 1 FROM public.users WHERE id=actor FOR UPDATE;
  IF NOT idealab_private.current_student_mec_admitted_v1() THEN RETURN '{"status":"denied"}'::jsonb; END IF;
  payload:=jsonb_build_object('action','cancel','id',p_id,'expected_revision',p_expected_revision);
  SELECT c.payload,c.result INTO receipt FROM idealab_private.work_request_commands_v1 c WHERE owner_id=actor AND command_id=p_command_id;
  IF FOUND THEN IF receipt.payload IS DISTINCT FROM payload THEN RETURN '{"status":"conflict"}'::jsonb; END IF; RETURN receipt.result; END IF;
  SELECT * INTO r FROM idealab_private.work_requests_v1 WHERE id=p_id AND owner_id=actor FOR UPDATE;
  IF NOT FOUND THEN RETURN '{"status":"denied"}'::jsonb; END IF;
  IF r.revision::text IS DISTINCT FROM p_expected_revision OR r.status<>'submitted' THEN RETURN '{"status":"conflict"}'::jsonb; END IF;
  IF r.head_claimed_at IS NOT NULL OR r.review_started_at IS NOT NULL THEN RETURN '{"status":"review_required"}'::jsonb; END IF;
  stamp:=clock_timestamp();
  UPDATE idealab_private.work_requests_v1 SET status='cancelled',revision=2,updated_at=stamp WHERE id=p_id;
  result:=jsonb_build_object('status','cancelled','request_id',p_id);
  INSERT INTO idealab_private.work_request_commands_v1(owner_id,command_id,payload,result) VALUES(actor,p_command_id,payload,result);
  INSERT INTO idealab_private.work_request_events_v1(request_id,revision,actor_id,command_id,status,recorded_at) VALUES(p_id,2,actor,p_command_id,'cancelled',stamp);
  RETURN result;
END; $cancel$;
CREATE FUNCTION public.get_own_work_requests_v1(p_before_time timestamptz,p_before_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT idealab_private.get_own_work_requests_v1(p_before_time,p_before_id); $$;
CREATE FUNCTION public.get_own_work_request_v1(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT idealab_private.get_own_work_request_v1(p_id); $$;
CREATE FUNCTION public.submit_work_request_v1(p_intake jsonb,p_command_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $$ SELECT idealab_private.submit_work_request_v1(p_intake,p_command_id); $$;
CREATE FUNCTION public.cancel_work_request_v1(p_id uuid,p_expected_revision text,p_command_id uuid) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $$ SELECT idealab_private.cancel_work_request_v1(p_id,p_expected_revision,p_command_id); $$;
REVOKE ALL ON FUNCTION idealab_private.archive_work_requests_v1(uuid),idealab_private.archive_deleted_user_work_requests_v1(),idealab_private.valid_work_reference_v1(text),idealab_private.valid_work_intake_v1(jsonb),idealab_private.work_request_card_v1(uuid),
  idealab_private.get_own_work_requests_v1(timestamptz,uuid),idealab_private.get_own_work_request_v1(uuid),idealab_private.submit_work_request_v1(jsonb,uuid),idealab_private.cancel_work_request_v1(uuid,text,uuid),
  public.get_own_work_requests_v1(timestamptz,uuid),public.get_own_work_request_v1(uuid),public.submit_work_request_v1(jsonb,uuid),public.cancel_work_request_v1(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION idealab_private.get_own_work_requests_v1(timestamptz,uuid),idealab_private.get_own_work_request_v1(uuid),idealab_private.submit_work_request_v1(jsonb,uuid),idealab_private.cancel_work_request_v1(uuid,text,uuid),
  public.get_own_work_requests_v1(timestamptz,uuid),public.get_own_work_request_v1(uuid),public.submit_work_request_v1(jsonb,uuid),public.cancel_work_request_v1(uuid,text,uuid) TO authenticated;
