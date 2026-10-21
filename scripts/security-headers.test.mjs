import test from 'node:test';
import assert from 'node:assert/strict';
import { contentSecurityPolicy, supabaseCookieOptions } from '../src/lib/security-headers.ts';

test('production CSP binds executable scripts to a request nonce', () => {
  const policy = contentSecurityPolicy('Y2xpZW50LW5vbmNlLQ==', 'production');
  assert.match(policy, /script-src 'self' 'nonce-Y2xpZW50LW5vbmNlLQ==' 'strict-dynamic'/);
  assert.match(policy, /style-src 'self' 'nonce-Y2xpZW50LW5vbmNlLQ=='/);
  assert.match(policy, /style-src-attr 'unsafe-inline'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /form-action 'self'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /upgrade-insecure-requests/);
  const scripts = policy.match(/script-src[^;]+/)?.[0] ?? '';
  assert.doesNotMatch(scripts, /unsafe-inline|unsafe-eval/);
});

test('development CSP allows Next.js debugging without weakening production policy', () => {
  const policy = contentSecurityPolicy('bG9jYWwtbm9uY2U=', 'development');
  assert.match(policy, /'unsafe-eval'/);
  assert.match(policy, /connect-src 'self' ws: wss:/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
  assert.throws(() => contentSecurityPolicy('bad nonce', 'production'), /base64 characters/);
});

test('Supabase session cookies are HttpOnly, Lax and Secure in production', () => {
  assert.deepEqual(supabaseCookieOptions('production'), { secure: true, httpOnly: true, sameSite: 'lax' });
  assert.deepEqual(supabaseCookieOptions('development'), { secure: false, httpOnly: true, sameSite: 'lax' });
});
