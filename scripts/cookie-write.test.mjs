import test from 'node:test';
import assert from 'node:assert/strict';
import { writeCookieBatch } from '../src/lib/cookie-write.ts';
import { createServerClient } from '@supabase/ssr';

test('writable auth context propagates cookie write failures', () => {
  const failure = new Error('test-only cookie write failure');
  const written = [];
  assert.throws(() => writeCookieBatch(['first', 'second'], value => {
    if (value === 'second') throw failure;
    written.push(value);
  }, true), error => error.message === 'Unable to write authentication cookies' && error !== failure);
  assert.deepEqual(written, ['first']); // A partial write is not a success.
});

test('read-only rendering tolerates cookie write failure and writable success writes all', () => {
  assert.doesNotThrow(() => writeCookieBatch(['value'], () => { throw new Error('read-only'); }, false));
  const written = [];
  writeCookieBatch(['first', 'second'], value => written.push(value), true);
  assert.deepEqual(written, ['first', 'second']);
});

test('installed Supabase SDK propagates sanitized session cookie failure', async () => {
  const logged = [];
  const originalError = console.error;
  let requests = 0;
  let writes = 0;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  try {
    const client = createServerClient('https://fixture.invalid', 'fixture-public-key', {
      cookies: {
        getAll: () => [],
        setAll: values => writeCookieBatch(values, () => {
          writes++;
          throw new Error('private-cookie-detail');
        }, true),
      },
      global: { fetch: async () => {
        requests++;
        return Response.json({
          access_token: 'fixture-token', refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600,
          user: { id: '11111111-2222-4333-8444-555555555555', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
        });
      } },
    });
    await assert.rejects(client.auth.signInWithPassword({ email: 'fixture@example.test', password: 'fixture-password' }),
      error => error.message === 'Unable to write authentication cookies' && !error.cause);
    assert.equal(requests, 1);
    assert.ok(writes > 0);
    assert.ok(logged.every(message => !message.includes('private-cookie-detail')));
  } finally {
    console.error = originalError;
  }
});

test('installed Supabase PKCE exchange propagates sanitized cookie failure', async () => {
  const jar = new Map();
  let failWrites = false;
  let requests = 0;
  const logged = [];
  const originalError = console.error;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  const options = {
    cookies: {
      getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
      setAll: values => writeCookieBatch(values, ({ name, value }) => {
        if (failWrites) throw new Error('private-cookie-detail');
        jar.set(name, value);
      }, true),
    },
    global: { fetch: async () => {
      requests++;
      return Response.json({
        access_token: 'fixture-token', refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600,
        user: { id: '11111111-2222-4333-8444-555555555555', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
      });
    } },
  };
  try {
    const first = createServerClient('https://fixture.invalid', 'fixture-public-key', options);
    const { error } = await first.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://127.0.0.1:3015/auth/callback', skipBrowserRedirect: true } });
    assert.equal(error, null);
    assert.ok(jar.size > 0);
    failWrites = true;
    const callback = createServerClient('https://fixture.invalid', 'fixture-public-key', options);
    await assert.rejects(callback.auth.exchangeCodeForSession('fixture-code'),
      error => error.message === 'Unable to write authentication cookies' && !error.cause);
    assert.equal(requests, 1);
    assert.ok(logged.every(message => !message.includes('private-cookie-detail')));
  } finally {
    console.error = originalError;
  }
});
