import assert from 'node:assert/strict';
import test from 'node:test';
import { draftWorkspaceSummary } from '../src/features/requests/draft-workspace-copy.ts';

test('empty local draft copy does not claim a draft exists', () => {
  const summary = draftWorkspaceSummary('empty', 'local');
  assert.equal(summary, 'No draft is saved for this account in this browser.');
  assert.doesNotMatch(summary, /saved draft|one local draft/i);
});

test('local draft states direct members to server history without guessing submission outcome', () => {
  const found = draftWorkspaceSummary('found', 'local');
  assert.match(found, /A local draft is saved/);
  assert.match(found, /can remain after an online submission/);
  assert.match(found, /check request history/);
  const invalid = draftWorkspaceSummary('invalid', 'local');
  assert.match(invalid, /exists.*can’t be opened/);
  assert.match(invalid, /server status is unknown/);
  const unavailable = draftWorkspaceSummary('unavailable', 'local');
  assert.match(unavailable, /state is unknown/);
  assert.match(unavailable, /check request history/i);
  for (const summary of [found, invalid, unavailable]) assert.doesNotMatch(summary, /was not submitted|has not been submitted|no request was submitted/i);
});

test('sample preview drafts are explicitly not submitted', () => {
  assert.match(draftWorkspaceSummary('found', 'memory'), /temporary sample draft.*not been submitted/);
  assert.match(draftWorkspaceSummary('invalid', 'memory'), /Preview drafts are not submitted/);
  assert.equal(draftWorkspaceSummary('empty', 'memory'), 'No draft is saved for this account in this preview session.');
});
