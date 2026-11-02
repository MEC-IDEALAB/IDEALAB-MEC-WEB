import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

async function availablePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const port = reservation.address().port;
  await new Promise((resolve, reject) => {
    reservation.close(error => error ? reject(error) : resolve());
  });
  return port;
}

const port = await availablePort();
const base = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  NODE_ENV: 'development',
  IDEALAB_ISOLATED_ACCEPTANCE_BUILD: 'true',
  ENABLE_MEMBER_PLATFORM: 'true',
  ENABLE_MEMBER_PLATFORM_TEST: 'false',
  ACCOUNT_ENVIRONMENT: 'validation',
  NEXT_PUBLIC_SUPABASE_URL: 'https://gvvqlfachzbufstzoiwi.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_proxy_test_fixture',
  AUTH_SITE_URL: 'http://127.0.0.1:3015',
  ENABLE_GOOGLE_SIGN_IN: 'false',
};
delete env.VERCEL;
delete env.VERCEL_ENV;
delete env.RENDER;

const server = spawn(process.execPath, [
  'node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port),
], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-6000); });
server.stderr.on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-6000); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(`Proxy test server exited: ${serverOutput}`);
    if (serverOutput.includes('Ready in')) {
      try {
        const response = await fetch(`${base}/sign-in`);
        if (response.ok) { ready = true; break; }
      } catch { /* The dev server is still binding its port. */ }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(ready, `Validation test server did not become ready: ${serverOutput}`);

  const publicPage = await fetch(`${base}/sign-in`, { redirect: 'manual' });
  assert.equal(publicPage.status, 200, 'The public sign-in page must pass through the proxy');
  assert.match(publicPage.headers.get('content-security-policy'), /script-src[^;]*'nonce-/);
  assert.match(publicPage.headers.get('cache-control'), /no-store/);

  const protectedPage = await fetch(`${base}/app/profile`, { redirect: 'manual' });
  assert.equal(protectedPage.status, 307, 'An unauthenticated member route must fail closed');
  const location = new URL(protectedPage.headers.get('location'), base);
  assert.equal(location.pathname, '/sign-in');
  assert.equal(location.searchParams.get('notice'), 'session');
  assert.match(protectedPage.headers.get('cache-control'), /no-store/);
  assert.equal(protectedPage.headers.get('vary'), 'Cookie');
  assert.match(protectedPage.headers.get('content-security-policy'), /script-src[^;]*'nonce-/);

  console.log('PASS: configured validation proxy passes public auth pages and redirects unauthenticated member routes with no-store and Vary: Cookie headers; no account credentials or Supabase session were used.');
} finally {
  if (server.exitCode === null) {
    const stopped = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    await stopped;
  }
}
