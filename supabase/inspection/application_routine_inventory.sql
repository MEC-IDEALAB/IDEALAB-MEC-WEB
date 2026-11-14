-- Aggregate metadata for database restore review. No routine definitions or rows.
BEGIN READ ONLY;
SET LOCAL search_path = pg_catalog;
SELECT n.nspname AS schema_name,
       count(*) FILTER (WHERE d.objid IS NULL) AS application_routines,
       count(*) FILTER (WHERE d.objid IS NOT NULL) AS extension_routines,
       count(*) FILTER (WHERE d.objid IS NULL AND r.proacl IS NOT NULL) AS application_routines_with_explicit_acl,
       count(*) FILTER (WHERE d.objid IS NULL AND r.prosecdef) AS application_security_definers
FROM pg_proc r
JOIN pg_namespace n ON n.oid = r.pronamespace
LEFT JOIN pg_depend d ON d.classid = 'pg_proc'::regclass AND d.objid = r.oid
  AND d.refclassid = 'pg_extension'::regclass AND d.deptype = 'e'
WHERE n.nspname IN ('public', 'idealab_private') AND r.prokind IN ('f', 'p', 'w')
GROUP BY n.nspname
ORDER BY n.nspname;
ROLLBACK;
