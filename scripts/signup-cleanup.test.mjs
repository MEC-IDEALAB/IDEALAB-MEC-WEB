import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attemptSignupAndClearSession } from '../src/lib/signup-cleanup.ts';

test('signup always clears local session regardless of provider outcome', async () => {
  for (const attempt of [async () => ({ data: { session: {} } }), async () => ({ error: 'rejected' }), async () => { throw new Error('network'); }]) {
    let clears = 0;
    assert.equal(await attemptSignupAndClearSession(attempt, async () => { clears++; }), 'cleared');
    assert.equal(clears, 1);
  }
});

test('cookie cleanup failures are explicit for every provider outcome', async () => {
  for (const attempt of [async () => ({}), async () => { throw new Error('network'); }]) {
    assert.equal(await attemptSignupAndClearSession(attempt, async () => { throw new Error('cookies'); }), 'cleanup-required');
  }
});
