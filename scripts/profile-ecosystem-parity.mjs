import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const tables = ['user_profiles', 'user_experience', 'user_education', 'user_portfolio_projects', 'user_volunteering', 'user_social_links', 'user_skills', 'user_interests'];
const names = tables.map(name => `'${name}'`).join(',');
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
function compare(actual, expected, keyFields) {
  const key = row => keyFields.map(field => row[field]).join('/');
  const actualMap = new Map(actual.map(row => [key(row), row]));
  const expectedMap = new Map(expected.map(row => [key(row), row]));
  assert.equal(actualMap.size, actual.length, 'Comparison keys must be unique in local metadata.');
  assert.equal(expectedMap.size, expected.length, 'Comparison keys must be unique in captured metadata.');
  return {
    localCount: actual.length, capturedCount: expected.length,
    missingLocally: expected.filter(row => !actualMap.has(key(row))),
    extraLocally: actual.filter(row => !expectedMap.has(key(row))),
    changed: expected.filter(row => actualMap.has(key(row)) && canonical(row) !== canonical(actualMap.get(key(row))))
      .map(row => ({ key: key(row), captured: row, local: actualMap.get(key(row)) })),
  };
}

// The caller supplies only db-runtime's verified fresh loopback scratch cluster.
export async function compareProfileEcosystem(sql, source, catalogText, structuralText, authorizationText) {
  const catalog = JSON.parse(catalogText);
  const structural = JSON.parse(structuralText);
  const authorization = JSON.parse(authorizationText);
  const query = `SELECT json_build_object(
    'tables',(SELECT json_agg(t ORDER BY table_name) FROM (
      SELECT c.relname table_name,c.relrowsecurity rls,c.relforcerowsecurity forced_rls
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN (${names})) t),
    'columns',(SELECT json_agg(c ORDER BY table_name,ordinal_position) FROM (
      SELECT table_name,ordinal_position,column_name,data_type,is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name IN (${names})) c),
    'constraints',(SELECT json_agg(c ORDER BY relation,conname) FROM (
      SELECT r.relname relation,con.conname,pg_get_constraintdef(con.oid) definition FROM pg_constraint con
      JOIN pg_class r ON r.oid=con.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
      WHERE n.nspname='public' AND r.relname IN (${names})) c),
    'policies',(SELECT json_agg(p ORDER BY tablename,policyname) FROM (
      SELECT tablename,policyname,roles::text,permissive,cmd,qual,with_check FROM pg_policies
      WHERE schemaname='public' AND tablename IN (${names})) p),
    'indexes',(SELECT json_agg(i ORDER BY table_name,index_name) FROM (
      SELECT n.nspname schema_name,c.relname table_name,ic.relname index_name,
        x.indisunique is_unique,x.indisvalid is_valid,md5(pg_get_indexdef(x.indexrelid)) definition_md5
      FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid JOIN pg_class ic ON ic.oid=x.indexrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN (${names})) i),
    'defaults',(SELECT json_agg(d ORDER BY table_name,column_name) FROM (
      SELECT n.nspname schema_name,c.relname table_name,a.attname column_name,
        md5(pg_get_expr(d.adbin,d.adrelid)) expression_md5 FROM pg_attrdef d
      JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
      WHERE n.nspname='public' AND c.relname IN (${names})) d),
    'triggers',(SELECT json_agg(t ORDER BY table_name,trigger_name) FROM (
      SELECT n.nspname schema_name,c.relname table_name,t.tgname trigger_name,t.tgenabled enabled,
        pn.nspname function_schema,p.proname function_name,md5(pg_get_triggerdef(t.oid)) definition_md5
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
      WHERE NOT t.tgisinternal AND n.nspname='public' AND c.relname IN (${names})) t),
    'triggerFunctions',(SELECT json_agg(f ORDER BY table_name,trigger_name) FROM (
      SELECT c.relname table_name,t.tgname trigger_name,pn.nspname function_schema,p.proname function_name,
        pg_get_function_identity_arguments(p.oid) arguments,p.prosecdef security_definer,
        p.provolatile volatility,CASE WHEN p.proowner=current_user::regrole THEN '[scratch owner]'
          ELSE pg_get_userbyid(p.proowner) END owner,p.proacl::text acl,
        md5(pg_get_functiondef(p.oid)) definition_md5
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
      WHERE NOT t.tgisinternal AND n.nspname='public' AND c.relname IN (${names})) f));`;
  const result = await sql(`BEGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    ${source}
    CREATE TEMP TABLE profile_raw003_metadata AS ${query}
    CREATE TEMP TABLE profile_helper_before AS
      SELECT md5(prosrc) body_md5,md5(pg_get_functiondef(oid)) definition_md5,proconfig configuration
      FROM pg_proc WHERE oid='public.set_updated_at()'::regprocedure;
    -- One known installed configuration effect, after preserving raw 003 metadata.
    -- This does not replay the full hardening migration or copy provider grants.
    ALTER FUNCTION public.set_updated_at() SET search_path=pg_catalog;
    SELECT json_build_object(
      'raw003',(SELECT json_build_object FROM profile_raw003_metadata),
      'helperBefore',(SELECT row_to_json(b) FROM profile_helper_before b),
      'helperAfter',(SELECT json_build_object('body_md5',md5(prosrc),
        'definition_md5',md5(pg_get_functiondef(oid)),'configuration',proconfig)
        FROM pg_proc WHERE oid='public.set_updated_at()'::regprocedure));
    ROLLBACK;`);
  const observed = JSON.parse(result.stdout.trim());
  const local = observed.raw003;
  assert(local.columns?.length > 0, 'Exact migration must create profile columns.');
  const capturedHelperHashes = [...new Set(authorization.trigger_functions
    .filter(row => row.function_schema === 'public' && row.function_name === 'set_updated_at' && row.arguments === '')
    .map(row => row.definition_md5))];
  assert.equal(capturedHelperHashes.length, 1, 'Captured helper descriptor must identify one definition hash.');
  const knownHardeningProbe = {
    action: 'ALTER FUNCTION public.set_updated_at() SET search_path=pg_catalog',
    before: observed.helperBefore, after: observed.helperAfter,
    capturedDefinitionMd5: capturedHelperHashes[0],
    bodyUnchanged: observed.helperBefore.body_md5 === observed.helperAfter.body_md5,
    definitionAfterMatchesCaptured: observed.helperAfter.definition_md5 === capturedHelperHashes[0],
    limits: 'One known installed function configuration effect only, performed after saving raw migration-003 metadata. Does not apply full hardening, copy owner/grants, establish full parity or alter the raw comparison below.',
  };
  assert(knownHardeningProbe.bodyUnchanged, 'Search-path configuration must not alter the function body.');
  const sections = {
    tables: [authorization.tables.map(({ table_name, rls, forced_rls }) => ({ table_name, rls, forced_rls })), ['table_name']],
    columns: [catalog.columns.filter(row => tables.includes(row.table_name)), ['table_name','column_name']],
    constraints: [catalog.constraints.filter(row => tables.includes(row.relation)), ['relation','conname']],
    policies: [authorization.policies.filter(row => tables.includes(row.tablename)), ['tablename','policyname']],
    indexes: [structural.indexes.filter(row => row.schema_name === 'public' && tables.includes(row.table_name)), ['schema_name','table_name','index_name']],
    defaults: [structural.defaults.filter(row => row.schema_name === 'public' && tables.includes(row.table_name)), ['schema_name','table_name','column_name']],
    triggers: [structural.triggers.filter(row => row.schema_name === 'public' && tables.includes(row.table_name)), ['schema_name','table_name','trigger_name']],
    triggerFunctions: [authorization.trigger_functions.filter(row => tables.includes(row.table_name)), ['table_name','trigger_name']],
  };
  const comparisons = Object.fromEntries(Object.entries(sections).map(([section,[expected,keys]]) =>
    [section, compare(local[section] ?? [], expected, keys)]));
  // Report policy renames separately from effective predicate/role differences.
  const withoutPolicyName = rows => rows.map(({ policyname: _name, ...row }) => row);
  comparisons.policySemantics = compare(withoutPolicyName(local.policies ?? []),
    withoutPolicyName(sections.policies[0]), ['tablename','roles','cmd']);
  const capturedMetadataMatch = Object.values(comparisons).every(section =>
    section.missingLocally.length + section.extraLocally.length + section.changed.length === 0);
  const sha256 = text => createHash('sha256').update(text).digest('hex');
  return { sourceSha256: sha256(source), inputCatalogSha256: {
    'shared-public-catalog-2026-11-04.json': sha256(catalogText),
    'shared-structural-fingerprints-2026-11-04.json': sha256(structuralText),
    'profile-authorization-catalog-2026-11-04.json': sha256(authorizationText),
  }, tables, capturedMetadataMatch, knownHardeningProbe,
    capturedTableGrants: { count: authorization.grants.length, compared: false,
      reason: 'Captured grants are separate evidence. The exact source has no GRANT statements; provider defaults were not fabricated in the scratch fixture.' },
    limits: 'Disposable comparison of captured metadata only; actual PostgreSQL version is recorded in enclosing runtime evidence. Full schema, deployed provenance, provider default grants and live Auth/client authorization are not verified. Trigger-function owner is marked [scratch owner]; role/ACL differences are retained rather than normalized into parity. Hash deltas can reflect server-version formatting and require definition review. This is not a faithful full baseline or shared-profile compatibility test.', comparisons };
}
