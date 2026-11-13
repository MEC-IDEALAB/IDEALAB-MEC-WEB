import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectRecoveryAuthority } from '../src/lib/recovery-authority.ts';

// Isolated signed-result fixtures, not signature/provider/recovery acceptance.
const accountId = '11111111-2222-4333-8444-555555555555';
const otherAccount = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const sessionId = '22222222-3333-4444-8555-666666666666';
const otherSession = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const now = 1_800_000_000;
const user = { id: accountId, email: 'member@example.invalid', email_confirmed_at: '2026-11-05T00:00:00Z', is_anonymous: false };
const claims = { sub: accountId, session_id: sessionId, role: 'authenticated', exp: now + 120, iat: now - 10,
  is_anonymous: false, amr: [{ method: 'recovery', timestamp: now - 20 }] };
const verified = claims => ({ data: { claims }, error: null });
const identified = user => ({ data: { user }, error: null });
function fixture({ first = verified(claims), second = first, identity = identified(user) } = {}) {
  const order = [];
  let reads = 0;
  const client = { auth: {
    getClaims: async () => { order.push('claims'); return reads++ ? second : first; },
    getUser: async () => { order.push('user'); return identity; },
    getSession: async () => { assert.fail('unverified session data must never confer recovery authority'); },
  } };
  return { client, order };
}

test('fresh verified recovery projects only stable account and session IDs', async () => {
  const { client, order } = fixture();
  const result = await inspectRecoveryAuthority(client, now);
  assert.deepEqual(result, { accountId, sessionId });
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(order, ['claims', 'user', 'claims']);
});

test('ordinary login, OAuth and editable recovery metadata do not grant recovery', async () => {
  for (const amr of [[], [{ method: 'password', timestamp: now - 20 }], [{ method: 'oauth', timestamp: now - 20 }], ['recovery']]) {
    const { client, order } = fixture({ first: verified({ ...claims, amr, user_metadata: { amr: claims.amr, recovery: true } }) });
    assert.equal(await inspectRecoveryAuthority(client, now), null);
    assert.deepEqual(order, ['claims']);
  }
});

test('expired, future, stale and malformed time claims fail closed', async () => {
  for (const change of [
    { exp: now }, { exp: now - 1 }, { exp: '1800000120' }, { exp: Infinity }, { exp: NaN }, { exp: now + .5 },
    { iat: now + 1 }, { iat: undefined }, { iat: '1800000000' }, { iat: now + 120 },
    { nbf: now + 1 }, { nbf: null },
    { amr: [{ method: 'recovery', timestamp: now - 600 }] },
    { amr: [{ method: 'recovery', timestamp: now + 1 }] },
    { amr: [{ method: 'recovery', timestamp: now - 5 }] },
    { amr: [{ method: 'recovery', timestamp: String(now - 20) }] },
    { amr: [{ method: 'recovery', timestamp: now - 20.5 }] },
  ]) {
    const { client } = fixture({ first: verified({ ...claims, ...change }) });
    assert.equal(await inspectRecoveryAuthority(client, now), null, JSON.stringify(change));
  }
  const { client } = fixture({ first: verified({ ...claims, amr: [{ method: 'recovery', timestamp: now - 599 }] , iat: now - 10 }) });
  assert.deepEqual(await inspectRecoveryAuthority(client, now), { accountId, sessionId });
});

test('malformed identities, roles, AMR structures and ambiguous methods are denied', async () => {
  for (const change of [
    { sub: otherAccount }, { sub: accountId + '\n' }, { session_id: '' }, { session_id: sessionId + '\n' },
    { role: 'service_role' }, { is_anonymous: true }, { is_anonymous: 'false' },
    { amr: null }, { amr: {} }, { amr: [null] }, { amr: [['recovery']] }, { amr: [{ method: 'recovery' }] },
    { amr: [claims.amr[0], claims.amr[0]] },
    { amr: [claims.amr[0], { method: 'oauth', timestamp: now + 1 }] },
  ]) {
    const { client } = fixture({ first: verified({ ...claims, ...change }) });
    assert.equal(await inspectRecoveryAuthority(client, now), null);
  }
  for (const change of [{ id: otherAccount }, { is_anonymous: true }, { is_anonymous: null },
    { email: '' }, { email_confirmed_at: null }, { id: accountId + '\n' }]) {
    assert.equal(await inspectRecoveryAuthority(fixture({ identity: identified({ ...user, ...change }) }).client, now), null);
  }
});

test('verification errors, absent data and thrown provider errors grant no authority', async () => {
  for (const result of [null, {}, { data: null, error: null }, { data: { claims }, error: { status: 401 } }, { data: { claims } }]) {
    assert.equal(await inspectRecoveryAuthority(fixture({ first: result }).client, now), null);
    assert.equal(await inspectRecoveryAuthority(fixture({ second: result }).client, now), null);
  }
  for (const result of [null, {}, { data: { user: null }, error: null }, { data: { user }, error: { status: 503 } }, { data: { user } }]) {
    assert.equal(await inspectRecoveryAuthority(fixture({ identity: result }).client, now), null);
  }
  for (const method of ['getClaims', 'getUser']) {
    const { client } = fixture();
    client.auth[method] = async () => { throw new Error('fixture provider failure'); };
    assert.equal(await inspectRecoveryAuthority(client, now), null);
  }
});

test('account or session switching around the live identity check fails closed', async () => {
  for (const change of [{ sub: otherAccount }, { session_id: otherSession }, { amr: [{ method: 'oauth', timestamp: now - 20 }] },
    { amr: [{ method: 'recovery', timestamp: now - 21 }] }]) {
    assert.equal(await inspectRecoveryAuthority(fixture({ second: verified({ ...claims, ...change }) }).client, now), null);
  }
  // A normal token refresh may extend expiration without changing authority.
  assert.deepEqual(await inspectRecoveryAuthority(fixture({ second: verified({ ...claims, exp: now + 300 }) }).client, now), { accountId, sessionId });
});

test('default wall clock is rechecked after asynchronous verification', async () => {
  const original = Date.now;
  let current = now;
  Date.now = () => current * 1000;
  try {
    const { client } = fixture();
    client.auth.getUser = async () => { current += 121; return identified(user); };
    assert.equal(await inspectRecoveryAuthority(client), null, 'a token expiring during the user lookup is denied');
    current = now;
    const { client: delayed } = fixture({ first: verified({ ...claims, exp: now + 1000, amr: [{ method: 'recovery', timestamp: now - 599 }] }) });
    delayed.auth.getUser = async () => { current += 2; return identified(user); };
    assert.equal(await inspectRecoveryAuthority(delayed), null, 'the original recovery window cannot age past its deadline while awaiting');
  } finally { Date.now = original; }
});

test('invalid clocks and non-data claim properties cannot confer authority', async () => {
  for (const time of [NaN, Infinity, -1]) {
    const { client, order } = fixture();
    assert.equal(await inspectRecoveryAuthority(client, time), null);
    assert.deepEqual(order, []);
  }
  const accessor = { ...claims };
  Object.defineProperty(accessor, 'sub', { get: () => assert.fail('claim accessor must not run') });
  const inherited = Object.create(claims);
  for (const value of [accessor, inherited, [], null]) {
    assert.equal(await inspectRecoveryAuthority(fixture({ first: verified(value) }).client, now), null);
  }
});
