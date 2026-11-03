import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

// Build and serve the design-only workspace with synthetic configuration.
// This never enables member services or contacts the configured Supabase API.
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: 'https://configuration-fixture.invalid',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_configuration_fixture',
  ENABLE_MEMBER_PLATFORM: 'false',
  ENABLE_MEMBER_PLATFORM_PRODUCTION: 'false',
  ENABLE_MEMBER_PLATFORM_TEST: 'false',
  ENABLE_GOOGLE_SIGN_IN: 'false',
  ENABLE_DESIGN_PREVIEW: 'true',
  IDEALAB_ISOLATED_ACCEPTANCE_BUILD: 'true',
  ACCOUNT_ENVIRONMENT: 'production',
};

const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { env, stdio: 'inherit' });
if (build.error) throw build.error;
assert.equal(build.status, 0, 'isolated member-preview build must pass');

const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', resolve);
});
const address = probe.address();
assert.ok(address && typeof address === 'object');
const port = address.port;
await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));

const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: process.cwd(), env, stdio: 'inherit',
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview server exited early with ${server.exitCode}.`);
    try {
      const response = await fetch(`${origin}/design/member-space?screen=home`, { signal: AbortSignal.timeout(1500) });
      if (response.status === 200) { ready = true; break; }
    } catch { /* Wait briefly while Next starts. */ }
    await delay(500);
  }
  assert.equal(ready, true, 'gated member design preview must return HTTP 200');

  const browser = spawnSync(process.execPath, ['scripts/member-space-browser.mjs'], {
    cwd: process.cwd(), env: { ...env, MEMBER_PREVIEW_ORIGIN: origin }, stdio: 'inherit',
  });
  if (browser.error) throw browser.error;
  assert.equal(browser.status, 0, 'member responsive/accessibility browser suite must pass');
} finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}
