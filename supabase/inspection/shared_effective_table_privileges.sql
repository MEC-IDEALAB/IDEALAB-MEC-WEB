-- Read-only post-hardening check. Returns aggregate catalog metadata only.
SELECT count(*) AS public_tables,
  count(*) FILTER (WHERE c.relrowsecurity) AS rls_enabled,
  count(*) FILTER (WHERE c.relforcerowsecurity) AS rls_forced,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM unnest(ARRAY['anon','authenticated']) AS r(role_name)
    CROSS JOIN unnest(ARRAY['TRUNCATE','TRIGGER','REFERENCES','MAINTAIN']) AS p(privilege_name)
    WHERE has_table_privilege(r.role_name,c.oid,p.privilege_name)
  )) AS tables_with_extra_effective_api_grants,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM unnest(ARRAY['anon','authenticated']) AS r(role_name)
    WHERE has_any_column_privilege(r.role_name,c.oid,'REFERENCES')
  )) AS tables_with_effective_column_references
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p');
