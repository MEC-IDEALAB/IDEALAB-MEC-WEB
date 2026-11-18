-- Read-only comparison metadata. No application rows or expression bodies.
SELECT 'default' AS kind, n.nspname AS schema_name, c.relname AS table_name,
  a.attname AS object_name, md5(pg_get_expr(d.adbin,d.adrelid)) AS definition_md5
FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.adnum
WHERE n.nspname IN ('public','idealab_private')
UNION ALL
SELECT 'index', n.nspname, c.relname, ic.relname, md5(pg_get_indexdef(i.indexrelid))
FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','idealab_private')
UNION ALL
SELECT 'trigger', n.nspname, c.relname, t.tgname, md5(pg_get_triggerdef(t.oid))
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
WHERE NOT t.tgisinternal AND (n.nspname IN ('public','idealab_private')
  OR (n.nspname='auth' AND pn.nspname IN ('public','idealab_private')))
ORDER BY 1,2,3,4;
