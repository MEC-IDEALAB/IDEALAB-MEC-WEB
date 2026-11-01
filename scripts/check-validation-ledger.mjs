import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// This is an archive integrity check, never a database runner or deploy plan.
const expected = new Map([
  ['20261030221518', 'isolated_project_create_intent_v1'],
  ['20261030221714', 'isolated_project_create_intent_fk_index_v1'],
  ['20261030223441', 'isolated_project_create_generation_v1'],
  ['20261030225748', 'isolated_project_create_write_gate_v1'],
  ['20261030232930', 'isolated_project_create_expected_actor_v1'],
  ['20261030235730', 'isolated_project_account_bound_mutation_v1'],
]);

export function parseValidationLedger(text) {
  try { return JSON.parse(text); }
  catch { throw new Error('Invalid validation archive JSON.'); }
}

export function verifyValidationLedger(snapshot) {
  if (snapshot?.format_version !== 1 || snapshot.project_ref !== 'gvvqlfachzbufstzoiwi'
    || snapshot.environment !== 'isolated-validation' || snapshot.observed_on !== '2026-11-01'
    || !Array.isArray(snapshot.migrations) || snapshot.migrations.length !== expected.size) {
    throw new Error('Unexpected validation archive identity or migration set.');
  }
  const seen = new Set();
  let previous = '';
  let bytes = 0;
  for (const migration of snapshot.migrations) {
    if (expected.get(migration.version) !== migration.name || seen.has(migration.version)
      || migration.version <= previous || !Array.isArray(migration.statements) || migration.statements.length !== 1) {
      throw new Error('Missing, duplicate, unordered or unexpected applied migration.');
    }
    previous = migration.version;
    seen.add(migration.version);
    const statement = migration.statements[0];
    if (statement?.index !== 1 || typeof statement.sql !== 'string' || statement.sql.length === 0
      || !Number.isSafeInteger(statement.utf8_bytes) || !/^[a-f0-9]{64}$/.test(statement.sha256 ?? '')) {
      throw new Error('Invalid archived statement metadata.');
    }
    const buffer = Buffer.from(statement.sql, 'utf8');
    if (buffer.length !== statement.utf8_bytes || createHash('sha256').update(buffer).digest('hex') !== statement.sha256) {
      // Never print SQL: a future archive could contain sensitive literals.
      throw new Error(`Applied SQL fingerprint mismatch for ${migration.version}.`);
    }
    bytes += buffer.length;
  }
  return { migrations: seen.size, statements: seen.size, utf8Bytes: bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 2) throw new Error('This read-only checker accepts no arguments.');
    const file = new URL('../supabase/validation/ledger/project-create-applied.json', import.meta.url);
    const result = verifyValidationLedger(parseValidationLedger(await readFile(file, 'utf8')));
    console.log(`PASS: ${result.migrations} archived validation migrations; ${result.statements} SQL fingerprints; ${result.utf8Bytes} exact UTF-8 bytes. No SQL executed; live parity and production compatibility are not asserted.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Validation archive check failed.');
    process.exitCode = 1;
  }
}
