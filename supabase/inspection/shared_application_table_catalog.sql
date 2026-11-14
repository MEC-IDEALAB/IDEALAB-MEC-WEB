-- Schema metadata only. Run against the approved project in a trusted session.
-- Save results in private restore evidence storage, never in the public repository.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog;
SET LOCAL statement_timeout = '15s';

WITH relations AS (
  SELECT c.*, n.nspname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public','idealab_private') AND c.relkind IN ('r','p')
)
SELECT jsonb_build_object(
  'captured_at', clock_timestamp(),
  'server_version', current_setting('server_version'),
  'relations', coalesce(jsonb_agg(jsonb_build_object(
    'schema', r.nspname,
    'name', r.relname,
    'kind', r.relkind,
    'owner', pg_get_userbyid(r.relowner),
    'acl', r.relacl::text,
    'rls', r.relrowsecurity,
    'force_rls', r.relforcerowsecurity,
    'columns', (SELECT jsonb_agg(jsonb_build_object(
      'name', a.attname,
      'type', format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'identity', a.attidentity,
      'generated', a.attgenerated,
      'collation', CASE WHEN a.attcollation <> 0 THEN a.attcollation::regcollation::text END,
      'default', pg_get_expr(d.adbin, d.adrelid),
      'acl', a.attacl::text
    ) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = r.oid AND a.attnum > 0 AND NOT a.attisdropped),
    'constraints', (SELECT jsonb_agg(jsonb_build_object(
      'name', c.conname, 'definition', pg_get_constraintdef(c.oid), 'validated', c.convalidated
    ) ORDER BY c.conname) FROM pg_constraint c WHERE c.conrelid = r.oid),
    'indexes', (SELECT jsonb_agg(jsonb_build_object(
      'name', ic.relname, 'definition', pg_get_indexdef(i.indexrelid),
      'valid', i.indisvalid, 'ready', i.indisready
    ) ORDER BY ic.relname) FROM pg_index i JOIN pg_class ic ON ic.oid = i.indexrelid WHERE i.indrelid = r.oid),
    'policies', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.policyname)
      FROM pg_policies p WHERE p.schemaname = r.nspname AND p.tablename = r.relname),
    'triggers', (SELECT jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'definition', pg_get_triggerdef(t.oid), 'enabled', t.tgenabled
    ) ORDER BY t.tgname) FROM pg_trigger t WHERE t.tgrelid = r.oid AND NOT t.tgisinternal)
  ) ORDER BY r.nspname, r.relname), '[]'::jsonb)
) AS application_table_catalog
FROM relations r;

ROLLBACK;
