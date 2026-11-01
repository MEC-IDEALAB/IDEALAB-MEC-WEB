import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseValidationLedger, verifyValidationLedger } from './check-validation-ledger.mjs';

const archive = parseValidationLedger(await readFile(new URL('../supabase/validation/ledger/project-create-applied.json', import.meta.url), 'utf8'));

test('malformed JSON does not disclose its raw input in the error', () => {
  assert.throws(() => parseValidationLedger('{"sql":"private-content"'), { message: 'Invalid validation archive JSON.' });
});

test('all six applied SQL records match their independently collected database hashes', () => {
  assert.deepEqual(verifyValidationLedger(archive), { migrations: 6, statements: 6, utf8Bytes: 52365 });
});

test('changed SQL or normalized line endings cannot silently pass as exact applied text', () => {
  for (const mutate of [sql => sql + '\n', sql => sql.replace(/\r\n/g, '\n'), sql => sql.replace('BEGIN', 'begin')]) {
    const copy = structuredClone(archive);
    copy.migrations[0].statements[0].sql = mutate(copy.migrations[0].statements[0].sql);
    assert.throws(() => verifyValidationLedger(copy), /fingerprint mismatch/);
  }
});

test('a production project label or incomplete archive fails closed', () => {
  for (const mutate of [copy => { copy.project_ref = 'huftzhfqnnslvnfzvbex'; }, copy => { copy.environment = 'production'; }, copy => { copy.migrations.pop(); }]) {
    const copy = structuredClone(archive);
    mutate(copy);
    assert.throws(() => verifyValidationLedger(copy), /identity or migration set/);
  }
});

test('duplicate, renamed, reordered or extra applied records are rejected', () => {
  for (const mutate of [copy => { copy.migrations[1] = copy.migrations[0]; }, copy => { copy.migrations[0].name = 'unknown'; }, copy => { copy.migrations.reverse(); }, copy => { copy.migrations[0].statements.push(copy.migrations[0].statements[0]); }]) {
    const copy = structuredClone(archive);
    mutate(copy);
    assert.throws(() => verifyValidationLedger(copy), /applied migration/);
  }
});

test('malformed or changed fingerprint metadata is rejected without printing SQL', () => {
  for (const value of [null, {}, { ...archive.migrations[0].statements[0], sha256: '0'.repeat(64) }]) {
    const copy = structuredClone(archive);
    copy.migrations[0].statements[0] = value;
    assert.throws(() => verifyValidationLedger(copy), error => !error.message.includes('CREATE') && /metadata|fingerprint/.test(error.message));
  }
});
