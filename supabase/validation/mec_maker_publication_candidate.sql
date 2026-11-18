-- Local review candidate for maker-profile drafts and publication controls.
-- Run only in the disposable PostgreSQL 17 rehearsal. Public URL resolution is
-- intentionally absent until an enforced public-read rate limit is approved.
DO $preflight$
BEGIN
  IF (SELECT nspowner FROM pg_catalog.pg_namespace WHERE nspname = 'idealab_private')
       IS DISTINCT FROM current_user::regrole
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = current_user AND rolbypassrls)
    OR NOT has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
    OR to_regclass('public.users') IS NULL
    OR to_regclass('auth.users') IS NULL
    OR to_regclass('idealab_private.student_ambassadors_v1') IS NULL
    OR to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL
    OR to_regprocedure('idealab_private.current_student_mec_admitted_v1()') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS helper
      WHERE helper.oid=to_regprocedure('idealab_private.has_current_verified_email_v1()')
        AND helper.prorettype='boolean'::regtype AND helper.provolatile='s'
        AND helper.prosecdef IS TRUE AND helper.proowner=current_user::regrole
        AND helper.proconfig @> ARRAY['search_path=""']::text[]
        AND pg_catalog.md5(pg_catalog.regexp_replace(helper.prosrc,'[[:space:]]+','','g'))
          ='86d0ffd444fa565ddbcdfa13aa3cd13a')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS helper
      WHERE helper.oid=to_regprocedure('idealab_private.current_student_mec_admitted_v1()')
        AND helper.prorettype='boolean'::regtype AND helper.provolatile='s'
        AND helper.prosecdef IS TRUE AND helper.proowner=current_user::regrole
        AND helper.proconfig @> ARRAY['search_path=""']::text[]
        AND pg_catalog.md5(pg_catalog.regexp_replace(helper.prosrc,'[[:space:]]+','','g'))
          ='6a5a8416edac96eae8fc0413cdeb5dcb')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = 'auth.users'::regclass AND attname = 'banned_until'
        AND atttypid='timestamptz'::regtype AND NOT attisdropped)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = 'public.users'::regclass AND attname = 'is_active'
        AND atttypid='boolean'::regtype AND NOT attisdropped)
    OR to_regclass('idealab_private.maker_profiles_v1') IS NOT NULL
    OR to_regclass('idealab_private.maker_publication_history_v1') IS NOT NULL
    OR to_regprocedure('public.get_own_public_profile_v1()') IS NOT NULL
    OR to_regprocedure('public.save_own_public_profile_v1(jsonb,text)') IS NOT NULL
    OR to_regprocedure('public.publish_own_public_profile_v1(text)') IS NOT NULL
    OR to_regprocedure('public.withdraw_own_public_profile_v1(text)') IS NOT NULL
    OR to_regprocedure('public.takedown_maker_profile_v1(uuid,text,text)') IS NOT NULL
    OR to_regclass('idealab_private.maker_install_state_v1') IS NOT NULL
    OR to_regprocedure('public.get_public_profile_v1(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'Maker profile baseline needs review';
  END IF;
END;
$preflight$;

CREATE FUNCTION idealab_private.validate_maker_draft_v1(p jsonb)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = ''
AS $validate$
DECLARE k text; item jsonb; url text; host text; txt text;
BEGIN
  IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR octet_length(p::text) > 32768 THEN
    RETURN false;
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p)) <> 5
    OR NOT p ?& ARRAY['display_name','bio','interests','skills','links'] THEN
    RETURN false;
  END IF;

  FOR txt IN
    SELECT value #>> '{}' FROM jsonb_path_query(p, 'strict $.** ? (@.type() == "string")') AS item(value)
  LOOP
    IF EXISTS (SELECT 1 FROM generate_series(127,159) AS code WHERE position(chr(code) IN txt) > 0) THEN
      RETURN false;
    END IF;
  END LOOP;

  FOREACH k IN ARRAY ARRAY['display_name','bio'] LOOP
    IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  END LOOP;
  IF char_length(p->>'display_name') > 80 OR (p->>'display_name') ~ '[[:cntrl:]]'
    OR char_length(p->>'bio') > 1000 OR replace(p->>'bio', E'\n', '') ~ '[[:cntrl:]]' THEN
    RETURN false;
  END IF;

  FOREACH k IN ARRAY ARRAY['interests','skills','links'] LOOP
    IF jsonb_typeof(p->k) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(p->k) > (CASE WHEN k='links' THEN 8 ELSE 20 END) THEN RETURN false; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p->k) LOOP
      IF k <> 'links' THEN
        IF jsonb_typeof(item) IS DISTINCT FROM 'string' OR btrim(item #>> '{}') = ''
          OR char_length(item #>> '{}') NOT BETWEEN 1 AND (CASE WHEN k='interests' THEN 32 ELSE 48 END)
          OR (item #>> '{}') ~ '[[:cntrl:]]' THEN
          RETURN false;
        END IF;
      ELSE
        IF jsonb_typeof(item) IS DISTINCT FROM 'object'
          OR (SELECT count(*) FROM jsonb_object_keys(item)) <> 2
          OR NOT item ?& ARRAY['label','url']
          OR jsonb_typeof(item->'label') IS DISTINCT FROM 'string'
          OR jsonb_typeof(item->'url') IS DISTINCT FROM 'string' THEN
          RETURN false;
        END IF;
        url := item->>'url';
        host := substring(url FROM '^https://([^/?#]+)');
        IF char_length(item->>'label') NOT BETWEEN 1 AND 60
          OR btrim(item->>'label') = ''
          OR (item->>'label') ~ '[[:cntrl:]]'
          OR char_length(url) > 2048
          OR url ~ '[[:space:][:cntrl:]]'
          OR position(chr(92) IN url) > 0
          OR host IS NULL OR char_length(host) > 253
          OR host !~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$'
          OR host ~ '[.]([0-9]+|0[xX][0-9A-Fa-f]*)$' THEN
          RETURN false;
        END IF;
      END IF;
    END LOOP;
    IF k <> 'links' AND
      (SELECT count(*) <> count(DISTINCT lower(btrim(value #>> '{}')))
        FROM jsonb_array_elements(p->k)) THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$validate$;

CREATE TABLE idealab_private.maker_profiles_v1 (
  owner_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  draft jsonb NOT NULL CHECK (idealab_private.validate_maker_draft_v1(draft)),
  published jsonb CHECK (published IS NULL OR idealab_private.validate_maker_draft_v1(published)),
  share_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  publication_hold boolean NOT NULL DEFAULT false,
  hold_reason_code text CHECK (hold_reason_code IS NULL OR
    hold_reason_code IN ('privacy_request','safety','policy','legal','other')),
  hold_actor_id uuid,
  hold_at timestamptz,
  CHECK (publication_hold = (hold_reason_code IS NOT NULL)),
  CHECK ((hold_reason_code IS NULL AND hold_actor_id IS NULL AND hold_at IS NULL)
      OR (hold_reason_code IS NOT NULL AND hold_actor_id IS NOT NULL AND hold_at IS NOT NULL)),
  CHECK (NOT publication_hold OR published IS NULL)
);

-- Publication history is scoped to the profile and cascades with the profile
-- deletion request. Institutional audit retention still needs MEC approval.
CREATE TABLE idealab_private.maker_publication_history_v1 (
  owner_id uuid NOT NULL REFERENCES idealab_private.maker_profiles_v1(owner_id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  actor_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('publish','withdraw','takedown')),
  reason_code text CHECK (reason_code IS NULL OR
    reason_code IN ('privacy_request','safety','policy','legal','other')),
  share_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (owner_id, revision)
);
CREATE TABLE idealab_private.maker_install_state_v1 (
  singleton smallint PRIMARY KEY CHECK (singleton=1),
  candidate_used boolean NOT NULL DEFAULT false,
  first_mutation_at timestamptz
);
INSERT INTO idealab_private.maker_install_state_v1(singleton) VALUES (1);
ALTER TABLE idealab_private.maker_profiles_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.maker_profiles_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.maker_publication_history_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.maker_publication_history_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.maker_install_state_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.maker_install_state_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON idealab_private.maker_profiles_v1, idealab_private.maker_publication_history_v1,
  idealab_private.maker_install_state_v1
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION idealab_private.maker_actor_ready_v1(p_actor uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $actor$
DECLARE account_role text; active_account boolean;
BEGIN
  IF p_actor IS NULL OR p_actor IS DISTINCT FROM auth.uid()
    OR idealab_private.has_current_verified_email_v1() IS DISTINCT FROM TRUE THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users AS account
    WHERE account.id = p_actor
      AND account.is_anonymous IS FALSE
      AND account.email_confirmed_at IS NOT NULL
      AND (account.banned_until IS NULL OR account.banned_until <= statement_timestamp())) THEN
    RETURN false;
  END IF;
  SELECT member.role::text, member.is_active
    INTO account_role, active_account
    FROM public.users AS member WHERE member.id = p_actor;
  IF NOT FOUND OR active_account IS NOT TRUE THEN RETURN false; END IF;
  IF account_role IN ('lab_admin','super_admin') THEN RETURN true; END IF;
  PERFORM ambassador.user_id FROM idealab_private.student_ambassadors_v1 AS ambassador
    WHERE ambassador.user_id = p_actor FOR SHARE;
  IF FOUND THEN RETURN true; END IF;
  IF account_role = 'student' THEN
    RETURN idealab_private.current_student_mec_admitted_v1() IS TRUE;
  END IF;
  RETURN false;
END;
$actor$;

CREATE FUNCTION idealab_private.get_own_maker_profile_v1()
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $read$
DECLARE
  actor uuid := auth.uid();
  profile idealab_private.maker_profiles_v1%ROWTYPE;
  shown jsonb;
BEGIN
  IF actor IS NULL THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  PERFORM account.id FROM auth.users AS account
    WHERE account.id=actor AND account.is_anonymous IS FALSE
      AND account.email_confirmed_at IS NOT NULL
      AND (account.banned_until IS NULL OR account.banned_until<=statement_timestamp())
    FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  PERFORM member.id FROM public.users AS member WHERE member.id=actor FOR SHARE;
  IF NOT FOUND OR idealab_private.maker_actor_ready_v1(actor) IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('status','unauthorized');
  END IF;

  SELECT * INTO profile FROM idealab_private.maker_profiles_v1 WHERE owner_id=actor;
  IF NOT FOUND THEN
    shown := jsonb_build_object(
      'public_id',NULL,'revision','0','initialized',false,'display_name',NULL,
      'bio','','interests','[]'::jsonb,'skills','[]'::jsonb,'links','[]'::jsonb,'visibility','private'
    );
    RETURN jsonb_build_object('status','ready','profile',shown);
  END IF;

  shown := coalesce(profile.published,profile.draft) || jsonb_build_object(
    'public_id',profile.share_id,'revision',profile.revision::text,'initialized',true,
    'visibility',CASE WHEN profile.published IS NULL THEN 'private' ELSE 'public' END
  );
  RETURN jsonb_build_object('status','ready','profile',shown);
END;
$read$;

CREATE FUNCTION idealab_private.mutate_maker_profile_v1(
  p_operation text, p_expected_revision text, p_draft jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $mutate$
DECLARE
  actor uuid := auth.uid();
  expected bigint;
  normalized_draft jsonb;
  current_profile idealab_private.maker_profiles_v1%ROWTYPE;
  next_revision bigint;
  old_share_id uuid;
  marker_rows integer;
BEGIN
  IF actor IS NULL THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  PERFORM account.id FROM auth.users AS account WHERE account.id=actor FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  PERFORM member.id FROM public.users AS member WHERE member.id=actor FOR UPDATE;
  IF NOT FOUND OR NOT idealab_private.maker_actor_ready_v1(actor) THEN
    RETURN jsonb_build_object('status','unauthorized');
  END IF;
  IF p_operation IS NULL OR p_operation NOT IN ('save_draft','publish','withdraw')
    OR p_expected_revision IS NULL
    OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
    OR (length(p_expected_revision)=19 AND p_expected_revision COLLATE "C">='9223372036854775807')
    OR (p_operation='save_draft' AND NOT idealab_private.validate_maker_draft_v1(p_draft))
    OR (p_operation<>'save_draft' AND p_draft IS NOT NULL) THEN
    RETURN jsonb_build_object('status','invalid');
  END IF;
  expected := p_expected_revision::bigint;
  SELECT * INTO current_profile
    FROM idealab_private.maker_profiles_v1 WHERE owner_id=actor FOR UPDATE;
  IF coalesce(current_profile.revision,0) <> expected THEN
    RETURN jsonb_build_object('status','conflict');
  END IF;
  IF expected = 9223372036854775807 THEN
    RETURN jsonb_build_object('status','invalid');
  END IF;

  IF p_operation='save_draft' THEN
    IF current_profile.owner_id IS NOT NULL AND current_profile.published IS NOT NULL THEN
      RETURN jsonb_build_object('status','invalid');
    END IF;
    SELECT jsonb_set(
      p_draft, '{links}',
      coalesce(jsonb_agg(jsonb_build_object(
        'label',btrim(item.value->>'label'),'url',item.value->>'url'
      ) ORDER BY item.ordinality),'[]'::jsonb),
      false
    ) INTO normalized_draft
    FROM jsonb_array_elements(p_draft->'links') WITH ORDINALITY AS item(value,ordinality);
    UPDATE idealab_private.maker_install_state_v1
      SET candidate_used=true,first_mutation_at=coalesce(first_mutation_at,clock_timestamp())
      WHERE singleton=1;
    GET DIAGNOSTICS marker_rows = ROW_COUNT;
    IF marker_rows <> 1 THEN RAISE EXCEPTION 'Maker profile candidate use marker is missing'; END IF;
    IF current_profile.owner_id IS NULL THEN
      INSERT INTO idealab_private.maker_profiles_v1(owner_id,revision,draft,share_id)
        VALUES(actor,1,normalized_draft,gen_random_uuid())
        RETURNING * INTO current_profile;
    ELSE
      next_revision := expected+1;
      UPDATE idealab_private.maker_profiles_v1
        SET revision=next_revision,draft=normalized_draft
        WHERE owner_id=actor RETURNING * INTO current_profile;
    END IF;
  ELSE
    IF current_profile.owner_id IS NULL
      OR (p_operation='withdraw' AND current_profile.published IS NULL)
      OR (p_operation='publish' AND (
        current_profile.publication_hold
        OR current_profile.published IS NOT NULL
        OR current_profile.draft->>'display_name' !~ '[^[:space:]]'
        OR current_profile.draft->>'bio' !~ '[^[:space:]]'
        OR jsonb_array_length(current_profile.draft->'interests')=0
      )) THEN
      RETURN jsonb_build_object('status','invalid');
    END IF;
    next_revision := expected+1;
    old_share_id := current_profile.share_id;
    UPDATE idealab_private.maker_install_state_v1
      SET candidate_used=true,first_mutation_at=coalesce(first_mutation_at,clock_timestamp())
      WHERE singleton=1;
    GET DIAGNOSTICS marker_rows = ROW_COUNT;
    IF marker_rows <> 1 THEN RAISE EXCEPTION 'Maker profile candidate use marker is missing'; END IF;
    IF p_operation='publish' THEN
      UPDATE idealab_private.maker_profiles_v1 SET
        revision=next_revision,published=draft,share_id=gen_random_uuid()
        WHERE owner_id=actor RETURNING * INTO current_profile;
    ELSE
      UPDATE idealab_private.maker_profiles_v1 SET
        revision=next_revision,published=NULL,share_id=gen_random_uuid()
        WHERE owner_id=actor RETURNING * INTO current_profile;
    END IF;
    INSERT INTO idealab_private.maker_publication_history_v1
      (owner_id,revision,actor_id,operation,share_id)
    VALUES(actor,current_profile.revision,actor,p_operation,
      CASE WHEN p_operation='publish' THEN current_profile.share_id ELSE old_share_id END);
  END IF;
  RETURN jsonb_build_object('status','saved','revision',current_profile.revision::text,
    'share_id',current_profile.share_id);
END;
$mutate$;

CREATE FUNCTION idealab_private.takedown_maker_profile_v1(
  p_share_id uuid, p_expected_revision text, p_reason_code text
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $takedown$
DECLARE
  actor uuid := auth.uid();
  target uuid;
  actor_role text;
  profile idealab_private.maker_profiles_v1%ROWTYPE;
  locked_count integer;
  next_revision bigint;
  old_share_id uuid;
  marker_rows integer;
BEGIN
  IF actor IS NULL THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  IF p_share_id IS NULL OR p_expected_revision IS NULL
    OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
    OR (length(p_expected_revision)=19 AND p_expected_revision COLLATE "C">='9223372036854775807')
    OR p_reason_code IS NULL
    OR p_reason_code NOT IN ('privacy_request','safety','policy','legal','other') THEN
    RETURN jsonb_build_object('status','invalid');
  END IF;

  PERFORM account.id FROM auth.users AS account
    WHERE account.id=actor AND account.is_anonymous IS FALSE
      AND account.email_confirmed_at IS NOT NULL
      AND (account.banned_until IS NULL OR account.banned_until<=statement_timestamp())
    FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  SELECT member.role::text INTO actor_role FROM public.users AS member
    WHERE member.id=actor AND member.is_active IS TRUE;
  IF NOT FOUND OR idealab_private.has_current_verified_email_v1() IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('status','unauthorized');
  END IF;
  IF actor_role IS DISTINCT FROM 'super_admin' THEN
    IF NOT EXISTS (SELECT 1 FROM idealab_private.student_ambassadors_v1 AS ambassador
      WHERE ambassador.user_id=actor) THEN
      RETURN jsonb_build_object('status','unauthorized');
    END IF;
  END IF;

  SELECT owner_id INTO target FROM idealab_private.maker_profiles_v1
    WHERE share_id=p_share_id AND published IS NOT NULL AND NOT publication_hold;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
  PERFORM account.id FROM auth.users AS account
    WHERE account.id IN (actor,target) ORDER BY account.id FOR SHARE;
  GET DIAGNOSTICS locked_count = ROW_COUNT;
  IF locked_count <> (CASE WHEN actor=target THEN 1 ELSE 2 END) THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;
  PERFORM member.id FROM public.users AS member
    WHERE member.id IN (actor,target) ORDER BY member.id FOR UPDATE;
  GET DIAGNOSTICS locked_count = ROW_COUNT;
  IF locked_count <> (CASE WHEN actor=target THEN 1 ELSE 2 END) THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;
  IF idealab_private.maker_actor_ready_v1(actor) IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('status','unauthorized');
  END IF;
  SELECT member.role::text INTO actor_role FROM public.users AS member
    WHERE member.id=actor AND member.is_active IS TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','unauthorized');
  END IF;
  IF actor_role IS DISTINCT FROM 'super_admin' THEN
    PERFORM ambassador.user_id FROM idealab_private.student_ambassadors_v1 AS ambassador
      WHERE ambassador.user_id=actor FOR SHARE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  END IF;

  SELECT * INTO profile FROM idealab_private.maker_profiles_v1
    WHERE share_id=p_share_id AND published IS NOT NULL AND NOT publication_hold FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF profile.revision <> p_expected_revision::bigint THEN
    RETURN jsonb_build_object('status','conflict');
  END IF;
  IF profile.revision=9223372036854775807 THEN RETURN jsonb_build_object('status','invalid'); END IF;
  next_revision := profile.revision+1;
  old_share_id := profile.share_id;
  UPDATE idealab_private.maker_install_state_v1
    SET candidate_used=true,first_mutation_at=coalesce(first_mutation_at,clock_timestamp())
    WHERE singleton=1;
  GET DIAGNOSTICS marker_rows = ROW_COUNT;
  IF marker_rows <> 1 THEN RAISE EXCEPTION 'Maker profile candidate use marker is missing'; END IF;
  UPDATE idealab_private.maker_profiles_v1 SET
    revision=next_revision,published=NULL,share_id=gen_random_uuid(),
    publication_hold=true,hold_reason_code=p_reason_code,hold_actor_id=actor,hold_at=clock_timestamp()
    WHERE owner_id=target;
  INSERT INTO idealab_private.maker_publication_history_v1
    (owner_id,revision,actor_id,operation,reason_code,share_id)
  VALUES(target,next_revision,actor,'takedown',p_reason_code,old_share_id);
  RETURN jsonb_build_object('status','saved','revision',next_revision::text,
    'share_id',(SELECT share_id FROM idealab_private.maker_profiles_v1 WHERE owner_id=target));
END;
$takedown$;

CREATE FUNCTION public.get_own_public_profile_v1()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $wrapper$
BEGIN
  RETURN idealab_private.get_own_maker_profile_v1();
END;
$wrapper$;

CREATE FUNCTION public.save_own_public_profile_v1(p_payload jsonb, p_expected_revision text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $wrapper$
DECLARE receipt jsonb; saved jsonb;
BEGIN
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>6
    OR NOT p_payload ?& ARRAY['display_name','bio','interests','skills','links','visibility']
    OR p_payload->>'visibility' IS DISTINCT FROM 'private' THEN
    RETURN jsonb_build_object('status','invalid');
  END IF;
  receipt := idealab_private.mutate_maker_profile_v1('save_draft',p_expected_revision,p_payload-'visibility');
  IF receipt->>'status' NOT IN ('saved','conflict') THEN RETURN receipt; END IF;
  saved := idealab_private.get_own_maker_profile_v1();
  IF saved->>'status' IS DISTINCT FROM 'ready' THEN
    RETURN jsonb_build_object('status','unauthorized');
  END IF;
  RETURN jsonb_build_object('status',receipt->>'status','profile',saved->'profile');
END;
$wrapper$;

CREATE FUNCTION public.publish_own_public_profile_v1(p_expected_revision text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $wrapper$
DECLARE receipt jsonb; saved jsonb;
BEGIN
  receipt := idealab_private.mutate_maker_profile_v1('publish',p_expected_revision,NULL);
  IF receipt->>'status' <> 'saved' THEN RETURN receipt; END IF;
  saved := idealab_private.get_own_maker_profile_v1();
  IF saved->>'status' IS DISTINCT FROM 'ready' THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  RETURN jsonb_build_object('status','saved','profile',saved->'profile');
END;
$wrapper$;

CREATE FUNCTION public.withdraw_own_public_profile_v1(p_expected_revision text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $wrapper$
DECLARE receipt jsonb; saved jsonb;
BEGIN
  receipt := idealab_private.mutate_maker_profile_v1('withdraw',p_expected_revision,NULL);
  IF receipt->>'status' <> 'saved' THEN RETURN receipt; END IF;
  saved := idealab_private.get_own_maker_profile_v1();
  IF saved->>'status' IS DISTINCT FROM 'ready' THEN RETURN jsonb_build_object('status','unauthorized'); END IF;
  RETURN jsonb_build_object('status','saved','profile',saved->'profile');
END;
$wrapper$;

CREATE FUNCTION public.takedown_maker_profile_v1(
  p_share_id uuid, p_expected_revision text, p_reason_code text
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $wrapper$
BEGIN
  RETURN idealab_private.takedown_maker_profile_v1(p_share_id,p_expected_revision,p_reason_code);
END;
$wrapper$;

REVOKE ALL ON FUNCTION idealab_private.validate_maker_draft_v1(jsonb),
  idealab_private.maker_actor_ready_v1(uuid),
  idealab_private.get_own_maker_profile_v1(),
  idealab_private.mutate_maker_profile_v1(text,text,jsonb),
  idealab_private.takedown_maker_profile_v1(uuid,text,text),
  public.get_own_public_profile_v1(),
  public.save_own_public_profile_v1(jsonb,text),
  public.publish_own_public_profile_v1(text),
  public.withdraw_own_public_profile_v1(text),
  public.takedown_maker_profile_v1(uuid,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_own_public_profile_v1(),
  public.save_own_public_profile_v1(jsonb,text),
  public.publish_own_public_profile_v1(text),
  public.withdraw_own_public_profile_v1(text),
  public.takedown_maker_profile_v1(uuid,text,text)
  TO authenticated;

-- No public.get_public_profile_v1 resolver is installed here. The anonymous
-- endpoint must not be enabled until its API-level rate limit and cache
-- invalidation contract are implemented and tested outside PostgreSQL.
