import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const source = stripTypeScriptTypes(await readFile(new URL('../src/lib/recovery-authority.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
const inspectMemberSessionScope = new Function(`${source}\nreturn inspectMemberSessionScope;`)();
const accountId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const now = 10_000;

function clientFor(claims, { userId = accountId, claimsError = null, userError = null } = {}) {
  return {
    auth: {
      async getClaims() { return { data: { claims }, error: claimsError }; },
      async getUser() { return { data: { user: userId ? { id: userId } : null }, error: userError }; },
    },
  };
}

function token(amr, overrides = {}) {
  return {
    sub: accountId,
    session_id: sessionId,
    role: 'authenticated',
    exp: now + 1_000,
    iat: now - 100,
    is_anonymous: false,
    amr,
    ...overrides,
  };
}

test('ordinary OAuth and password AMR remain normal member sessions', async () => {
  for (const method of ['oauth', 'password']) {
    const result = await inspectMemberSessionScope(clientFor(token([{ method, timestamp: now - 90 }])), { id: accountId }, now);
    assert.equal(result, 'normal');
  }
});

test('fresh recovery AMR is restricted to the reset flow', async () => {
  const result = await inspectMemberSessionScope(clientFor(token([{ method: 'recovery', timestamp: now - 120 }])), { id: accountId }, now);
  assert.equal(result, 'recovery');
});

test('an old recovery marker stays restricted after the reset submission window', async () => {
  const result = await inspectMemberSessionScope(clientFor(token([{ method: 'recovery', timestamp: now - 900 }])), { id: accountId }, now);
  assert.equal(result, 'recovery');
});

test('claims must bind to the current verified account', async () => {
  const ordinary = token([{ method: 'password', timestamp: now - 90 }]);
  const wrongSubject = await inspectMemberSessionScope(clientFor(ordinary, { userId: '33333333-3333-4333-8333-333333333333' }), { id: accountId }, now);
  const wrongUser = await inspectMemberSessionScope(clientFor(ordinary, { userId: null }), { id: accountId }, now);
  const wrongExpected = await inspectMemberSessionScope(clientFor(ordinary), { id: 'not-an-id' }, now);
  assert.equal(wrongSubject, null);
  assert.equal(wrongUser, null);
  assert.equal(wrongExpected, null);
});

test('expired, malformed, ambiguous, or unverified session observations fail closed', async () => {
  const ordinary = [{ method: 'password', timestamp: now - 90 }];
  const cases = [
    token(ordinary, { exp: now }),
    token([{ method: 'recovery', timestamp: now - 1 }, { method: 'recovery', timestamp: now - 2 }]),
    token([{ method: 'password', timestamp: 'not-a-time' }]),
    token(ordinary, { role: 'anon' }),
  ];
  for (const claims of cases) {
    assert.equal(await inspectMemberSessionScope(clientFor(claims), { id: accountId }, now), null);
  }
  assert.equal(await inspectMemberSessionScope(clientFor(token(ordinary), { claimsError: new Error('unavailable') }), { id: accountId }, now), null);
  assert.equal(await inspectMemberSessionScope(clientFor(token(ordinary), { userError: new Error('unavailable') }), { id: accountId }, now), null);
});
test('a session switch during scope verification fails closed', async () => {
  const first = token([{ method: 'recovery', timestamp: now - 120 }]);
  const switched = token([{ method: 'password', timestamp: now - 80 }], { session_id: '33333333-3333-4333-8333-333333333333' });
  let reads = 0;
  const client = { auth: {
    async getClaims() { reads += 1; return { data: { claims: reads === 1 ? first : switched }, error: null }; },
    async getUser() { return { data: { user: { id: accountId } }, error: null }; },
  } };
  assert.equal(await inspectMemberSessionScope(client, { id: accountId }, now), null);
  assert.equal(reads, 2);
});
