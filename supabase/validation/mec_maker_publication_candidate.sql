-- Additive local review candidate. Use one transaction on a disposable database.
DO $preflight$
BEGIN
  IF (SELECT nspowner FROM pg_namespace WHERE nspname = 'idealab_private') IS DISTINCT FROM current_user::regrole
    OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolbypassrls)
    OR NOT has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
    OR to_regprocedure('idealab_private.has_current_verified_email_v1()') IS NULL
    OR to_regprocedure('idealab_private.current_student_mec_admitted_v1()') IS NULL THEN
    RAISE EXCEPTION 'Maker profile baseline needs review';
  END IF;
END;
$preflight$;

-- Five authored fields reuse the shared profile validator rules.
CREATE FUNCTION idealab_private.validate_maker_draft_v1(p jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $validate$
DECLARE k text; item jsonb; url text; host text; txt text;
BEGIN
  IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR octet_length(p::text)>32768 THEN RETURN false; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p))<>5
    OR NOT p ?& ARRAY['display_name','bio','interests','skills','links'] THEN RETURN false; END IF;
  -- Locale-independent DEL/C1 rejection across all payload string values.
  -- jsonpath recursively visits strings without treating object keys as content.
  FOR txt IN SELECT value#>>'{}' FROM jsonb_path_query(p,'strict $.** ? (@.type() == "string")') value LOOP
    IF EXISTS(SELECT FROM generate_series(127,159) code WHERE position(chr(code) IN txt)>0) THEN RETURN false; END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['display_name','bio'] LOOP
    IF jsonb_typeof(p->k) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  END LOOP;
  IF char_length(p->>'display_name')>80 OR (p->>'display_name') ~ '[[:cntrl:]]'
    OR char_length(p->>'bio')>1000 OR replace(p->>'bio',E'\n','') ~ '[[:cntrl:]]' THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['interests','skills','links'] LOOP
    IF jsonb_typeof(p->k) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(p->k)>(CASE WHEN k='links' THEN 8 ELSE 20 END) THEN RETURN false; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p->k) LOOP
      IF k<>'links' THEN
        IF jsonb_typeof(item) IS DISTINCT FROM 'string' OR btrim(item#>>'{}')=''
          OR char_length(item#>>'{}') NOT BETWEEN 1 AND (CASE WHEN k='interests' THEN 32 ELSE 48 END)
          OR (item#>>'{}') ~ '[[:cntrl:]]' THEN RETURN false; END IF;
      ELSE
        IF jsonb_typeof(item) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
        IF (SELECT count(*) FROM jsonb_object_keys(item))<>2 OR NOT item ?& ARRAY['label','url']
          OR jsonb_typeof(item->'label') IS DISTINCT FROM 'string'
          OR jsonb_typeof(item->'url') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
        url := item->>'url';
        host := substring(url FROM '^https://([^/?#]+)');
        IF char_length(btrim(item->>'label')) NOT BETWEEN 1 AND 60 OR (item->>'label') ~ '[[:cntrl:]]'
          OR char_length(url)>2048 OR url ~ '[[:space:][:cntrl:]]' OR position(chr(92) IN url)>0
          OR host IS NULL OR char_length(host)>253
          OR host !~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$'
          OR host ~ '[.]([0-9]+|0[xX][0-9A-Fa-f]*)$'
          THEN RETURN false; END IF;
      END IF;
    END LOOP;
    IF k<>'links' AND (SELECT count(*)<>count(DISTINCT lower(btrim(value#>>'{}')))
      FROM jsonb_array_elements(p->k)) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $validate$;

CREATE TABLE idealab_private.maker_profiles_v1 (
  owner_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  draft jsonb NOT NULL CHECK (idealab_private.validate_maker_draft_v1(draft)),
  published jsonb CHECK (published IS NULL OR idealab_private.validate_maker_draft_v1(published)),
  share_id uuid UNIQUE,
  CHECK ((published IS NULL) = (share_id IS NULL))
);
CREATE TABLE idealab_private.maker_publication_history_v1 (
  owner_id uuid NOT NULL REFERENCES idealab_private.maker_profiles_v1(owner_id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  operation text NOT NULL CHECK (operation IN ('publish', 'withdraw')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (owner_id, revision)
);
ALTER TABLE idealab_private.maker_profiles_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.maker_profiles_v1 FORCE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.maker_publication_history_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE idealab_private.maker_publication_history_v1 FORCE ROW LEVEL SECURITY;
REVOKE ALL ON idealab_private.maker_profiles_v1, idealab_private.maker_publication_history_v1
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION idealab_private.mutate_maker_profile_v1(
  p_operation text, p_expected_revision text, p_draft jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $maker$
DECLARE
  actor uuid := auth.uid();
  account_role text;
  expected bigint;
  current_profile idealab_private.maker_profiles_v1;
BEGIN
  IF actor IS NULL OR NOT idealab_private.has_current_verified_email_v1() THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;
  -- Serialize first saves, publication and admission/profile changes in the account lock order.
  SELECT role::text INTO account_role FROM public.users WHERE id = actor AND is_active IS TRUE FOR UPDATE;
  IF NOT FOUND OR NOT coalesce(
    account_role IN ('lab_admin', 'super_admin') OR
    (account_role = 'student' AND idealab_private.current_student_mec_admitted_v1()), false
  ) THEN RETURN jsonb_build_object('status', 'unauthorized'); END IF;
  IF p_operation IS NULL OR p_operation NOT IN ('save_draft', 'publish', 'withdraw')
    OR p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
    OR (length(p_expected_revision) = 19 AND p_expected_revision COLLATE "C" >= '9223372036854775807')
    OR (p_operation = 'save_draft' AND NOT idealab_private.validate_maker_draft_v1(p_draft))
    OR (p_operation <> 'save_draft' AND p_draft IS NOT NULL) THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;
  expected := p_expected_revision::bigint;
  SELECT * INTO current_profile FROM idealab_private.maker_profiles_v1 WHERE owner_id = actor FOR UPDATE;
  IF coalesce(current_profile.revision, 0) <> expected THEN
    RETURN jsonb_build_object('status', 'conflict');
  END IF;
  IF p_operation = 'save_draft' THEN
    INSERT INTO idealab_private.maker_profiles_v1 (owner_id, revision, draft)
      VALUES (actor, 1, p_draft)
      ON CONFLICT (owner_id) DO UPDATE SET revision = expected + 1, draft = EXCLUDED.draft
      RETURNING * INTO current_profile;
  ELSE
    IF current_profile.owner_id IS NULL OR
      (p_operation = 'withdraw' AND current_profile.share_id IS NULL) OR
      (p_operation = 'publish' AND (
        current_profile.draft->>'display_name' !~ '[^[:space:]]'
        OR current_profile.draft->>'bio' !~ '[^[:space:]]'
        OR jsonb_array_length(current_profile.draft->'interests') = 0
        OR current_profile.published IS NOT DISTINCT FROM current_profile.draft
      )) THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
    UPDATE idealab_private.maker_profiles_v1 SET
      revision = expected + 1,
      published = CASE WHEN p_operation = 'publish' THEN draft END,
      share_id = CASE WHEN p_operation = 'publish' THEN coalesce(share_id, gen_random_uuid()) END
      WHERE owner_id = actor RETURNING * INTO current_profile;
    INSERT INTO idealab_private.maker_publication_history_v1 (owner_id, revision, operation)
      VALUES (actor, current_profile.revision, p_operation);
  END IF;
  RETURN jsonb_build_object('status', 'saved', 'revision', current_profile.revision::text,
    'share_id', current_profile.share_id);
END;
$maker$;

CREATE FUNCTION public.mutate_maker_profile_v1(
  p_operation text, p_expected_revision text, p_draft jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $wrapper$
  SELECT idealab_private.mutate_maker_profile_v1(p_operation, p_expected_revision, p_draft);
$wrapper$;
REVOKE ALL ON FUNCTION idealab_private.validate_maker_draft_v1(jsonb),
  idealab_private.mutate_maker_profile_v1(text, text, jsonb),
  public.mutate_maker_profile_v1(text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION idealab_private.mutate_maker_profile_v1(text, text, jsonb),
  public.mutate_maker_profile_v1(text, text, jsonb) TO authenticated;
