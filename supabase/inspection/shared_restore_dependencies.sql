-- Catalog dependency inventory for the application-schema restore rehearsal.
-- Store the result privately. Function bodies and application rows are excluded.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '15s';

WITH application_schemas AS (
  SELECT oid, nspname FROM pg_namespace WHERE nspname IN ('public', 'idealab_private')
), application_triggers AS (
  SELECT t.*, r.relname AS relation_name, n.nspname AS relation_schema
  FROM pg_trigger t
  JOIN pg_class r ON r.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = r.relnamespace
  JOIN pg_proc f ON f.oid = t.tgfoid
  WHERE NOT t.tgisinternal
    AND (n.oid IN (SELECT oid FROM application_schemas)
      OR (n.nspname = 'auth' AND f.pronamespace IN (SELECT oid FROM application_schemas)))
), relevant_roles AS (
  SELECT oid FROM pg_roles
  WHERE rolname IN ('postgres', 'supabase_admin', 'anon', 'authenticated', 'service_role')
  UNION SELECT nspowner FROM pg_namespace WHERE oid IN (SELECT oid FROM application_schemas)
  UNION SELECT relowner FROM pg_class WHERE relnamespace IN (SELECT oid FROM application_schemas)
  UNION SELECT proowner FROM pg_proc WHERE pronamespace IN (SELECT oid FROM application_schemas)
)
SELECT jsonb_build_object(
  'captured_at', clock_timestamp(),
  'server_version', current_setting('server_version'),
  'schemas', (SELECT jsonb_agg(jsonb_build_object(
    'name', n.nspname, 'owner', pg_get_userbyid(n.nspowner), 'acl', n.nspacl::text
  ) ORDER BY n.nspname) FROM pg_namespace n
    WHERE n.oid IN (SELECT oid FROM application_schemas) OR n.nspname = 'auth'),
  'extensions', (SELECT jsonb_agg(jsonb_build_object(
    'name', e.extname, 'version', e.extversion, 'schema', n.nspname
  ) ORDER BY e.extname) FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace),
  'roles', (SELECT jsonb_agg(jsonb_build_object(
    'name', r.rolname, 'inherit', r.rolinherit, 'bypass_rls', r.rolbypassrls, 'superuser', r.rolsuper
  ) ORDER BY r.rolname) FROM pg_roles r JOIN relevant_roles x ON x.oid = r.oid),
  'memberships', (SELECT jsonb_agg(jsonb_build_object(
    'role', pg_get_userbyid(m.roleid), 'member', pg_get_userbyid(m.member),
    'admin', m.admin_option, 'inherit', m.inherit_option, 'set', m.set_option
  ) ORDER BY pg_get_userbyid(m.roleid), pg_get_userbyid(m.member))
  FROM pg_auth_members m
  WHERE m.roleid IN (SELECT oid FROM relevant_roles) OR m.member IN (SELECT oid FROM relevant_roles)),
  'default_acls', (SELECT jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'owner', pg_get_userbyid(d.defaclrole),
    'object_type', d.defaclobjtype, 'acl', d.defaclacl::text
  ) ORDER BY n.nspname, pg_get_userbyid(d.defaclrole), d.defaclobjtype)
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
  WHERE n.oid IN (SELECT oid FROM application_schemas)
    OR (d.defaclnamespace = 0 AND d.defaclrole IN (SELECT oid FROM relevant_roles))),
  'auth_triggers', (SELECT jsonb_agg(jsonb_build_object(
    'table', t.relation_name, 'name', t.tgname,
    'definition', pg_get_triggerdef(t.oid), 'enabled', t.tgenabled
  ) ORDER BY t.relation_name, t.tgname)
  FROM application_triggers t WHERE t.relation_schema = 'auth')
) AS restore_dependencies;

ROLLBACK;
