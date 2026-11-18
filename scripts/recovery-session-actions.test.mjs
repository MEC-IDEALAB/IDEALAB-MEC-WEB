import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const accountId = '11111111-2222-4333-8444-555555555555';
const authSource = stripTypeScriptTypes(await readFile(new URL('../src/app/auth/actions.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
const source = stripTypeScriptTypes(await readFile(new URL('../src/app/account-access/actions.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');

function fixture(scope, { matchingForm = true } = {}) {
  const calls = [];
  const client = {
    auth: {
      async getUser() {
        calls.push('get-user');
        return { data: { user: { id: accountId, email_confirmed_at: 'confirmed' } }, error: null };
      },
    },
    async rpc() { calls.push('profile-rpc'); return { data: null, error: null }; },
  };
  const dependencies = [
    () => calls.push('revalidate'),
    async () => client,
    () => true,
    () => { calls.push('evaluate-profile'); return { profileState: 'ready', profile: { role: 'student' } }; },
    () => { calls.push('form-account'); return matchingForm; },
    () => ({ ok: true, display_number: 'MEC001', expected_revision: '1', self_declaration: true }),
    () => null,
    () => true,
    () => ({ ok: true, profile: {}, expected_revision: '1' }),
    () => ({ status: 'saved' }),
    async () => { calls.push('session-scope'); return scope; },
  ];
  const names = [
    'revalidatePath', 'serverClient', 'hasVerifiedEmail', 'evaluateOwnProfile',
    'matchesFormAccount', 'buildRegistrationClaimPayload', 'parseRegistrationClaimResponse',
    'confirmClaimedProfile', 'buildProfileSavePayload', 'parseProfileSaveResponse',
    'inspectMemberSessionScope',
  ];
  const actions = new Function(...names, `${source}\nreturn { saveRequiredProfile, claimMecRegistration };`)(...dependencies);
  return { actions, calls };
}

test('recovery and unverifiable sessions cannot read or mutate onboarding profiles', async () => {
  for (const scope of ['recovery', null]) {
    const item = fixture(scope);
    const form = new FormData();
    form.set('expected_account', accountId);
    for (const action of [item.actions.saveRequiredProfile, item.actions.claimMecRegistration]) {
      const result = await action({}, form);
      assert.equal(result.status, 'error');
    }
    assert.deepEqual(item.calls, ['get-user', 'session-scope', 'get-user', 'session-scope']);
  }
});

test('ordinary sessions continue to the account-bound form check', async () => {
  const item = fixture('normal', { matchingForm: false });
  const form = new FormData();
  form.set('expected_account', accountId);
  const result = await item.actions.saveRequiredProfile({}, form);
  assert.equal(result.status, 'error');
  assert.deepEqual(item.calls, ['get-user', 'session-scope', 'form-account']);
});
class ActionRedirect extends Error { constructor(path) { super('redirect'); this.path = path; } }

test('ordinary and unverifiable sessions cannot call the password action directly', async () => {
  for (const scope of ['normal', null]) {
    const calls = [];
    const client = { auth: {
      async getUser() { calls.push('get-user'); return { data: { user: { id: accountId } }, error: null }; },
      async updateUser() { calls.push('update-password'); return { error: null }; },
      async signOut() { calls.push('sign-out'); },
    } };
    const action = new Function('redirect', 'readNewPassword', 'passwordRecoveryConfig', 'serverClient', 'matchesFormAccount', 'inspectMemberSessionScope', 'exitLocalAuthSession', 'clearLocalAuthSession',
      `${authSource}\nreturn updatePassword;`)(
      path => { throw new ActionRedirect(path); },
      () => 'SafeFixturePassword123!',
      () => ({ callback: 'https://website-fixture.invalid/auth/recovery/callback' }),
      async () => client,
      (form, id) => form.get('expected_account') === id,
      async () => { calls.push('session-scope'); return scope; },
      async () => 'cleared',
      async () => {},
    );
    const form = new FormData();
    form.set('expected_account', accountId);
    await assert.rejects(action(form), error => error instanceof ActionRedirect && error.path === '/forgot-password?notice=expired');
    assert.deepEqual(calls, ['get-user', 'session-scope']);
  }
});

test('password action rejects a form bound to a different account before inspecting scope', async () => {
  const calls = [];
  const client = { auth: {
    async getUser() { calls.push('get-user'); return { data: { user: { id: accountId } }, error: null }; },
  } };
  const action = new Function('redirect', 'readNewPassword', 'passwordRecoveryConfig', 'serverClient', 'matchesFormAccount', 'inspectMemberSessionScope', 'exitLocalAuthSession', 'clearLocalAuthSession',
    `${authSource}\nreturn updatePassword;`)(
    path => { throw new ActionRedirect(path); },
    () => 'SafeFixturePassword123!',
    () => ({ callback: 'https://website-fixture.invalid/auth/recovery/callback' }),
    async () => client,
    (form, id) => form.get('expected_account') === id,
    async () => { calls.push('session-scope'); return 'recovery'; },
    async () => 'cleared',
    async () => {},
  );
  const form = new FormData();
  form.set('expected_account', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  await assert.rejects(action(form), error => error instanceof ActionRedirect && error.path === '/forgot-password?notice=expired');
  assert.deepEqual(calls, ['get-user']);
});
