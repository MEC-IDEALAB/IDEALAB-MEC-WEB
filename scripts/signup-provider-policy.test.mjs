import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedSignupProviderAvailable, requiresEmailConfirmation } from '../src/lib/signup-provider-policy.ts';

const safe = { external: { email: true }, mailer_autoconfirm: false, disable_signup: false };
test('confirmation must be explicitly required with email signup enabled', () => {
  assert.equal(requiresEmailConfirmation(safe), true);
  for (const settings of [null, [], {}, { ...safe, mailer_autoconfirm: true },
    { ...safe, mailer_autoconfirm: undefined }, { ...safe, disable_signup: true },
    { ...safe, disable_signup: undefined }, { ...safe, external: { email: false } },
    { ...safe, mailer_autoconfirm: 'false' }]) {
    assert.equal(requiresEmailConfirmation(settings), false);
  }
});
test('settings fetch is bounded, private, pinned to Auth and rejects unavailable data', async () => {
  let calls = 0;
  const config = { url: 'https://provider-fixture.invalid', key: 'public-fixture' };
  const request = async (input, init) => {
    calls++;
    assert.equal(String(input), 'https://provider-fixture.invalid/auth/v1/settings');
    assert.deepEqual(init.headers, { apikey: 'public-fixture' });
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    assert(init.signal instanceof AbortSignal);
    return Response.json(safe);
  };
  assert.equal(await confirmedSignupProviderAvailable(config, request), true);
  assert.equal(calls, 1);
  for (const response of [Response.json({ ...safe, mailer_autoconfirm: true }),
    Response.json(safe, { status: 503 }), new Response('bad json')]) {
    assert.equal(await confirmedSignupProviderAvailable(config, async () => response), false);
  }
  assert.equal(await confirmedSignupProviderAvailable(config, async () => { throw new Error('fixture unavailable'); }), false);
});
