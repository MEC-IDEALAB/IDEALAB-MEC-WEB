import assert from 'node:assert/strict';
import test from 'node:test';
import { hasDisabledPreviewFlags } from './vercel-preview-env.mjs';

const names = [
  'ENABLE_MEMBER_PLATFORM',
  'ENABLE_MEMBER_PLATFORM_PRODUCTION',
  'ENABLE_MEMBER_PLATFORM_TEST',
  'ENABLE_DESIGN_PREVIEW',
  'ENABLE_LAB_OPENING_VALIDATION',
  'ENABLE_OWN_VISITS_VALIDATION',
  'ENABLE_WORK_REQUEST_INTAKE',
  'ENABLE_PROJECT_CORE',
];
const allDisabled = names.map((name) => `${name}=false`).join('\n') + '\n';

test('accepts explicit disabled flags from Vercel dotenv output', () => {
  assert.equal(hasDisabledPreviewFlags(allDisabled.replace('ENABLE_MEMBER_PLATFORM=false', 'ENABLE_MEMBER_PLATFORM="false"')), true);
});

test('rejects missing preview flags', () => {
  assert.equal(hasDisabledPreviewFlags(allDisabled.replace('ENABLE_LAB_OPENING_VALIDATION=false\n', '')), false);
});

test('rejects an enabled member or validation-only flag', () => {
  for (const name of ['ENABLE_MEMBER_PLATFORM', 'ENABLE_MEMBER_PLATFORM_PRODUCTION', 'ENABLE_MEMBER_PLATFORM_TEST', 'ENABLE_LAB_OPENING_VALIDATION', 'ENABLE_OWN_VISITS_VALIDATION', 'ENABLE_WORK_REQUEST_INTAKE', 'ENABLE_PROJECT_CORE']) {
    assert.equal(hasDisabledPreviewFlags(allDisabled.replace(`${name}=false`, `${name}=true`)), false, name);
  }
});

test('rejects duplicate preview flags', () => {
  assert.equal(hasDisabledPreviewFlags(`${allDisabled}ENABLE_MEMBER_PLATFORM=true\n`), false);
});

test('does not mistake flag-like lines inside a multiline value for assignments', () => {
  const nestedFlags = `OTHER="before\n${allDisabled.trimEnd()}"\n`;
  assert.equal(hasDisabledPreviewFlags(nestedFlags), false);
  assert.equal(hasDisabledPreviewFlags(`${nestedFlags}${allDisabled}`), true);
});

test('rejects an enabled design preview flag', () => {
  assert.equal(hasDisabledPreviewFlags(allDisabled.replace('ENABLE_DESIGN_PREVIEW=false', 'ENABLE_DESIGN_PREVIEW=true')), false);
});
