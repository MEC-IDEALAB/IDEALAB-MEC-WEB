import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const accountId = '11111111-2222-4333-8444-555555555555';
const source = stripTypeScriptTypes(await readFile(new URL('../src/app/account-access/actions.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
const publicProfileSource = stripTypeScriptTypes(await readFile(new URL('../src/features/profile/public-profile-actions.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');

function fixture(scope) {
  const calls = [];
  const client = {
    auth: { async getUser() { calls.push('get-user'); return { data: { user: { id: accountId, email_confirmed_at: 'confirmed' } }, error: null }; } },
    async rpc() { calls.push('profile-rpc'); return { data: null, error: null }; },
  };
  const dependencies = [
    () => calls.push('revalidate'), async () => client, () => true,
    () => { calls.push('evaluate-profile'); return { profileState: 'ready', profile: { role: 'student' } }; },
    () => { calls.push('form-account'); return true; },
    () => ({ ok: true, display_number: 'MEC001', expected_revision: '1', self_declaration: true }),
    () => null, () => true,
    () => ({ ok: true, profile: {}, expected_revision: '1' }), () => ({ status: 'saved' }),
    async () => { calls.push('session-scope'); return scope; },
  ];
  const names = ['revalidatePath', 'serverClient', 'hasVerifiedEmail', 'evaluateOwnProfile', 'matchesFormAccount',
    'buildRegistrationClaimPayload', 'parseRegistrationClaimResponse', 'confirmClaimedProfile',
    'buildProfileSavePayload', 'parseProfileSaveResponse', 'inspectMemberSessionScope'];
  const actions = new Function(...names, `${source}\nreturn { saveRequiredProfile, claimMecRegistration };`)(...dependencies);
  return { actions, calls };
}

test('recovery and unverifiable sessions cannot read or mutate onboarding profiles', async () => {
  for (const scope of ['recovery', null]) {
    const item = fixture(scope);
    const form = new FormData();
    for (const action of [item.actions.saveRequiredProfile, item.actions.claimMecRegistration]) {
      const result = await action({}, form);
      assert.equal(result.status, 'error');
    }
    assert.deepEqual(item.calls, ['get-user', 'session-scope', 'get-user', 'session-scope']);
  }
});

test('recovery sessions cannot load or mutate a public-profile draft', async () => {
  const calls = [];
  const client = {
    auth: { async getUser() { calls.push('get-user'); return { data: { user: { id: accountId, email_confirmed_at: 'confirmed' } }, error: null }; } },
    async rpc() { calls.push('profile-rpc'); return { data: null, error: null }; },
  };
  const names = ['serverClient', 'hasVerifiedEmail', 'evaluateOwnProfile', 'matchesFormAccount', 'publicProfileEnabled',
    'parsePublicProfileRead', 'parsePublicProfileSave', 'profilePayloadFromForm', 'inspectMemberSessionScope'];
  const values = [async () => client, () => true, () => ({ profileState: 'ready' }), () => true, () => true,
    () => null, () => ({ status: 'saved' }), () => ({ revision: '1', payload: {} }),
    async () => { calls.push('session-scope'); return 'recovery'; }];
  const action = new Function(...names, `${publicProfileSource}\nreturn savePrivateProfileDraft;`)(...values);
  const form = new FormData();
  form.set('expected_account', accountId);
  const result = await action({}, form);
  assert.equal(result.status, 'error');
  assert.deepEqual(calls, ['get-user', 'session-scope']);
});
