// Real HTTP response regression against an already running loopback build.
// No credentials, codes, cookies or backend stubs are supplied or inspected.
import assert from 'node:assert/strict';
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3015');
assert(origin.protocol === 'http:' && ['127.0.0.1','localhost'].includes(origin.hostname) && origin.pathname === '/' && !origin.search && !origin.hash && !origin.username && !origin.password, 'Use an exact loopback test origin');
for (const path of ['/auth/confirm', '/auth/callback', '/auth/recovery/callback']) {
  const response = await fetch(new URL(`${path}?error=access_denied`, origin), { redirect: 'manual', signal: AbortSignal.timeout(12000) });
  assert([307,404].includes(response.status), `${path} rejects without a successful callback`);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer', `${path} must not expose a callback URL as a referrer`);
  assert.match(response.headers.get('cache-control') ?? '', /private, no-store/, `${path} stays private`);
  if (response.status === 307) assert.equal(new URL(response.headers.get('location')).origin, origin.origin, `${path} keeps its configured local destination`);
}
const page = await fetch(new URL('/sign-in?notice=password-updated-cleanup', origin), { redirect: 'manual', signal: AbortSignal.timeout(12000) });
assert.equal(page.status,200);
const body = await page.text();
assert(body.includes('Your password changed') && body.includes('Finish signing out'), 'Cleanup failure has truthful copy and a retry form');
assert.match(page.headers.get('cache-control') ?? '', /private, no-store/);
const home = await fetch(origin, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
assert.equal(home.status,200);
assert.equal(home.headers.get('referrer-policy'),'strict-origin-when-cross-origin','Public response policy remains unchanged');
console.log('PASS: three rejected callback headers, cleanup notice/form SSR and public policy; no positive account or browser journey claimed.');
