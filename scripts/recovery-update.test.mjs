import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { readNewPassword } from '../src/lib/auth-input.ts';
import { matchesFormAccount, matchesFormRecoverySession } from '../src/lib/form-account.ts';
import { exitLocalAuthSession } from '../src/lib/local-auth-exit.ts';

// Execute the current server action with explicit SDK fixtures. These tests prove
// mutation ordering/denials, not provider delivery or actual DB consumption.
const accountId = '11111111-2222-4333-8444-555555555555';
const sessionId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const otherId = '99999999-8888-4777-8666-555555555555';
const authority = { accountId, sessionId };
const source = stripTypeScriptTypes(await readFile(new URL('../src/app/auth/actions.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');

class Redirect extends Error {
  constructor(path) { super('fixture redirect'); this.path = path; }
}
function form() {
  const data = new FormData();
  data.set('expected_account', accountId);
  data.set('expected_recovery_session', sessionId);
  data.set('new_password', 'test-only-password');
  data.set('confirm_password', 'test-only-password');
  return data;
}
function fixture(options = {}) {
  const calls = [];
  const client = {
    rpc: async (name, input) => {
      calls.push('consume');
      assert.equal(name, 'consume_recovery_session_v1');
      assert.deepEqual(input, { expected_user: accountId, expected_session: sessionId });
      if (options.consumeThrows) throw new Error('fixture lost receipt response');
      return options.consume ?? { data: true, error: null };
    },
    auth: {
      updateUser: async input => {
        calls.push('update');
        assert.deepEqual(input, { password: 'test-only-password' });
        if (options.updateThrows) throw new Error('fixture lost Auth response');
        return options.update ?? { data: { user: { id: accountId } }, error: null };
      },
      signOut: async input => { calls.push('signout'); assert.deepEqual(input, { scope: 'local' }); return { error: null }; },
    },
  };
  const names = ['redirect', 'passwordRecoveryConfig', 'readNewPassword', 'serverClient', 'inspectRecoveryAuthority',
    'matchesFormAccount', 'matchesFormRecoverySession', 'exitLocalAuthSession', 'clearLocalAuthSession'];
  const values = [path => { throw new Redirect(path); }, () => options.disabled ? null : {}, readNewPassword,
    async () => { calls.push('client'); return options.noClient ? null : client; },
    async () => { calls.push('authority'); return options.noAuthority ? null : authority; },
    matchesFormAccount, matchesFormRecoverySession, exitLocalAuthSession,
    async () => { calls.push('clear'); if (options.cleanupThrows) throw new Error('fixture cookie failure'); }];
  return { action: new Function(...names, source + '\nreturn updatePassword;')(...values), calls };
}
async function redirected(action, data, path) {
  await assert.rejects(action(data), error => error instanceof Redirect && error.path === path);
}

test('disabled recovery and invalid input cannot load an account or mutate a password', async () => {
  const disabled = fixture({ disabled: true });
  await redirected(disabled.action, form(), '/reset-password?notice=configuration');
  assert.deepEqual(disabled.calls, []);
  const invalid = fixture();
  const data = form(); data.set('confirm_password', 'different-test-password');
  await redirected(invalid.action, data, '/reset-password?notice=mismatch');
  assert.deepEqual(invalid.calls, []);
});

test('missing service or recovery authority never consumes or changes credentials', async () => {
  const missing = fixture({ noClient: true });
  await redirected(missing.action, form(), '/reset-password?notice=configuration');
  assert.deepEqual(missing.calls, ['client']);
  const ordinary = fixture({ noAuthority: true });
  await redirected(ordinary.action, form(), '/forgot-password?notice=expired');
  assert.deepEqual(ordinary.calls, ['client', 'authority']);
});

test('account and session switches, duplicate bindings and file bindings fail before consumption', async () => {
  for (const field of ['expected_account', 'expected_recovery_session']) {
    for (const change of ['switch', 'duplicate', 'missing', 'file']) {
      const data = form();
      if (change === 'switch') data.set(field, otherId);
      if (change === 'duplicate') data.append(field, data.get(field));
      if (change === 'missing') data.delete(field);
      if (change === 'file') data.set(field, new Blob(['fixture']), 'fixture.txt');
      const item = fixture();
      await redirected(item.action, data, '/reset-password?notice=session');
      assert.deepEqual(item.calls, ['client', 'authority']);
    }
  }
});

test('only an explicit successful database receipt permits the Auth update', async () => {
  for (const consume of [{ data: false, error: null }, { data: null, error: null }, { data: 'true', error: null },
    { data: [true], error: null }, { data: { ok: true }, error: null }, { data: true, error: { code: 'fixture' } }]) {
    const item = fixture({ consume });
    await redirected(item.action, form(), '/forgot-password?notice=expired');
    assert.deepEqual(item.calls, ['client', 'authority', 'consume']);
  }
  const lost = fixture({ consumeThrows: true });
  await redirected(lost.action, form(), '/forgot-password?notice=expired');
  assert.deepEqual(lost.calls, ['client', 'authority', 'consume']);
});

test('successful update follows consumption and clears the local attempt before sign-in', async () => {
  const item = fixture();
  await redirected(item.action, form(), '/sign-in?notice=password-updated');
  assert.deepEqual(item.calls, ['client', 'authority', 'consume', 'update', 'signout', 'clear']);
});

test('provider error, lost response or unexpected identity requires a fresh link with uncertainty stated', async () => {
  for (const options of [{ updateThrows: true }, { update: { data: { user: null }, error: { code: 'fixture' } } },
    { update: { data: { user: { id: otherId } }, error: null } }]) {
    const item = fixture(options);
    await redirected(item.action, form(), '/forgot-password?notice=unconfirmed');
    assert.deepEqual(item.calls, ['client', 'authority', 'consume', 'update', 'signout', 'clear']);
  }
});

test('confirmed password change with failed cookie cleanup never claims browser sign-out', async () => {
  const item = fixture({ cleanupThrows: true });
  await redirected(item.action, form(), '/sign-in?notice=password-updated-cleanup');
  assert.deepEqual(item.calls, ['client', 'authority', 'consume', 'update', 'signout', 'clear']);
});
