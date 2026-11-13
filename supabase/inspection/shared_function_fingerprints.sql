-- Read-only catalog inspection. No application rows or function bodies returned.
-- Hashes are comparison fingerprints, not security signatures or a restorable dump.
SELECT n.nspname AS schema_name, p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS result_type,
  p.prosecdef AS security_definer, p.provolatile AS volatility,
  pg_get_userbyid(p.proowner) AS owner, p.proacl::text AS acl,
  md5(pg_get_functiondef(p.oid)) AS definition_md5
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'idealab_private') AND p.prokind = 'f'
ORDER BY 1, 2, 3;
