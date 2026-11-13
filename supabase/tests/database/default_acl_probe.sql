-- Synthetic PG17 behavior probe only. Not a live permission proof or approved patch.
-- Run only through the fresh, owned, loopback db-runtime scratch harness.
-- No application records, production roles or existing objects are modified.
BEGIN;
SET LOCAL plpgsql.check_asserts = on;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
DO $preflight$
BEGIN
  ASSERT current_setting('server_version_num')::integer BETWEEN 170000 AND 179999,
    'probe requires disposable PostgreSQL17';
  ASSERT current_database() = 'postgres' AND host(inet_server_addr()) = '127.0.0.1',
    'probe requires harness loopback database';
  ASSERT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user),
    'synthetic creator setup requires the scratch superuser';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN
    ('anon','authenticated','service_role','idealab_acl_fixture_creator_a','idealab_acl_fixture_creator_b')),
    'probe refuses preexisting fixture or API roles';
  ASSERT to_regnamespace('auth') IS NULL AND to_regnamespace('idealab_private') IS NULL
    AND to_regnamespace('idealab_acl_fixture_private') IS NULL,
    'probe refuses an application schema';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')),
    'probe requires empty public schema';
END;
$preflight$;

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE idealab_acl_fixture_creator_a NOLOGIN;
CREATE ROLE idealab_acl_fixture_creator_b NOLOGIN;
CREATE SCHEMA idealab_acl_fixture_private;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, CREATE ON SCHEMA public, idealab_acl_fixture_private
  TO idealab_acl_fixture_creator_a, idealab_acl_fixture_creator_b;

-- The two creator roles model captured PostgreSQL default-ACL behavior only.
-- They do not model Supabase creator-role membership or deployment authority.
DO $defaults$
DECLARE creator text;
BEGIN
  FOREACH creator IN ARRAY ARRAY['idealab_acl_fixture_creator_a','idealab_acl_fixture_creator_b'] LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
      ON TABLES TO anon, authenticated, service_role', creator);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA idealab_acl_fixture_private
      GRANT SELECT ON TABLES TO authenticated', creator);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
      GRANT SELECT, UPDATE, USAGE ON SEQUENCES TO authenticated', creator);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
      GRANT EXECUTE ON FUNCTIONS TO authenticated', creator);
  END LOOP;
END;
$defaults$;
CREATE TEMP TABLE idealab_acl_fixture_defaults_before AS
  SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl::text AS acl FROM pg_default_acl;

DO $before_tables$
DECLARE creator text; suffix text; target text;
BEGIN
  FOREACH suffix IN ARRAY ARRAY['a','b'] LOOP
    creator := 'idealab_acl_fixture_creator_' || suffix;
    target := 'idealab_acl_fixture_before_' || suffix;
    EXECUTE format('SET LOCAL ROLE %I', creator);
    EXECUTE format('CREATE TABLE public.%I(id integer PRIMARY KEY)', target);
    EXECUTE format('INSERT INTO public.%I VALUES (7),(9)', target);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', target);
    EXECUTE format('CREATE POLICY deny_fixture_rows ON public.%I
      TO anon, authenticated USING (false) WITH CHECK (false)', target);
    RESET ROLE;
  END LOOP;
END;
$before_tables$;
CREATE TEMP TABLE idealab_acl_fixture_existing_acls AS
  SELECT oid,relacl::text AS acl FROM pg_class
  WHERE oid IN ('public.idealab_acl_fixture_before_a'::regclass,
                'public.idealab_acl_fixture_before_b'::regclass);

-- Force RLS prevents row reads, but inherited TRUNCATE still succeeds.
-- The deliberate exception rolls each successful TRUNCATE back immediately.
SET LOCAL ROLE anon;
DO $anon_before$
DECLARE target text; visible_rows bigint; reached boolean;
BEGIN
  FOREACH target IN ARRAY ARRAY['idealab_acl_fixture_before_a','idealab_acl_fixture_before_b'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',target) INTO visible_rows;
    ASSERT visible_rows=0, 'forced RLS denies anonymous fixture rows';
    reached := false;
    BEGIN
      EXECUTE format('TRUNCATE public.%I',target);
      reached := true;
      RAISE EXCEPTION 'rollback synthetic truncate' USING ERRCODE='P7501';
    EXCEPTION WHEN SQLSTATE 'P7501' THEN NULL;
    END;
    ASSERT reached, 'inherited anonymous TRUNCATE bypasses row policies';
  END LOOP;
END;
$anon_before$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $member_before$
DECLARE target text; visible_rows bigint; reached boolean;
BEGIN
  FOREACH target IN ARRAY ARRAY['idealab_acl_fixture_before_a','idealab_acl_fixture_before_b'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I',target) INTO visible_rows;
    ASSERT visible_rows=0, 'forced RLS denies authenticated fixture rows';
    reached := false;
    BEGIN
      EXECUTE format('TRUNCATE public.%I',target);
      reached := true;
      RAISE EXCEPTION 'rollback synthetic truncate' USING ERRCODE='P7501';
    EXCEPTION WHEN SQLSTATE 'P7501' THEN NULL;
    END;
    ASSERT reached, 'inherited authenticated TRUNCATE bypasses row policies';
  END LOOP;
END;
$member_before$;
RESET ROLE;
DO $preserved_before$
BEGIN
  ASSERT (SELECT count(*)=2 FROM public.idealab_acl_fixture_before_a)
    AND (SELECT count(*)=2 FROM public.idealab_acl_fixture_before_b),
    'rollback-safe probes preserve synthetic rows';
END;
$preserved_before$;

DO $narrow_defaults$
DECLARE creator text;
BEGIN
  FOREACH creator IN ARRAY ARRAY['idealab_acl_fixture_creator_a','idealab_acl_fixture_creator_b'] LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
      REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon, authenticated',creator);
  END LOOP;
END;
$narrow_defaults$;
DO $after_tables$
DECLARE creator text; suffix text; target text;
BEGIN
  FOREACH suffix IN ARRAY ARRAY['a','b'] LOOP
    creator := 'idealab_acl_fixture_creator_' || suffix;
    target := 'idealab_acl_fixture_after_' || suffix;
    EXECUTE format('SET LOCAL ROLE %I', creator);
    EXECUTE format('CREATE TABLE public.%I(id integer PRIMARY KEY)', target);
    EXECUTE format('INSERT INTO public.%I VALUES (7),(9)', target);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', target);
    EXECUTE format('CREATE POLICY deny_fixture_rows ON public.%I
      TO anon, authenticated USING (false) WITH CHECK (false)', target);
    RESET ROLE;
  END LOOP;
END;
$after_tables$;
DO $privileges$
DECLARE target text; api_role text; privilege text;
BEGIN
  FOREACH target IN ARRAY ARRAY['idealab_acl_fixture_after_a','idealab_acl_fixture_after_b'] LOOP
    FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
        ASSERT has_table_privilege(api_role, 'public.'||target, privilege), 'ordinary DML ACL is preserved';
      END LOOP;
      FOREACH privilege IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
        ASSERT NOT has_table_privilege(api_role, 'public.'||target, privilege), 'extra future-table ACL is denied';
      END LOOP;
    END LOOP;
    FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
      ASSERT has_table_privilege('service_role','public.'||target,privilege), 'service-role ACL remains unchanged';
    END LOOP;
  END LOOP;
  ASSERT NOT EXISTS (SELECT 1 FROM idealab_acl_fixture_existing_acls b
    JOIN pg_class c ON c.oid=b.oid WHERE c.relacl::text IS DISTINCT FROM b.acl),
    'default changes leave preexisting table ACLs unchanged';
  ASSERT NOT EXISTS (
    (SELECT defaclrole,defaclnamespace,defaclobjtype,acl FROM idealab_acl_fixture_defaults_before
      WHERE NOT (defaclnamespace='public'::regnamespace AND defaclobjtype='r')
     EXCEPT SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl::text FROM pg_default_acl
      WHERE NOT (defaclnamespace='public'::regnamespace AND defaclobjtype='r'))
    UNION ALL
    (SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl::text FROM pg_default_acl
      WHERE NOT (defaclnamespace='public'::regnamespace AND defaclobjtype='r')
     EXCEPT SELECT defaclrole,defaclnamespace,defaclobjtype,acl FROM idealab_acl_fixture_defaults_before
      WHERE NOT (defaclnamespace='public'::regnamespace AND defaclobjtype='r'))
  ), 'private, sequence, function and global defaults remain unchanged';
END;
$privileges$;
SET LOCAL ROLE anon;
DO $anon_after$
DECLARE target text; denied boolean;
BEGIN
  FOREACH target IN ARRAY ARRAY['idealab_acl_fixture_after_a','idealab_acl_fixture_after_b'] LOOP
    denied := false;
    BEGIN EXECUTE format('TRUNCATE public.%I',target);
    EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
    ASSERT denied, 'future anonymous TRUNCATE is denied';
  END LOOP;
END;
$anon_after$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $member_after$
DECLARE target text; denied boolean;
BEGIN
  FOREACH target IN ARRAY ARRAY['idealab_acl_fixture_after_a','idealab_acl_fixture_after_b'] LOOP
    denied := false;
    BEGIN EXECUTE format('TRUNCATE public.%I',target);
    EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
    ASSERT denied, 'future authenticated TRUNCATE is denied';
  END LOOP;
END;
$member_after$;
RESET ROLE;
DO $rows_preserved$
BEGIN
  ASSERT (SELECT count(*)=2 FROM public.idealab_acl_fixture_after_a)
    AND (SELECT count(*)=2 FROM public.idealab_acl_fixture_after_b),
    'denied operations preserve synthetic rows';
END;
$rows_preserved$;
ROLLBACK;
SELECT to_regclass('public.idealab_acl_fixture_before_a') IS NULL
  AND to_regclass('public.idealab_acl_fixture_before_b') IS NULL
  AND to_regclass('public.idealab_acl_fixture_after_a') IS NULL
  AND to_regclass('public.idealab_acl_fixture_after_b') IS NULL
  AND to_regnamespace('idealab_acl_fixture_private') IS NULL
  AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN
    ('anon','authenticated','service_role','idealab_acl_fixture_creator_a','idealab_acl_fixture_creator_b'));
