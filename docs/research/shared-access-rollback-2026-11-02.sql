BEGIN; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'; SET LOCAL request.jwt.claims='{}'; SET LOCAL request.jwt.claim.sub='';
CREATE TEMP TABLE before_acl_snapshot AS SELECT jsonb_build_object('tables',(SELECT jsonb_agg(jsonb_build_array(c.relname,a.grantor,a.grantee,a.privilege_type,a.is_grantable) ORDER BY c.relname,a.grantor,a.grantee,a.privilege_type,a.is_grantable) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE n.nspname='public' AND c.relkind IN ('r','p')),'functions',(SELECT jsonb_agg(jsonb_build_array(p.proname,p.proconfig,a.grantor,a.grantee,a.privilege_type,a.is_grantable) ORDER BY p.proname,a.grantor,a.grantee,a.privilege_type) FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE p.oid IN ('public.get_user_role()'::regprocedure,'public.set_updated_at()'::regprocedure))) AS state;
CREATE TEMP TABLE before_access_snapshot AS SELECT jsonb_build_object('dml',(SELECT jsonb_agg(jsonb_build_array(c.oid,r.n,p.n,has_table_privilege(r.n,c.oid,p.n)) ORDER BY c.oid,r.n,p.n) FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace CROSS JOIN (VALUES ('anon'),('authenticated')) r(n) CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(n) WHERE s.nspname='public' AND c.relkind IN ('r','p')),'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname,tablename,policyname) FROM pg_policies p WHERE schemaname IN ('public','storage')),'rls',(SELECT jsonb_agg(jsonb_build_array(c.oid,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p'))) AS state;
-- Shared access hardening candidate, 2 November 2026.
-- Target: existing grow-idealab. NOT INSTALLED.
-- Reconciles live role helper with existing public.users.role consumers.
-- Contains no user/data/bucket changes; full profile/RLS rollout remains separate.
DO $preflight$
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'reviewed baseline requires PostgreSQL 17 or newer';
  END IF;
  IF (SELECT md5(string_agg(c.relname||':'||coalesce(c.relacl::text,''),'|' ORDER BY c.relname))
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p'))
      IS DISTINCT FROM 'f8b1d1892fe0f2fd313c4212ba98fb32' THEN
    RAISE EXCEPTION 'table/ACL baseline changed; review again';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'explicit column ACL found; review privilege scope again';
  END IF;
  IF to_regclass('public.users') IS NULL
     OR to_regprocedure('public.get_user_role()') IS NULL
     OR to_regprocedure('public.set_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'shared access baseline does not match';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = 'public.get_user_role()'::regprocedure
      AND p.prorettype = 'text'::regtype AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'role helper signature does not match';
  END IF;
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.get_user_role()'::regprocedure)
       IS DISTINCT FROM '3f61846543a82ada7ed61459d2daea32'
     OR (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.set_updated_at()'::regprocedure)
       IS DISTINCT FROM '75ee85bfb81cf640baf932f177bf1044' THEN
    RAISE EXCEPTION 'reviewed function body has changed';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc
    WHERE oid IN ('public.get_user_role()'::regprocedure,'public.set_updated_at()'::regprocedure)
    AND (proconfig IS NOT NULL OR proacl::text IS DISTINCT FROM
      '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}')) THEN
    RAISE EXCEPTION 'function permission/config baseline changed; review again';
  END IF;
END
$preflight$;

-- These administrative privileges are unused by ordinary PostgREST DML.
-- RLS does not protect TRUNCATE, so remove its table privilege explicitly.
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON TABLE public."clubs",
  public."events",
  public."knowledge_articles",
  public."lab_sessions",
  public."notifications",
  public."project_members",
  public."projects",
  public."rsvps",
  public."tool_bookings",
  public."tools",
  public."user_education",
  public."user_experience",
  public."user_interests",
  public."user_portfolio_projects",
  public."user_profiles",
  public."user_skills",
  public."user_social_links",
  public."user_volunteering",
  public."users"
  FROM anon, authenticated;

-- Both existing bodies qualify application/Auth references; builtins use pg_catalog.
ALTER FUNCTION public.get_user_role() SET search_path = pg_catalog;
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, service_role;



CREATE TEMP TABLE after_access_snapshot AS SELECT jsonb_build_object('dml',(SELECT jsonb_agg(jsonb_build_array(c.oid,r.n,p.n,has_table_privilege(r.n,c.oid,p.n)) ORDER BY c.oid,r.n,p.n) FROM pg_class c JOIN pg_namespace s ON s.oid=c.relnamespace CROSS JOIN (VALUES ('anon'),('authenticated')) r(n) CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(n) WHERE s.nspname='public' AND c.relkind IN ('r','p')),'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname,tablename,policyname) FROM pg_policies p WHERE schemaname IN ('public','storage')),'rls',(SELECT jsonb_agg(jsonb_build_array(c.oid,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p'))) AS state;
DO $preserved$ BEGIN IF (SELECT state FROM before_access_snapshot) IS DISTINCT FROM (SELECT state FROM after_access_snapshot) THEN RAISE EXCEPTION 'DML/RLS changed'; END IF; END $preserved$;
CREATE TEMP TABLE timestamp_probe(updated_at timestamptz);
CREATE TRIGGER timestamp_probe_trigger BEFORE INSERT ON timestamp_probe FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO timestamp_probe DEFAULT VALUES;
DO $timestamp$ BEGIN IF EXISTS(SELECT 1 FROM timestamp_probe WHERE updated_at IS NULL) THEN RAISE EXCEPTION 'timestamp trigger failed'; END IF; END $timestamp$;
-- Run only in the same transaction after the matching candidate; always ROLLBACK.
-- Run only in the same transaction after the matching candidate; always ROLLBACK.
DO $checks$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN (VALUES ('anon'),('authenticated')) r(role_name)
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (has_table_privilege(r.role_name,c.oid,'TRUNCATE')
        OR has_table_privilege(r.role_name,c.oid,'TRIGGER')
        OR has_table_privilege(r.role_name,c.oid,'REFERENCES')
        OR has_table_privilege(r.role_name,c.oid,'MAINTAIN'))
  ) THEN RAISE EXCEPTION 'administrative table privilege remains'; END IF;
  IF has_function_privilege('anon','public.get_user_role()','EXECUTE') THEN
    RAISE EXCEPTION 'anonymous role helper execution remains';
  END IF;
  IF NOT has_function_privilege('authenticated','public.get_user_role()','EXECUTE')
     OR NOT has_function_privilege('service_role','public.get_user_role()','EXECUTE') THEN
    RAISE EXCEPTION 'intended role helper caller lost access';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid IN ('public.get_user_role()'::regprocedure,'public.set_updated_at()'::regprocedure)
      AND NOT coalesce(p.proconfig @> ARRAY['search_path=pg_catalog'], false)
  ) THEN RAISE EXCEPTION 'function search path not pinned'; END IF;
END
$checks$;
SET LOCAL ROLE authenticated;
DO $identity_check$
BEGIN
  IF public.get_user_role() IS NOT NULL THEN
    RAISE EXCEPTION 'role helper accepted missing identity';
  END IF;
END
$identity_check$;
RESET ROLE;
SELECT true AS candidate_catalog_assertions_passed;



SELECT true AS administrative_privileges_denied, true AS dml_and_rls_preserved, true AS timestamp_trigger_verified, true AS missing_identity_denied;
-- Reviewed-baseline restoration candidate only. Requires a separate operational decision.
-- Restores only privileges/configuration removed by the paired hardening candidate.
-- Do not use after unrelated permission changes without reconciliation.
DO $guard$ BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.get_user_role()'::regprocedure) IS DISTINCT FROM '3f61846543a82ada7ed61459d2daea32'
    OR (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.set_updated_at()'::regprocedure) IS DISTINCT FROM '75ee85bfb81cf640baf932f177bf1044'
  THEN RAISE EXCEPTION 'function bodies changed; manual rollback review required'; END IF;
END $guard$;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."clubs" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."clubs" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."events" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."events" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."knowledge_articles" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."knowledge_articles" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."lab_sessions" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."lab_sessions" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."notifications" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."notifications" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."project_members" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."project_members" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."projects" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."projects" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."rsvps" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."rsvps" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."tool_bookings" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."tool_bookings" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."tools" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."tools" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_education" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_education" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_experience" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_experience" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_interests" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_interests" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_portfolio_projects" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_portfolio_projects" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_profiles" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_profiles" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_skills" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_skills" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_social_links" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_social_links" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_volunteering" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."user_volunteering" TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."users" TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLE public."users" TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO PUBLIC, anon;
ALTER FUNCTION public.get_user_role() RESET search_path;
ALTER FUNCTION public.set_updated_at() RESET search_path;

CREATE TEMP TABLE restored_acl_snapshot AS SELECT jsonb_build_object('tables',(SELECT jsonb_agg(jsonb_build_array(c.relname,a.grantor,a.grantee,a.privilege_type,a.is_grantable) ORDER BY c.relname,a.grantor,a.grantee,a.privilege_type,a.is_grantable) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE n.nspname='public' AND c.relkind IN ('r','p')),'functions',(SELECT jsonb_agg(jsonb_build_array(p.proname,p.proconfig,a.grantor,a.grantee,a.privilege_type,a.is_grantable) ORDER BY p.proname,a.grantor,a.grantee,a.privilege_type) FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a WHERE p.oid IN ('public.get_user_role()'::regprocedure,'public.set_updated_at()'::regprocedure))) AS state;
DO $restored$ BEGIN IF (SELECT state FROM before_acl_snapshot) IS DISTINCT FROM (SELECT state FROM restored_acl_snapshot) THEN RAISE EXCEPTION 'operational rollback did not restore original ACL/config'; END IF; END $restored$;
SELECT true AS scoped_privileges_denied_in_trial, true AS operational_rollback_restored_acl_and_config;
ROLLBACK;
