import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const privateFunctions = [
  'normalize_mec_registration_v1', 'has_current_verified_email_v1',
  'validate_required_profile_v1', 'current_student_mec_admitted_v1',
  'save_current_profile_v1', 'validate_mec_claim_display_v1',
  'claim_current_mec_registration_v1', 'enforce_no_committed_pending_mec_claim_v1',
  'ensure_current_profile_v1', 'provision_shared_profile_v1',
];
const publicFunctions = ['get_own_profile_v1', 'save_own_profile_v1', 'claim_mec_registration_v1'];
const targets = new Set([
  ...privateFunctions.map(name => `idealab_private/${name}`),
  ...publicFunctions.map(name => `public/${name}`),
]);
const canonical = value => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
const key = row => `${row.schema_name}/${row.function_name}(${row.arguments})`;
const hash = text => createHash('sha256').update(text).digest('hex');

export async function compareSharedProfileFunctions(sql, fixture, migration, catalogText) {
  const catalog = JSON.parse(catalogText);
  const captured = catalog.functions.filter(row => targets.has(`${row.schema_name}/${row.function_name}`));
  assert.equal(captured.length, 13, 'Capture must contain exactly the ten private and three public profile functions.');
  assert.equal(new Set(captured.map(key)).size, 13, 'Captured function signatures must be unique.');
  const targetSql = [...targets].map(name => `'${name}'`).join(',');
  const result = await sql(`BEGIN;
    ${fixture}
    SET LOCAL ROLE postgres;
    ${migration}
    SELECT coalesce(json_agg(f ORDER BY schema_name,function_name,arguments),'[]'::json) FROM (
      SELECT n.nspname schema_name,p.proname function_name,
        pg_get_function_identity_arguments(p.oid) arguments,
        pg_get_function_result(p.oid) result_type,p.prosecdef security_definer,
        p.provolatile volatility,pg_get_userbyid(p.proowner) owner,p.proacl::text acl,
        md5(pg_get_functiondef(p.oid)) definition_md5
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE p.prokind='f' AND n.nspname || '/' || p.proname IN (${targetSql})
    ) f;
    ROLLBACK;`);
  const output = result.stdout.trim().split(/\r?\n/);
  assert.equal(output.shift(), 't', 'The unchanged shared fixture must report readiness.');
  const local = JSON.parse(output.join('\n'));
  assert.equal(local.length, 13, 'Exact fixture plus canonical migration must create exactly thirteen targeted functions.');
  assert.equal(new Set(local.map(key)).size, 13, 'Local function signatures must be unique.');
  const localMap = new Map(local.map(row => [key(row), row]));
  const capturedMap = new Map(captured.map(row => [key(row), row]));
  const differences = {
    missingLocally: captured.filter(row => !localMap.has(key(row))),
    extraLocally: local.filter(row => !capturedMap.has(key(row))),
    changed: captured.filter(row => localMap.has(key(row)) && canonical(row) !== canonical(localMap.get(key(row))))
      .map(row => ({ signature: key(row), captured: row, local: localMap.get(key(row)) })),
  };
  const capturedMetadataMatch = Object.values(differences).every(rows => rows.length === 0);
  return {
    sources: {
      fixture: { path: 'Grow/supabase/tests/shared_profile_contract_v1_fixture.sql', sha256: hash(fixture) },
      migration: { path: 'Grow/supabase/migrations/20261102130200_shared_profile_contract_v1.sql', sha256: hash(migration) },
      catalog: { path: 'docs/research/shared-function-fingerprints-2026-11-04.json', sha256: hash(catalogText) },
    },
    capturedCount: captured.length, localCount: local.length, capturedMetadataMatch, differences,
    limits: 'Synthetic PostgreSQL fixture plus exact canonical migration only. Comparison covers precisely ten idealab_private profile functions and three public own-profile wrappers. Synthetic get_user_role/set_updated_at are excluded. Matching descriptors/hashes is not complete live-schema parity, deployment provenance, Supabase Auth/API acceptance, Flutter compatibility or production readiness.',
  };
}
