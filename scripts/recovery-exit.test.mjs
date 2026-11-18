import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { exitLocalAuthSession } from '../src/lib/local-auth-exit.ts';
import { matchesFormAccount } from '../src/lib/form-account.ts';

const accountId = '11111111-2222-4333-8444-555555555555';
const otherId = '99999999-8888-4777-8666-555555555555';
const source = stripTypeScriptTypes(await readFile(new URL('../src/app/auth/actions.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');

class Redirect extends Error { constructor(path) { super('fixture redirect'); this.path = path; } }

function fixture({ userId = accountId, signOutError = false, cleanupError = false } = {}) {
  const calls = [];
  const client = { auth: {
    async getUser() { calls.push('get-user'); return { data: { user: userId ? { id: userId } : null }, error: null }; },
    async signOut(options) { calls.push('sign-out'); assert.deepEqual(options, { scope: 'local' }); if (signOutError) throw new Error('provider sign-out failed'); },
  } };
  const action = new Function('redirect', 'serverClient', 'matchesFormAccount', 'exitLocalAuthSession', 'clearLocalAuthSession',
    `${source}\nreturn signOutExpiredRecovery;`)(
    path => { throw new Redirect(path); },
    async () => client,
    matchesFormAccount,
    exitLocalAuthSession,
    async () => { calls.push('clear-cookies'); if (cleanupError) throw new Error('cookie clear failed'); },
  );
  const form = new FormData();
  form.set('expected_account', accountId);
  return { action, calls, form };
}

test('expired recovery cleanup is bound to the current account', async () => {
  const item = fixture({ userId: otherId });
  await assert.rejects(item.action(item.form), error => error instanceof Redirect && error.path === '/sign-in?notice=session');
  assert.deepEqual(item.calls, ['get-user']);
});

test('expired recovery clears local cookies and opens a fresh-link path after sign-out failure', async () => {
  const item = fixture({ signOutError: true });
  await assert.rejects(item.action(item.form), error => error instanceof Redirect && error.path === '/forgot-password');
  assert.deepEqual(item.calls, ['get-user', 'sign-out', 'clear-cookies']);
});

test('failed local cookie cleanup leaves an explicit retry state', async () => {
  const item = fixture({ cleanupError: true });
  await assert.rejects(item.action(item.form), error => error instanceof Redirect && error.path === '/reset-password?notice=cleanup');
  assert.deepEqual(item.calls, ['get-user', 'sign-out', 'clear-cookies']);
});
