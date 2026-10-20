import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { chromium } from 'playwright';

// Real local production server/browser; no substituted backend or auth session.
// This gate covers the public/configuration slice. Live member acceptance is a
// separate mandatory gate before enabling operational services.
async function availablePort() {
  const reservation = createServer();
  await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
  const port = reservation.address().port;
  await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
  return port;
}
const port = await availablePort();
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', ENABLE_MEMBER_PLATFORM: 'false', ENABLE_DESIGN_PREVIEW: 'true' };
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-5000); });
server.stderr.on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-5000); });
let browser;
let previewOffServer;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Acceptance server exited: ${serverOutput}`);
    if (serverOutput.includes('Ready in')) {
      try { const response = await fetch(base); if (response.ok && server.exitCode === null) { ready = true; break; } } catch { /* Server starting. */ }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(ready, 'Production server must become ready');
  const home = await fetch(base);
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(home.headers.get('x-frame-options'), 'DENY');
  assert.match(home.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  for (const path of ['/app', '/app/profile', '/app/requests/new', '/app/workspace']) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 307, `${path} must not be accessible without auth`);
    assert.match(response.headers.get('location'), /\/sign-in\?notice=configuration$/);
    assert.match(response.headers.get('cache-control'), /private.*no-store/);
  }
  assert.equal((await fetch(base + '/unknown-page')).status, 404);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mkdir('artifacts/acceptance', { recursive: true });
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(base);
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert.match(await page.title(), /IDEALAB MEC/);
    assert.equal(await page.locator('main').count(), 1);
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
    assert(await page.locator('img').evaluateAll(images => images.length >= 2 && images.every(image => image.complete && image.naturalWidth > 0)), 'Every displayed logo/image must load');
    await page.evaluate(() => window.scrollTo(0, 0));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow at ${width}px`);
    await page.screenshot({ path: `artifacts/acceptance/home-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(base);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  assert(await skip.evaluate(element => element === document.activeElement), 'Keyboard starts at skip link');
  const skipBox = await skip.boundingBox();
  assert(skipBox && skipBox.width > 1 && skipBox.height > 1 && skipBox.y >= 0, 'Focused skip link must be visible');
  await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash, '#main-content');
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => Boolean(document.activeElement?.closest('main'))), 'Skip link must move keyboard navigation into main content');
  await page.goto(base);
  const menu = page.locator('.mobile-nav summary');
  await menu.click();
  assert(await page.locator('.mobile-nav').evaluate(node => node.open), 'Mobile menu opens');
  await menu.click();
  await page.keyboard.press('Tab');
  await page.goto(base + '/sign-in');
  await page.getByRole('heading', { name: 'Make yourself at home.' }).waitFor();
  assert(await page.getByRole('button', { name: /Sign in/ }).isDisabled(), 'Missing config must disable sign-in');
  assert(await page.getByLabel('Email address').isDisabled());
  assert(await page.getByText('Account access is being connected.').isVisible());
  await page.screenshot({ path: 'artifacts/acceptance/sign-in-mobile.png', fullPage: true });
  await page.goto(base + '/projects');
  await page.getByRole('heading', { name: 'Ideas grow together.' }).waitFor();
  assert(await page.getByRole('link', { name: /Sign in/ }).isVisible());
  await page.goto(base + '/app/requests/new');
  assert.match(page.url(), /\/sign-in\?notice=configuration$/);
  await page.goto(base + '/design/request');
  await page.getByRole('heading', { name: 'Try the request flow.' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Sample service (optional)').selectOption('sample-3d');
  await page.getByLabel('Request title').fill('Sample prototype fixture');
  await page.getByLabel('What do you need?').fill('Design preview only: discuss a prototype enclosure with the lab team.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Review your draft.' }).waitFor();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  assert.match(await page.getByRole('status').innerText(), /has not been sent to the lab/);
  await page.reload();
  await page.getByRole('button', { name: 'Restore saved draft' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  assert.equal(await page.getByLabel('Request title').inputValue(), 'Sample prototype fixture');
  await page.getByRole('button', { name: 'Delete saved draft' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Restore saved draft' }).click();
  assert.match(await page.getByRole('status').innerText(), /No saved draft was found/);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Draft preview must fit on mobile');
  await page.screenshot({ path: 'artifacts/acceptance/request-preview-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  const offPort = await availablePort();
  const offBase = `http://127.0.0.1:${offPort}`;
  let offOutput = '';
  previewOffServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(offPort)], { env: { ...env, ENABLE_DESIGN_PREVIEW: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
  previewOffServer.stdout.on('data', chunk => { offOutput = (offOutput + chunk).slice(-5000); });
  previewOffServer.stderr.on('data', chunk => { offOutput = (offOutput + chunk).slice(-5000); });
  let offReady = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (previewOffServer.exitCode !== null) throw new Error(`Preview-off server exited: ${offOutput}`);
    if (offOutput.includes('Ready in')) {
      try { if ((await fetch(offBase)).ok && previewOffServer.exitCode === null) { offReady = true; break; } } catch { /* Server starting. */ }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(offReady, 'Preview-off production instance must become ready');
  assert.equal((await fetch(offBase + '/design/request')).status, 404, 'Design preview must be unavailable when disabled');
  console.log('PASS: production public journey, 5 responsive widths, assets, keyboard skip navigation, mobile menu, missing-config sign-in, protected-route denial, sample browser draft save/restore/delete, 404, security headers and reduced motion.');
  console.log('UNVERIFIED: live account success/recovery/OAuth, draft under a real member session, scoped permissions and operational backend workflows.');
} catch (error) {
  const activePage = browser?.contexts()[0]?.pages()[0];
  if (activePage) {
    await mkdir('artifacts/acceptance', { recursive: true });
    await activePage.screenshot({ path: 'artifacts/acceptance/failure.png', fullPage: true }).catch(() => {});
    console.error('Public/sample image diagnostics:', await activePage.locator('img').evaluateAll(images => images.map(image => { const rect = image.getBoundingClientRect(); return { src: image.getAttribute('src'), complete: image.complete, width: image.naturalWidth, height: image.naturalHeight, display: getComputedStyle(image).display, visibility: getComputedStyle(image).visibility, loading: image.loading, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, scrollY: window.scrollY }; })));
    for (const asset of ['/brand/mec.png', '/_next/image?url=%2Fbrand%2Fmec.png&w=256&q=75']) {
      try { const response = await fetch(base + asset, { signal: AbortSignal.timeout(10000) }); console.error('Asset response:', asset, response.status, response.headers.get('content-type')); }
      catch { console.error('Asset request did not complete within diagnostic timeout:', asset); }
    }
  }
  throw error;
} finally {
  if (browser) await browser.close();
  for (const child of [server, previewOffServer]) {
    if (!child || child.exitCode !== null) continue;
    const exit = once(child, 'exit');
    child.kill();
    await Promise.race([exit, new Promise(resolve => setTimeout(resolve, 3000))]);
  }
}
