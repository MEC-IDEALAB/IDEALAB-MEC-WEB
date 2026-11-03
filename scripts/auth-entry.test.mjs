import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { inspectAuthEntry } from '../src/lib/auth-entry.ts';

const signedIn = { data: { user: { id: 'account-A', email: 'member@example.invalid', role: 'untrusted-extra' } }, error: null };
const signedOut = { data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 } };
const unavailable = { data: { user: null }, error: { status: 503 } };
const reader = response => ({ auth: { getUser: async () => response } });

test('auth entry projects only the server-verified account ID', async () => {
  let reads = 0;
  assert.deepEqual(await inspectAuthEntry({ auth: { getUser: async () => { reads++; return signedIn; } } }), { state: 'signed-in', accountId: 'account-A' });
  assert.equal(reads, 1);
});

test('only a definite missing or rejected session permits signed-out entry', async () => {
  for (const response of [signedOut, { data: { user: null }, error: null }, { data: { user: null }, error: { status: 401 } }]) {
    assert.deepEqual(await inspectAuthEntry(reader(response)), { state: 'signed-out' });
  }
  assert.deepEqual(await inspectAuthEntry({ auth: { getUser: async () => { throw { name: 'AuthSessionMissingError' }; } } }), { state: 'signed-out' });
});

test('network failure, provider failure and malformed identities fail closed', async () => {
  for (const response of [unavailable, { data: { user: { id: '' } }, error: null }, { data: { user: { id: 5 } }, error: null }, { data: { user: { id: 'account-A' } }, error: { status: 401 } }, { data: { user: null }, error: { status: 429 } }, { data: {}, error: null }]) {
    assert.deepEqual(await inspectAuthEntry(reader(response)), { state: 'unavailable' });
  }
  assert.deepEqual(await inspectAuthEntry({ auth: { getUser: async () => { throw new Error('fixture network failure'); } } }), { state: 'unavailable' });
});

// These tests execute the current action/route bodies with explicit SDK/Next
// fixtures. They are mutation-order regression tests, not provider or E2E proof.
async function body(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  return stripTypeScriptTypes(source).replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
}
class TestRedirect extends Error {
  constructor(path) { super('fixture redirect'); this.path = path; }
}
function actionFixture(response, source) {
  const calls = { mutation: 0, cleanup: 0, provider: 0 };
  const forbiddenMutation = async () => { calls.mutation++; throw new Error('fixture must not mutate'); };
  const client = { auth: { getUser: async () => response, signInWithPassword: forbiddenMutation, signInWithOAuth: forbiddenMutation, signUp: forbiddenMutation, signOut: forbiddenMutation, resetPasswordForEmail: forbiddenMutation } };
  const names = ['redirect', 'serverClient', 'inspectAuthEntry', 'readAuthCredentials', 'readAuthEmail', 'googleAuthConfig', 'passwordRecoveryConfig', 'signupAuthConfig', 'backendConfig', 'confirmedSignupProviderAvailable', 'clearLocalAuthSession', 'attemptSignupAndClearSession'];
  const values = [path => { throw new TestRedirect(path); }, async () => client, inspectAuthEntry, () => ({ email: 'member@example.invalid', password: 'fixture-not-a-live-password' }), () => 'member@example.invalid', () => ({ callback: 'https://site.example.invalid/auth/callback' }), () => ({ callback: 'https://site.example.invalid/auth/recovery/callback' }), () => ({ callback: 'https://site.example.invalid/auth/confirm' }), () => { calls.provider++; return {}; }, async () => { calls.provider++; return true; }, async () => { calls.cleanup++; }, async () => { calls.mutation++; }];
  const create = new Function(...names, source + '\nreturn { signIn, signInWithGoogle, signUp, requestPasswordReset, retrySignupCleanup, finishPasswordResetSignOut };');
  return { actions: create(...values), calls };
}

test('stale login, Google, signup and cleanup actions preserve an active account', async () => {
  const source = await body('../src/app/auth/actions.ts');
  for (const name of ['signIn', 'signInWithGoogle', 'signUp', 'requestPasswordReset', 'retrySignupCleanup', 'finishPasswordResetSignOut']) {
    const { actions, calls } = actionFixture(signedIn, source);
    await assert.rejects(actions[name](new FormData()), error => error instanceof TestRedirect && error.path === '/app', name);
    assert.deepEqual(calls, { mutation: 0, cleanup: 0, provider: 0 }, name);
  }
});

test('uncertain identities cannot start login/signup/recovery or clear cookies', async () => {
  const source = await body('../src/app/auth/actions.ts');
  for (const name of ['signIn', 'signInWithGoogle', 'signUp', 'requestPasswordReset', 'retrySignupCleanup', 'finishPasswordResetSignOut']) {
    const { actions, calls } = actionFixture(unavailable, source);
    const path = name === 'signUp' ? '/sign-up?notice=connection'
      : name === 'requestPasswordReset' ? '/forgot-password?notice=callback'
        : '/sign-in?notice=connection';
    await assert.rejects(actions[name](new FormData()), error => error instanceof TestRedirect && error.path === path, name);
    assert.deepEqual(calls, { mutation: 0, cleanup: 0, provider: 0 }, name);
  }
});

test('signed-out recovery requests keep provider failures account-enumeration safe', async () => {
  const source = await body('../src/app/auth/actions.ts');
  for (const result of [{ error: { message: 'provider failure' } }, null]) {
    let sends = 0;
    const client = { auth: {
      getUser: async () => signedOut,
      resetPasswordForEmail: async (email, options) => {
        sends++;
        assert.equal(email, 'member@example.invalid');
        assert.deepEqual(options, { redirectTo: 'https://site.example.invalid/auth/recovery/callback' });
        if (result === null) throw new Error('fixture transport failure');
        return result;
      },
    } };
    const names = ['redirect', 'serverClient', 'inspectAuthEntry', 'readAuthEmail', 'passwordRecoveryConfig'];
    const values = [path => { throw new TestRedirect(path); }, async () => client, inspectAuthEntry, form => form.get('email'), () => ({ callback: 'https://site.example.invalid/auth/recovery/callback' })];
    const action = new Function(...names, source + '\nreturn requestPasswordReset;')(...values);
    const form = new FormData();
    form.set('email', 'member@example.invalid');
    await assert.rejects(action(form), error => error instanceof TestRedirect && error.path === '/forgot-password?notice=requested');
    assert.equal(sends, 1);
  }
});

test('unsigned cleanup may remove stale cookies without signing out through the SDK', async () => {
  const source = await body('../src/app/auth/actions.ts');
  for (const [name, path] of [['retrySignupCleanup', '/confirm-email?notice=requested'], ['finishPasswordResetSignOut', '/sign-in?notice=password-updated']]) {
    const { actions, calls } = actionFixture(signedOut, source);
    await assert.rejects(actions[name](), error => error instanceof TestRedirect && error.path === path);
    assert.deepEqual(calls, { mutation: 0, cleanup: 1, provider: 0 });
  }
});

class TestResponse extends Response {
  static redirect(url, init = {}) { return new TestResponse(null, { status: 307, ...init, headers: { ...init.headers, Location: url.href } }); }
}
test('OAuth and confirmation callbacks do not exchange or clear an existing/uncertain session', async () => {
  for (const path of ['../src/app/auth/callback/route.ts', '../src/app/auth/confirm/route.ts']) {
    const source = await body(path);
    for (const response of [signedIn, unavailable]) {
      let exchanges = 0; let clears = 0;
      const client = { auth: { getUser: async () => response, exchangeCodeForSession: async () => { exchanges++; }, signOut: async () => { clears++; } } };
      const create = new Function('readAuthCode', 'NextResponse', 'serverClient', 'googleAuthConfig', 'signupAuthConfig', 'inspectAuthEntry', 'clearLocalAuthSession', 'exitLocalAuthSession', source + '\nreturn GET;');
      const config = () => ({ callback: 'https://site.example.invalid/auth/callback' });
      const handler = create(() => ({ code: 'fixture-code' }), TestResponse, async () => client, config, config, inspectAuthEntry, async () => { clears++; }, async () => { clears++; });
      const result = await handler({ nextUrl: new URL('https://site.example.invalid/auth/callback?code=fixture-code') });
      const destination = new URL(result.headers.get('location'));
      assert.equal(destination.origin, 'https://site.example.invalid');
      assert.equal(destination.pathname, response === signedIn ? '/app' : '/sign-in');
      assert.equal(result.headers.get('cache-control'), 'private, no-store');
      assert.equal(exchanges, 0); assert.equal(clears, 0);
    }
  }
});

test('recovery callback preserves an existing or uncertain session without exchanging the recovery code', async () => {
  const source = await body('../src/app/auth/recovery/callback/route.ts');
  for (const response of [signedIn, unavailable]) {
    let exchanges = 0;
    const client = { auth: { getUser: async () => response, exchangeCodeForSession: async () => { exchanges++; } } };
    const create = new Function('readAuthCode', 'NextResponse', 'serverClient', 'passwordRecoveryConfig', 'inspectAuthEntry', source + '\nreturn GET;');
    const handler = create(() => ({ code: 'fixture-recovery-code' }), TestResponse, async () => client,
      () => ({ callback: 'https://site.example.invalid/auth/recovery/callback' }), inspectAuthEntry);
    const result = await handler({ nextUrl: new URL('https://site.example.invalid/auth/recovery/callback?code=fixture-recovery-code') });
    const destination = new URL(result.headers.get('location'));
    assert.equal(destination.origin, 'https://site.example.invalid');
    assert.equal(destination.pathname, response === signedIn ? '/app' : '/forgot-password');
    assert.equal(destination.search, response === signedIn ? '' : '?notice=callback');
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
    assert.equal(exchanges, 0);
  }
});

test('recovery callback exchanges only a confirmed signed-out session and handles exchange outcomes', async () => {
  const source = await body('../src/app/auth/recovery/callback/route.ts');
  for (const scenario of [
    { result: { error: null }, pathname: '/reset-password', search: '' },
    { result: { error: { message: 'invalid code' } }, pathname: '/forgot-password', search: '?notice=expired' },
    { throws: true, pathname: '/forgot-password', search: '?notice=callback' },
  ]) {
    let exchanges = 0;
    const client = { auth: { getUser: async () => signedOut, exchangeCodeForSession: async code => {
      exchanges++;
      assert.equal(code, 'fixture-recovery-code');
      if (scenario.throws) throw new Error('fixture exchange failure');
      return scenario.result;
    } } };
    const create = new Function('readAuthCode', 'NextResponse', 'serverClient', 'passwordRecoveryConfig', 'inspectAuthEntry', source + '\nreturn GET;');
    const handler = create(() => ({ code: 'fixture-recovery-code' }), TestResponse, async () => client,
      () => ({ callback: 'https://site.example.invalid/auth/recovery/callback' }), inspectAuthEntry);
    const result = await handler({ nextUrl: new URL('https://site.example.invalid/auth/recovery/callback?code=fixture-recovery-code') });
    const destination = new URL(result.headers.get('location'));
    assert.equal(destination.origin, 'https://site.example.invalid');
    assert.equal(destination.pathname, scenario.pathname);
    assert.equal(destination.search, scenario.search);
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
    assert.equal(result.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(exchanges, 1);
  }
});
