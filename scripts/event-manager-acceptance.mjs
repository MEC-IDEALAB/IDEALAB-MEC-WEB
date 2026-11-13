import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_SUPABASE_URL: 'https://configuration-fixture.invalid',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_configuration_fixture', ENABLE_MEMBER_PLATFORM: 'false',
  ENABLE_MEMBER_PLATFORM_PRODUCTION: 'false', ENABLE_MEMBER_PLATFORM_TEST: 'false', ENABLE_GOOGLE_SIGN_IN: 'false',
  ENABLE_DESIGN_PREVIEW: 'true', IDEALAB_ISOLATED_ACCEPTANCE_BUILD: 'true', ACCOUNT_ENVIRONMENT: 'production' };
const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { env, stdio: 'inherit' });
if (build.error) throw build.error;
assert.equal(build.status, 0, 'current-source optimized build');
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: 'inherit' });
let browser;
const results = [], output = 'artifacts/event-manager';
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    assert.equal(server.exitCode, null, 'owned preview server remains live');
    try { if ((await fetch(`${origin}/design/event-manager`, { signal: AbortSignal.timeout(1500) })).ok) { ready = true; break; } } catch { /* Startup only. */ }
    await delay(500);
  }
  assert(ready, 'design route available');
  await mkdir(output, { recursive: true });
  browser = await chromium.launch();
  for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' });
    await context.addInitScript(theme => { localStorage.setItem('idealab-mec:theme', theme); sessionStorage.setItem('idealab-mec:loader-seen:v3', '1'); }, theme);
    const page = await context.newPage(), errors = [], backend = [], mutations = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('supabase.')) backend.push('unexpected backend request'); if (request.headers()['next-action']) mutations.push('unexpected server action'); });
    assert.equal((await page.goto(`${origin}/design/event-manager`)).status(), 200);
    await page.getByLabel('Event title', { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => !document.querySelector('.event-editor-fields')?.disabled);
    assert.equal(await page.locator('h1').count(), 1);
    assert(await page.getByText('Visual preview only. No account, event assignment, save or publication is connected.').isVisible());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px no page overflow`);
    const analysis = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(analysis.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })), [], `${width}px ${theme} accessibility`);
    await page.getByLabel('Event title', { exact: true }).fill('Synthetic workshop');
    await page.getByLabel('Description', { exact: true }).fill('A synthetic description for visual form acceptance.');
    await page.getByLabel('Venue', { exact: true }).fill('Test room');
    await page.getByLabel('Starts · IST', { exact: true }).fill('2099-11-03T09:00');
    await page.getByLabel('Event title', { exact: true }).focus(); await page.keyboard.press('Tab');
    assert(await page.getByLabel('Description', { exact: true }).evaluate(node => node === document.activeElement), 'keyboard field order');
    const save = page.getByRole('button', { name: 'Save private draft', exact: true });
    await save.scrollIntoViewIfNeeded();
    const saveBox = await save.boundingBox();
    const nav = page.getByRole('navigation', { name: 'Mobile workspace navigation', exact: true });
    if (await nav.isVisible()) assert(saveBox.y + saveBox.height <= (await nav.boundingBox()).y, 'save button clears bottom navigation');
    await save.click();
    await page.getByRole('status').filter({ hasText: 'Visual preview only. No draft was saved and no command was sent.' }).waitFor();
    assert.equal(errors.length, 0); assert.equal(backend.length, 0); assert.equal(mutations.length, 0);
    await page.screenshot({ path: `${output}/${width}-${theme}.png`, fullPage: true });
    results.push({ width, theme, overflow: false, axeViolations: 0, keyboard: 'passed', previewSend: 'blocked' });
    await context.close();
  }
  const protectedResult = await fetch(`${origin}/app/events/manage`, { redirect: 'manual' });
  assert.equal(protectedResult.status, 307); assert.match(protectedResult.headers.get('location'), /\/sign-in\?notice=configuration$/);
  await writeFile(`${output}/summary.json`, JSON.stringify({ scope: 'Current-source visual preview and configuration gate only; no live Auth, API or persistence E2E.', results, protectedRoute: 'redirected' }, null, 2));
  console.log(`PASS: ${results.length} event editor responsive/axe/keyboard/preview checks, plus protected route configuration gate.`);
} finally {
  await browser?.close();
  if (server.exitCode === null) { server.kill('SIGTERM'); await Promise.race([once(server, 'exit'), delay(5000)]); if (server.exitCode === null) server.kill('SIGKILL'); }
}
