import assert from 'node:assert/strict';
import test from 'node:test';
import { hasDisabledPreviewFlags } from './vercel-preview-env.mjs';

test('accepts explicit disabled flags from Vercel dotenv output', () => {
  assert.equal(
    hasDisabledPreviewFlags('ENABLE_MEMBER_PLATFORM="false"\nENABLE_DESIGN_PREVIEW=false\n'),
    true,
  );
});

test('rejects a missing preview flag', () => {
  assert.equal(hasDisabledPreviewFlags('ENABLE_MEMBER_PLATFORM=false\n'), false);
});

test('rejects enabled or duplicate preview flags', () => {
  assert.equal(
    hasDisabledPreviewFlags('ENABLE_MEMBER_PLATFORM=true\nENABLE_DESIGN_PREVIEW=false\n'),
    false,
  );
  assert.equal(
    hasDisabledPreviewFlags('ENABLE_MEMBER_PLATFORM=false\nENABLE_MEMBER_PLATFORM=true\nENABLE_DESIGN_PREVIEW=false\n'),
    false,
  );
});

test('does not mistake flag-like lines inside a multiline value for assignments', () => {
  assert.equal(
    hasDisabledPreviewFlags(
      'OTHER="before\nENABLE_MEMBER_PLATFORM=false\nENABLE_DESIGN_PREVIEW=false"\n',
    ),
    false,
  );
  assert.equal(
    hasDisabledPreviewFlags(
      'OTHER="before\nENABLE_MEMBER_PLATFORM=false\nENABLE_DESIGN_PREVIEW=false"\nENABLE_MEMBER_PLATFORM=false\nENABLE_DESIGN_PREVIEW=false\n',
    ),
    true,
  );
});
