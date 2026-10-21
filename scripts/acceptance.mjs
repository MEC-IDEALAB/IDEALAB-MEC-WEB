import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
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
async function setTheme(page, theme) {
  await page.waitForFunction(() => {
    const button = document.querySelector('.theme-toggle');
    const current = document.documentElement.dataset.theme;
    const dark = current === 'dark' || (current !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    return button?.getAttribute('aria-pressed') === String(dark);
  });
  const dark = await page.locator('.theme-toggle').getAttribute('aria-pressed') === 'true';
  if (dark !== (theme === 'dark')) {
    await page.locator('.theme-toggle').click();
    await page.waitForFunction(() => document.getAnimations().filter(animation => 'transitionProperty' in animation).every(animation => animation.playState !== 'running'), null, { timeout: 2500 });
  }
}
async function elementContrast(page, selector) {
  return page.locator(selector).evaluate(element => {
    const luminance = color => {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number);
      const rgb = color.startsWith('color(srgb ') ? channels.map(channel => channel * 255) : channels;
      return rgb.map(channel => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    };
    const [foreground, background] = [getComputedStyle(element).color, getComputedStyle(element).backgroundColor].map(luminance).sort((a, b) => b - a);
    return (foreground + .05) / (background + .05);
  });
}
async function contrastAgainst(page, textSelector, backgroundSelector) {
  return page.locator(textSelector).evaluate((element, selector) => {
    const luminance = color => {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number);
      const rgb = color.startsWith('color(srgb ') ? channels.map(channel => channel * 255) : channels;
      return rgb.map(channel => {
      const value = channel / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    };
    const foreground = luminance(getComputedStyle(element).color);
    const background = luminance(getComputedStyle(document.querySelector(selector)).backgroundColor);
    return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
  }, backgroundSelector);
}
async function loadPageImages(page) {
  for (const image of await page.locator('img:not(.ticker-track img)').all()) await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
}
async function storageSnapshot(page) {
  return page.evaluate(() => {
    const entries = (storage) => Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter(key => key !== null)
      .sort()
      .map(key => [key, storage.getItem(key)]);
    return JSON.stringify({ local: entries(localStorage), session: entries(sessionStorage) });
  });
}
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', ENABLE_MEMBER_PLATFORM: 'false', ENABLE_DESIGN_PREVIEW: 'true' };
const studentPreviewCss = await readFile(new URL('../src/app/student-preview.css', import.meta.url), 'utf8');
assert.match(studentPreviewCss, /\.student-preview-app\{padding-bottom:calc\(76px \+ env\(safe-area-inset-bottom\)\)\}/, 'Student shell reserves the fixed mobile bar plus the bottom device safe area');
assert.match(studentPreviewCss, /padding-inline-start:max\(12px,env\(safe-area-inset-left\)\);padding-inline-end:max\(12px,env\(safe-area-inset-right\)\)/, 'Mobile navigation respects asymmetric device safe-area insets');
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-5000); });
server.stderr.on('data', chunk => { serverOutput = (serverOutput + chunk).slice(-5000); });
let browser;
let previewOffServer;
let recoveryConfigServer;
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
  const policy = home.headers.get('content-security-policy');
  assert.match(policy, /frame-ancestors 'none'/);
  const nonce = policy.match(/(?:^|;)\s*script-src[^;]*'nonce-([^']+)'/)?.[1];
  assert(nonce, 'Every rendered HTML response must carry a nonce-based script policy');
  assert.match(policy, /object-src 'none'/);
  assert.doesNotMatch(policy.match(/script-src[^;]+/)?.[0] ?? '', /unsafe-inline|unsafe-eval/);
  const html = await home.text();
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(([, attributes]) => !/\bsrc=/.test(attributes));
  assert(inlineScripts.length > 0, 'Rendered page should include framework and application scripts');
  assert(inlineScripts.every(([, attributes]) => attributes.match(/\bnonce=["']([^"']+)["']/)?.[1] === nonce), 'Inline scripts must receive the response nonce');
  const repeatedHome = await fetch(base);
  const repeatedNonce = repeatedHome.headers.get('content-security-policy')?.match(/(?:^|;)\s*script-src[^;]*'nonce-([^']+)'/)?.[1];
  assert(repeatedNonce && repeatedNonce !== nonce, 'Each page response must use a fresh nonce');
  for (const path of ['/app', '/app/profile', '/app/requests', '/app/requests/new', '/app/workspace']) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 307, `${path} must not be accessible without auth`);
    assert.match(response.headers.get('location'), /\/sign-in\?notice=configuration$/);
    assert.match(response.headers.get('cache-control'), /private.*no-store/);
    assert.match(response.headers.get('content-security-policy'), /script-src[^;]*'nonce-/);
  }
  assert.equal((await fetch(base + '/unknown-page')).status, 404);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  const cspErrors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /content security policy|refused to/i.test(message.text())) cspErrors.push(message.text()); });
  await mkdir('artifacts/acceptance', { recursive: true });
  const loaderContext = await browser.newContext();
  const loaderPage = await loaderContext.newPage();
  const loaderConsoleErrors = [];
  loaderPage.on('console', message => { if (message.type() === 'error') loaderConsoleErrors.push(message.text()); });
  let releaseScripts;
  const scriptsReady = new Promise(resolve => { releaseScripts = resolve; });
  await loaderPage.route('**/_next/static/**/*.js', async route => { await scriptsReady; await route.continue(); });
  const loaderStartedAt = Date.now();
  await loaderPage.goto(base, { waitUntil: 'commit' });
  await loaderPage.locator('.boot-loader').waitFor({ state: 'visible' });
  await loaderPage.waitForFunction(() => document.getElementById('site-content')?.inert === true);
  await loaderPage.keyboard.press('Tab');
  assert.equal(await loaderPage.evaluate(() => Boolean(document.activeElement?.closest('#site-content'))), false, 'Covered page controls cannot receive keyboard focus before hydration');
  assert.equal(await loaderPage.locator('.boot-loader').evaluate(element => getComputedStyle(element).pointerEvents), 'auto', 'Boot screen blocks pointer input while it covers the page');
  const loop = loaderPage.locator('.loader-loop').first();
  const firstPosition = await loop.evaluate(element => element.getBoundingClientRect().x);
  await loaderPage.waitForTimeout(220);
  const nextPosition = await loop.evaluate(element => element.getBoundingClientRect().x);
  assert.notEqual(nextPosition, firstPosition, 'Brand ribbons move while the first visit is loading');
  await loaderPage.screenshot({ path: 'artifacts/acceptance/wordmark-loading.png' });
  const loaderExitState = loaderPage.evaluate(() => new Promise(resolve => {
    const root = document.documentElement;
    const content = document.getElementById('site-content');
    const capture = () => ({ inert: content?.inert === true, opacity: getComputedStyle(document.querySelector('.boot-loader')).opacity });
    if (root.dataset.boot === 'leaving') { resolve(capture()); return; }
    const observer = new MutationObserver(() => {
      if (root.dataset.boot !== 'leaving') return;
      observer.disconnect();
      resolve(capture());
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-boot'] });
  }));
  releaseScripts();
  const exitState = await loaderExitState;
  assert.equal(exitState.inert, true, 'Page content stays inert at the instant the loader begins its exit');
  assert(Date.now() - loaderStartedAt >= 500, 'The short brand reveal completes before a fast load exits');
  assert.match(await loaderPage.locator('.boot-loader').evaluate(element => getComputedStyle(element).transitionDuration), /^0\.19s(?:,|$)/, 'Boot screen has a measured fade-out');
  await loaderPage.locator('.boot-loader').waitFor({ state: 'hidden' });
  assert.equal(await loaderPage.locator('#site-content').evaluate(element => element.inert), false, 'Page content becomes interactive after the loader exits');
  await loaderPage.keyboard.press('Tab');
  assert(await loaderPage.getByRole('link', { name: 'Skip to content' }).evaluate(element => element === document.activeElement), 'Keyboard navigation resumes at the skip link after the loader exits');
  await loaderPage.getByRole('heading', { level: 1 }).waitFor();
  await loaderPage.waitForTimeout(100);
  assert.deepEqual(loaderConsoleErrors, [], 'The early inert attribute must not cause hydration warnings or browser errors');
  await loaderPage.reload();
  assert.equal(await loaderPage.locator('html').getAttribute('data-boot'), null, 'Loader does not repeat on reload in the same visit');
  await loaderPage.goto(base + '/sign-in');
  assert.equal(await loaderPage.locator('html').getAttribute('data-boot'), null, 'Loader does not repeat between pages');
  await loaderContext.close();

  const reducedLoaderContext = await browser.newContext({ reducedMotion: 'reduce' });
  const reducedLoaderPage = await reducedLoaderContext.newPage();
  await reducedLoaderPage.setViewportSize({ width: 320, height: 568 });
  await reducedLoaderPage.addInitScript(() => localStorage.setItem('idealab-mec:theme', 'dark'));
  let releaseReducedScripts;
  const reducedScriptsReady = new Promise(resolve => { releaseReducedScripts = resolve; });
  await reducedLoaderPage.route('**/_next/static/**/*.js', async route => { await reducedScriptsReady; await route.continue(); });
  await reducedLoaderPage.goto(base, { waitUntil: 'commit' });
  await reducedLoaderPage.locator('.boot-loader').waitFor({ state: 'visible' });
  assert.equal(await reducedLoaderPage.locator('.loader-loop').first().evaluate(element => getComputedStyle(element).animationName), 'none', 'Brand loading respects reduced motion');
  assert.equal(await reducedLoaderPage.locator('.boot-loader').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(0, 0, 0)', 'Dark loading canvas stays jet black');
  assert.equal(await reducedLoaderPage.locator('.loader-core').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'Dark loading plate uses the neutral black surface');
  assert(await reducedLoaderPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Loading canvas has no horizontal overflow at 320px');
  const loaderCard = await reducedLoaderPage.locator('.loader-core').boundingBox();
  assert(loaderCard && loaderCard.x >= 0 && loaderCard.x + loaderCard.width <= 320, 'Loading plate fits a 320px viewport');
  await reducedLoaderPage.screenshot({ path: 'artifacts/acceptance/wordmark-loading-dark-mobile.png' });
  const reducedReleaseAt = Date.now();
  releaseReducedScripts();
  await reducedLoaderPage.locator('.boot-loader').waitFor({ state: 'hidden' });
  assert(Date.now() - reducedReleaseAt < 1000, 'Reduced-motion users do not wait through the brand reveal');
  await reducedLoaderPage.reload();
  assert.equal(await reducedLoaderPage.locator('html').getAttribute('data-boot'), null, 'Reduced-motion loader also stays first-visit only');
  await reducedLoaderContext.close();

  const slowLoaderContext = await browser.newContext();
  const slowLoaderPage = await slowLoaderContext.newPage();
  let releaseSlowScripts;
  const slowScriptsReady = new Promise(resolve => { releaseSlowScripts = resolve; });
  await slowLoaderPage.route('**/_next/static/**/*.js', async route => { await slowScriptsReady; await route.continue(); });
  await slowLoaderPage.goto(base, { waitUntil: 'commit' });
  await slowLoaderPage.locator('.boot-loader').waitFor({ state: 'visible' });
  await slowLoaderPage.waitForTimeout(760);
  const slowReleaseAt = Date.now();
  releaseSlowScripts();
  await slowLoaderPage.waitForFunction(() => document.documentElement.dataset.boot === 'leaving');
  assert(Date.now() - slowReleaseAt < 900, 'A slow first load exits when ready without an added minimum delay');
  await slowLoaderPage.locator('.boot-loader').waitFor({ state: 'hidden' });
  await slowLoaderContext.close();

  const watchdogContext = await browser.newContext();
  const watchdogPage = await watchdogContext.newPage();
  let releaseWatchdogScripts;
  const watchdogScriptsReady = new Promise(resolve => { releaseWatchdogScripts = resolve; });
  await watchdogPage.route('**/_next/static/**/*.js', async route => { await watchdogScriptsReady; await route.continue(); });
  await watchdogPage.goto(base, { waitUntil: 'commit' });
  await watchdogPage.locator('.boot-loader').waitFor({ state: 'visible' });
  await watchdogPage.waitForFunction(() => document.getElementById('site-content')?.inert === true);
  await watchdogPage.waitForFunction(() => !document.documentElement.hasAttribute('data-boot'), { timeout: 7000 });
  assert.equal(await watchdogPage.locator('#site-content').evaluate(element => element.inert), false, 'The no-hydration watchdog always releases page inertness');
  await watchdogPage.keyboard.press('Tab');
  assert(await watchdogPage.getByRole('link', { name: 'Skip to content' }).evaluate(element => element === document.activeElement), 'Keyboard navigation resumes after the no-hydration watchdog');
  assert(await watchdogPage.locator('.ticker-motion-control').isVisible(), 'A native motion control is available when hydration never completes');
  await watchdogPage.locator('.ticker-motion-control').click();
  assert(await watchdogPage.locator('.ticker-motion-checkbox').isChecked(), 'The motion control pauses without hydrated JavaScript');
  assert.equal(await watchdogPage.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
  releaseWatchdogScripts();
  await watchdogContext.close();

  // Repeat visits skip the first-visit boot screen, so the ticker layout must
  // already be in its enhanced state before hydration begins.
  const revisitContext = await browser.newContext({ viewport: { width: 320, height: 667 } });
  const revisitPage = await revisitContext.newPage();
  await revisitPage.addInitScript(() => sessionStorage.setItem('idealab-mec:visited', '1'));
  let releaseRevisitScripts;
  const revisitScriptsReady = new Promise(resolve => { releaseRevisitScripts = resolve; });
  await revisitPage.route('**/_next/static/**/*.js', async route => { await revisitScriptsReady; await route.continue(); });
  await revisitPage.goto(base, { waitUntil: 'commit' });
  await revisitPage.getByRole('region', { name: 'IDEA Lab highlights' }).waitFor();
  await revisitPage.evaluate(() => document.fonts.ready);
  assert.equal(await revisitPage.locator('html').getAttribute('data-ticker-motion'), 'ready', 'Repeat visits prime ticker motion before hydration');
  assert(await revisitPage.locator('.ticker-motion-control').isVisible(), 'The native pause control is operable before hydration');
  await revisitPage.locator('.ticker-motion-control').click();
  assert(await revisitPage.locator('.ticker-motion-checkbox').isChecked(), 'The native control pauses both tickers before hydration');
  assert.equal(await revisitPage.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
  await revisitPage.keyboard.press('Space');
  assert.equal(await revisitPage.locator('.ticker-motion-checkbox').isChecked(), false, 'The native control resumes both tickers while focus and hover remain');
  assert.equal(await revisitPage.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'running');
  const tickerGeometry = () => revisitPage.evaluate(() => [
    '.maker-ticker-region', '.workshop-ticker-region', '.hero',
  ].map(selector => {
    const { y, height } = document.querySelector(selector).getBoundingClientRect();
    return [Math.round(y + window.scrollY), Math.round(height)];
  }));
  const beforeTickerHydration = await tickerGeometry();
  releaseRevisitScripts();
  await revisitPage.waitForTimeout(300);
  await revisitPage.evaluate(() => document.fonts.ready);
  await revisitPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.deepEqual(await tickerGeometry(), beforeTickerHydration, 'Ticker hydration does not change page geometry on repeat visits');
  await revisitPage.locator('.mobile-nav summary').click();
  await revisitPage.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'The lab', exact: true }).click();
  await revisitPage.waitForURL(`${base}/lab`);
  assert.equal(await revisitPage.locator('html').getAttribute('data-ticker-motion'), 'ready', 'Client navigation preserves the globally primed ticker layout');
  await revisitPage.locator('.site-header .brand').click();
  await revisitPage.waitForURL(`${base}/`);
  await revisitPage.waitForTimeout(300);
  await revisitPage.evaluate(() => document.fonts.ready);
  assert.deepEqual(await tickerGeometry(), beforeTickerHydration, 'Returning to the homepage does not restore the taller static ticker rows');
  await revisitContext.close();

  const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScriptContext.newPage();
  await noScriptPage.goto(base);
  assert(await noScriptPage.getByRole('heading', { name: 'Big ideas. Real things. Your move.' }).isVisible(), 'Homepage remains visible without JavaScript');
  assert(await noScriptPage.getByRole('link', { name: 'Discover projects', exact: true }).isVisible(), 'Server-rendered card links remain usable without animation enhancement');
  assert(await noScriptPage.getByRole('region', { name: 'IDEA Lab highlights' }).isVisible(), 'Top lab highlights remain available without JavaScript');
  assert(await noScriptPage.getByRole('region', { name: 'IDEA Lab activities and facilities' }).isVisible(), 'Lower activity highlights remain available without JavaScript');
  assert.equal(await noScriptPage.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationName), 'none', 'Ticker text stays still without JavaScript');
  const topStaticItems = noScriptPage.locator('.maker-ticker-content .ticker-run').first().locator('.ticker-item');
  const lowerStaticItems = noScriptPage.locator('.ticker-track-lower .ticker-run').first().locator('.ticker-item');
  assert.deepEqual(await topStaticItems.allTextContents(), ['AICTE × COGNICOR × MEC', 'Established in 2022', 'Engage · Explore · Experience · Express · Excel', 'From idea to prototype', 'Workshops · Training · Multidisciplinary STEM'], 'No-JavaScript visitors can read every top ticker highlight');
  assert.deepEqual(await lowerStaticItems.allTextContents(), ['Digital fabrication', 'Electronics & code', 'Learn by making', 'Epilog · Snapmaker · Ultimaker', 'Ideas into prototypes'], 'No-JavaScript visitors can read every lower ticker highlight');
  assert.equal(await noScriptPage.locator('.ticker-run').nth(1).evaluate(element => getComputedStyle(element).display), 'none', 'Static tickers hide the duplicated visual copy');
  assert.equal(await noScriptPage.locator('.ticker-motion-toggle').isVisible(), false, 'Static no-JavaScript content does not expose a motion control');
  await noScriptPage.setViewportSize({ width: 320, height: 667 });
  assert(await noScriptPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Static no-JavaScript ticker rows have no horizontal overflow at 320px');
  for (const item of [...await topStaticItems.all(), ...await lowerStaticItems.all()]) {
    const bounds = await item.boundingBox();
    assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 320, 'Every static no-JavaScript ticker label stays within the 320px viewport');
  }
  await noScriptPage.screenshot({ path: 'artifacts/acceptance/home-tickers-nojs-320.png' });
  await noScriptPage.setViewportSize({ width: 375, height: 667 });
  await noScriptPage.locator('.mobile-nav summary').click();
  await noScriptPage.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'The lab', exact: true }).click();
  await noScriptPage.waitForURL(`${base}/lab`);
  await noScriptPage.locator('.mobile-nav summary').click();
  assert.equal(await noScriptPage.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'The lab', exact: true }).getAttribute('aria-current'), 'page', 'Server-rendered native navigation works and indicates the current page without JavaScript');
  await noScriptContext.close();
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(base);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForFunction(() => document.documentElement.dataset.tickerMotion === 'ready');
    assert(await page.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'The global theme stylesheet must be applied');
    assert.match(await page.title(), /IDEALAB MEC/);
    assert.equal(await page.locator('main').count(), 1);
    assert.equal(await page.getByText('THE MAKER SPIRIT, AT MEC.', { exact: true }).count(), 0);
    assert.equal(await page.locator('.hero-footnote').count(), 0);
    assert.equal(await page.locator('.facility-card').count(), 3, 'Homepage shows three curated facility highlights');
    assert.equal(await page.locator('.activity-row').count(), 3, 'Homepage introduces three editorial activity themes');
    for (const row of await page.locator('.activity-row').all()) {
      assert(await row.getByRole('heading', { level: 3 }).isVisible(), 'Each activity row has a visible title');
      assert((await row.locator('.activity-row-description').textContent())?.trim(), 'Each activity row describes its learning theme');
      assert(await row.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Activity row fits within the ${width}px layout`);
    }
    const labTicker = page.getByRole('region', { name: 'IDEA Lab highlights' });
    const workshopTicker = page.getByRole('region', { name: 'IDEA Lab activities and facilities' });
    assert.equal(await labTicker.count(), 1, 'Homepage has one labelled institutional highlights ticker');
    assert.equal(await workshopTicker.count(), 1, 'Homepage has one labelled activities ticker');
    assert.equal(await page.locator('.site-header .brand-wordmark').count(), 1, 'The site header retains the official IDEALAB MEC wordmark');
    assert.equal(await labTicker.locator('.ticker-brand-logo img').count(), 0, 'The top ticker does not repeat the header logo');
    assert.equal(await labTicker.locator('.ticker-item').first().textContent(), 'AICTE × COGNICOR × MEC');
    assert.equal(await labTicker.locator('.ticker-separator').first().textContent(), '\\\\', 'Top ticker facts are divided by the requested double-slash marker');
    assert.equal(await workshopTicker.locator('.ticker-item').first().textContent(), 'Digital fabrication');
    assert.equal(await labTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationName), 'idealab-ticker-marquee', 'Top highlights move on the marquee track');
    assert.notEqual(await labTicker.locator('.maker-ticker-band').evaluate(element => getComputedStyle(element).transform), 'none', 'Top highlights band is tilted');
    assert.equal(await labTicker.locator('.maker-ticker-band').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(0, 0, 0)', 'Top highlights band uses black');
    assert.equal(await labTicker.locator('.maker-ticker-band').evaluate(element => getComputedStyle(element).color), 'rgb(255, 224, 41)', 'Top ticker text uses yellow');
    const publicHeaderBox = await page.locator('.site-header').boundingBox();
    const topTickerBox = await labTicker.boundingBox();
    assert(publicHeaderBox && topTickerBox && topTickerBox.y >= publicHeaderBox.y + publicHeaderBox.height - 1, 'Top carousel appears after the public navigation/header');
    assert.equal(await workshopTicker.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(234, 240, 235)', 'Lower ticker uses the established muted section surface');
    assert.equal(await workshopTicker.getByRole('checkbox', { name: 'Pause moving highlights' }).count(), 1, 'Ticker motion has a native accessible pause control');
    assert(await page.locator('.playful-site').evaluate(element => getComputedStyle(element).backgroundImage.includes('linear-gradient') && !getComputedStyle(element).backgroundImage.includes('radial-gradient')), 'Notebook cross grid replaces dotted page background');
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await loadPageImages(page);
    assert(await page.locator('img').evaluateAll(images => images.length >= 2 && images.every(image => image.complete && image.naturalWidth > 0)), 'Every displayed logo/image must load');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.hero-copy').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow at ${width}px`);
    await page.screenshot({ path: `artifacts/acceptance/home-${width}.png`, fullPage: true });
    if (width === 1440) await page.screenshot({ path: 'artifacts/acceptance/home-hero-1440.png' });
    if (width === 320) {
      const motionControl = page.locator('.ticker-motion-control');
      await motionControl.scrollIntoViewIfNeeded();
      await motionControl.click();
      assert(await page.locator('.ticker-motion-checkbox').isChecked(), 'Pause control stops both homepage ticker bands');
      assert.equal(await labTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
      assert.equal(await workshopTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
      await page.getByRole('checkbox', { name: 'Resume moving highlights' }).focus();
      await page.keyboard.press('Space');
      assert.equal(await page.locator('.ticker-motion-checkbox').isChecked(), false, 'Resume control restarts both homepage ticker bands while still focused and hovered');
      assert.equal(await labTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'running');
      assert.equal(await workshopTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'running');
    }
  }
  await page.setViewportSize({ width: 320, height: 667 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  assert.equal(await page.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationName), 'none', 'Reduced-motion preference keeps homepage ticker text still');
  assert.deepEqual(await page.locator('.maker-ticker-content .ticker-run').first().locator('.ticker-item').allTextContents(), ['AICTE × COGNICOR × MEC', 'Established in 2022', 'Engage · Explore · Experience · Express · Excel', 'From idea to prototype', 'Workshops · Training · Multidisciplinary STEM'], 'Reduced-motion visitors can read every top ticker highlight');
  assert.deepEqual(await page.locator('.ticker-track-lower .ticker-run').first().locator('.ticker-item').allTextContents(), ['Digital fabrication', 'Electronics & code', 'Learn by making', 'Epilog · Snapmaker · Ultimaker', 'Ideas into prototypes'], 'Reduced-motion visitors can read every lower ticker highlight');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Reduced-motion ticker layout has no horizontal overflow');
  await page.screenshot({ path: 'artifacts/acceptance/home-tickers-reduced-motion-320.png' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(base);
  await setTheme(page, 'dark');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  const secondTab = await page.context().newPage();
  await secondTab.goto(base);
  await setTheme(secondTab, 'light');
  await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light');
  await secondTab.close();
  await setTheme(page, 'dark');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark', 'Explicit dark theme survives reload');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(base);
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await loadPageImages(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.hero-copy').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(0, 0, 0)', 'Dark canvas is jet black');
    assert.equal(await page.locator('.principles-strip').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'Dark section strip uses neutral black');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No dark-mode horizontal overflow at ${width}px`);
    await page.screenshot({ path: `artifacts/acceptance/home-dark-${width}.png`, fullPage: true });
    if (width === 1440) await page.screenshot({ path: 'artifacts/acceptance/home-dark-hero-1440.png' });
  }
  await page.evaluate(() => localStorage.removeItem('idealab-mec:theme'));
  await page.reload();
  await page.emulateMedia({ colorScheme: 'light' });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark', 'System theme follows OS changes');
  await setTheme(page, 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    const ratios = await page.evaluate(() => {
      function rgb(value) { return value.match(/[\d.]+/g).slice(0, 3).map(Number); }
      function luminance(color) { return rgb(color).map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0); }
      function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); }
      const canvas = getComputedStyle(document.body);
      const primary = getComputedStyle(document.querySelector('.hero-actions .button-primary'));
      const plate = getComputedStyle(document.querySelector('.about-mark'));
      return { primary: contrast(primary.color, primary.backgroundColor), plate: contrast(plate.color, plate.backgroundColor), secondary: contrast(getComputedStyle(document.querySelector('.hero-description')).color, canvas.backgroundColor) };
    });
    assert(ratios.primary >= 4.5, `${theme} primary action contrast`);
    assert(ratios.plate >= 4.5, `${theme} accent plate contrast`);
    assert(ratios.secondary >= 4.5, `${theme} secondary copy contrast`);
  }
  await setTheme(page, 'light');
  await page.setViewportSize({ width: 375, height: 900 });
  const blockedContext = await browser.newContext();
  await blockedContext.addInitScript(() => { Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new DOMException('Browser storage disabled', 'SecurityError'); } }); });
  const blockedPage = await blockedContext.newPage();
  await blockedPage.goto(base);
  await setTheme(blockedPage, 'dark');
  assert.equal(await blockedPage.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await blockedPage.locator('.theme-toggle').getAttribute('aria-pressed'), 'true', 'Applied choice remains accurately selected if saving is blocked');
  await blockedContext.close();
  await page.goto(base);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  assert(await skip.evaluate(element => element === document.activeElement), 'Keyboard starts at skip link');
  const skipBox = await skip.boundingBox();
  assert(skipBox && skipBox.width > 1 && skipBox.height > 1 && skipBox.y >= 0, 'Focused skip link must be visible');
  await page.keyboard.press('Enter');
  await page.waitForURL(`${base}/#main-content`);
  assert.equal(new URL(page.url()).hash, '#main-content');
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => Boolean(document.activeElement?.closest('main'))), 'Skip link must move keyboard navigation into main content');
  await page.goto(base);
  await page.setViewportSize({ width: 375, height: 667 });
  const menu = page.locator('.mobile-nav summary');
  const disclosure = page.locator('.mobile-nav');
  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  await menu.click();
  assert(await disclosure.evaluate(node => node.open), 'Mobile menu opens');
  await page.keyboard.press('Tab');
  assert(await mobileNavigation.getByRole('link', { name: 'Explore', exact: true }).evaluate(node => node === document.activeElement), 'Tab enters the open disclosure in document order');
  await page.keyboard.press('Escape');
  assert(!await disclosure.evaluate(node => node.open), 'Escape closes mobile navigation');
  assert(await menu.evaluate(node => node === document.activeElement), 'Escape restores focus to the visible disclosure control');

  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  assert(!await disclosure.evaluate(node => node.open), 'Moving focus out of navigation closes it');
  assert(await page.locator('.header-signin').evaluate(node => node === document.activeElement), 'Focus departure preserves the ordinary Tab destination');

  await menu.click();
  await page.keyboard.press('Tab');
  await page.locator('.theme-toggle').click();
  assert(!await disclosure.evaluate(node => node.open), 'An outside pointer dismisses mobile navigation');
  assert(await page.locator('.theme-toggle').evaluate(node => node === document.activeElement), 'Outside pointer keeps focus on its chosen control');
  await menu.click();
  await page.keyboard.press('Tab');
  await page.getByRole('heading', { level: 1 }).click({ position: { x: 5, y: 5 } });
  assert(!await disclosure.evaluate(node => node.open), 'A pointer on non-focusable page content also dismisses navigation');
  assert(await page.evaluate(() => !document.activeElement?.closest('.mobile-nav nav')), 'Outside content dismissal does not retain focus on a hidden menu link');
  await page.keyboard.press('Tab');
  assert(await page.locator(':focus').isVisible(), 'Keyboard navigation continues on a visible control after outside content dismissal');

  await menu.click();
  await mobileNavigation.getByRole('link', { name: 'The lab', exact: true }).click();
  await page.waitForURL(`${base}/lab`);
  assert(!await disclosure.evaluate(node => node.open), 'Selecting a route closes the disclosure');
  assert.equal(await disclosure.locator('a[href="/lab"]').getAttribute('aria-current'), 'page');
  await menu.click();
  await mobileNavigation.getByRole('link', { name: 'The lab', exact: true }).click();
  assert(!await disclosure.evaluate(node => node.open), 'Selecting the current route also closes the disclosure');
  assert(await menu.evaluate(node => node === document.activeElement), 'Current-route selection does not leave focus in hidden navigation');

  await menu.click();
  await page.keyboard.press('Tab');
  await page.setViewportSize({ width: 1024, height: 768 });
  const desktopNavigation = page.getByRole('navigation', { name: 'Main navigation' });
  await desktopNavigation.waitFor();
  await page.waitForFunction(() => !document.querySelector('.mobile-nav').open);
  assert(await desktopNavigation.getByRole('link', { name: 'The lab', exact: true }).evaluate(node => node === document.activeElement), 'Widening the viewport moves hidden mobile focus to the current desktop link');
  assert.equal(await desktopNavigation.locator('a[aria-current="page"]').count(), 1, 'Exactly one desktop link identifies the current page');
  await page.setViewportSize({ width: 375, height: 667 });
  assert(!await disclosure.evaluate(node => node.open), 'Returning to mobile keeps navigation closed');
  await menu.click();
  await page.keyboard.press('Escape');
  assert(await menu.evaluate(node => node === document.activeElement), 'Closed-summary resize starts from real keyboard focus');
  await page.setViewportSize({ width: 801, height: 768 });
  await page.waitForFunction(() => document.activeElement?.closest('.desktop-nav'));
  assert(await desktopNavigation.getByRole('link', { name: 'The lab', exact: true }).evaluate(node => node === document.activeElement), 'Widening with a closed mobile control focused also restores visible desktop focus');
  await page.setViewportSize({ width: 800, height: 667 });
  assert(await menu.isVisible(), 'The mobile disclosure remains available at its exact CSS breakpoint');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: 'artifacts/acceptance/navigation-mobile-closed.png' });
  await menu.click();
  await page.screenshot({ path: 'artifacts/acceptance/navigation-mobile-open.png' });
  await page.keyboard.press('Escape');
  await page.goto(base + '/sign-in');
  await page.getByRole('heading', { name: 'Make yourself at home.' }).waitFor();
  assert(await page.getByRole('button', { name: /Sign in/ }).isDisabled(), 'Missing config must disable sign-in');
  assert(await page.getByLabel('Email address').isDisabled());
  assert(await page.getByText('Sign-in is unavailable in this release.').isVisible());
  assert(await page.getByRole('link', { name: 'Forgot password?' }).isVisible(), 'Sign-in offers a direct recovery path');
  await page.screenshot({ path: 'artifacts/acceptance/sign-in-mobile.png', fullPage: true });
  for (const route of ['sign-in', 'sign-up']) {
    for (const theme of ['light', 'dark']) {
      for (const width of [320, 768, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto(`${base}/${route}`);
        await setTheme(page, theme);
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${route} fits ${width}px in ${theme}`);
        await page.screenshot({ path: `artifacts/acceptance/${route}-${theme}-${width}.png`, fullPage: true });
      }
    }
  }
  for (const route of ['forgot-password', 'reset-password']) {
    const response = await fetch(`${base}/${route}`);
    assert.equal(response.status, 200, `${route} remains available while member access is gated`);
    const html = await response.text();
    assert.match(html, /noindex, nofollow/, `${route} stays out of search results`);
    assert.match(html, /paused while the shared account platform is being secured/i, `${route} explains the disabled shared-account gate`);
  }
  for (const route of ['sign-in', 'sign-up']) {
    for (const theme of ['light', 'dark']) {
      for (const viewport of [{width:1366,height:768},{width:1440,height:900},{width:390,height:844},{width:375,height:667},{width:320,height:568}]) {
        await page.setViewportSize(viewport);
        await page.goto(base + '/' + route);
        await setTheme(page, theme);
        assert(await page.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'), route + ' must load the global theme stylesheet');
        assert(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1), route + ' fits ' + viewport.width + 'x' + viewport.height + ' in ' + theme);
        assert(await page.getByRole('button', {name:'Continue with Google'}).isDisabled(), 'Unverified Google activation stays disabled');
      }
    }
  }
  for (const route of ['forgot-password', 'reset-password']) {
    for (const theme of ['light', 'dark']) {
      for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 568 });
        await page.goto(`${base}/${route}`);
        await setTheme(page, theme);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} fits ${width}px in ${theme} mode`);
        assert(await page.locator('.theme-toggle').isVisible(), `${route} keeps the direct theme toggle visible`);
        assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
        if (width === 320) await page.screenshot({ path: `artifacts/acceptance/${route}-${theme}-320.png`, fullPage: true });
      }
    }
  }
  await page.goto(base + '/sign-up');
  await page.getByRole('link', { name: 'Sign in here' }).click();
  await page.getByRole('heading', { name: 'Make yourself at home.' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/design/onboarding');
  await page.getByRole('heading', { name: 'Tell us a little about yourself.' }).waitFor();
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex.*nofollow/);
  assert.equal(await page.locator('input[required], select[required]').count(), 6, 'Preview shows the six required onboarding fields');
  assert.equal(await page.locator('input[name], select[name], textarea[name]').count(), 0, 'Preview fields cannot be submitted through native form names');
  assert.deepEqual(await page.locator('#onboarding-year option').allTextContents(), ['Select your current year', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8'], 'Current study year is restricted to the approved Year 1–8 choices');
  assert(await page.getByText(/lateral-entry numbers use LMDL/).isVisible(), 'Both MEC registration prefixes are explained');
  assert(await page.getByLabel('College / institution').evaluate(element => element.readOnly), 'The MEC pilot institution cannot be changed in the preview');
  assert.equal(await page.getByLabel('College / institution').inputValue(), 'Model Engineering College', 'The pilot uses one canonical institution');
  assert(await page.getByText(/students self-declare MEC eligibility and claim one unique registration number/i).isVisible(), 'The preview describes the self-declared admission policy');
  assert(await page.getByText(/does not check claims against college records/).isVisible(), 'The preview states that student claims are not checked against college records');
  assert(await page.getByText(/private by default/i).isVisible(), 'Required profile details are described as private by default');
  await setTheme(page, 'dark');
  const storageBeforePreview = await storageSnapshot(page);
  await page.getByRole('button', { name: 'Check preview fields' }).click();
  await page.locator('.onboarding-error-summary').waitFor();
  assert.equal(await page.locator('.onboarding-error-summary li').count(), 6, 'Invalid submit summarizes five editable profile fields and the MEC declaration');
  await page.waitForFunction(() => document.querySelector('.onboarding-error-summary') === document.activeElement);
  assert(await page.locator('.onboarding-error-summary').evaluate(element => element === document.activeElement), 'Validation moves focus to the error summary');
  await page.getByRole('link', { name: 'MEC registration number' }).click();
  assert(await page.getByRole('textbox', { name: 'MEC registration number', exact: true }).evaluate(element => element === document.activeElement), 'Error-summary field links move focus to the named input');
  await page.getByRole('link', { name: 'MEC student declaration' }).click();
  assert(await page.getByLabel(/I confirm that I am currently a Model Engineering College student/).evaluate(element => element === document.activeElement), 'Error-summary field links move focus to the MEC self-declaration');
  await page.getByLabel(/I confirm that I am currently a Model Engineering College student/).check();
  await page.getByLabel('Full name').fill('Ada Example');
  await page.getByLabel('Phone number').fill('0000000000');
  await page.getByRole('textbox', { name: 'MEC registration number', exact: true }).fill('SAMPLE-001');
  await page.getByLabel('Department').fill('Sample Engineering');
  await page.getByLabel('Current year of study').selectOption('Year 2');
  await page.getByRole('button', { name: 'Check preview fields' }).click();
  assert.equal(await page.locator('.onboarding-error-summary li').count(), 2, 'Malformed phone and registration values receive separate errors');
  assert.equal(await page.getByLabel('Phone number').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.getByRole('textbox', { name: 'MEC registration number', exact: true }).getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('.onboarding-preview-result').count(), 0, 'Invalid formats cannot report a completed preview check');
  await page.getByLabel('Phone number').fill('+919876543210');
  for (const number of ['MDL24CS219', 'lmdl24cs219', 'LMDL1A']) {
    await page.getByRole('textbox', { name: 'MEC registration number', exact: true }).fill(number);
    await page.getByRole('button', { name: 'Check preview fields' }).click();
    await page.locator('.onboarding-preview-result').getByText(/Preview check complete. Nothing was sent or saved./).waitFor();
    assert(await page.locator('.onboarding-preview-result').getByText(/self-declaration was not checked against college records/).isVisible(), 'Format feedback cannot claim independent student verification');
  }
  assert.equal(await storageSnapshot(page), storageBeforePreview, 'Onboarding preview must not persist entered values');
  for (const [width, theme] of [[320, 'light'], [375, 'dark'], [768, 'light'], [1440, 'dark']]) {
    await page.goto(base + '/design/onboarding');
    await page.setViewportSize({ width, height: 900 });
    await setTheme(page, theme);
    await page.getByRole('heading', { name: 'Your details' }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Onboarding preview fits ${width}px in ${theme} mode`);
    await page.screenshot({ path: `artifacts/acceptance/onboarding-preview-${width}-${theme}.png`, fullPage: true, animations: 'disabled' });
  }
  const noJsContext = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  const noJsRequests = [];
  noJsPage.on('request', request => noJsRequests.push(request.url()));
  await noJsPage.goto(base + '/design/onboarding');
  await noJsPage.getByLabel('Full name').fill('NoJs Example');
  await noJsPage.getByLabel('Phone number').fill('+15550108822');
  await noJsPage.getByRole('textbox', { name: 'MEC registration number', exact: true }).fill('MDL24CS219');
  await noJsPage.getByLabel('Department').fill('NoJs Engineering');
  await noJsPage.getByLabel('Current year of study').selectOption('Year 3');
  assert.equal(await noJsPage.getByLabel('College / institution').inputValue(), 'Model Engineering College');
  const noJsUrl = noJsPage.url();
  const noJsRequestCount = noJsRequests.length;
  await noJsPage.getByRole('button', { name: 'Check preview fields' }).click();
  assert.equal(noJsPage.url(), noJsUrl, 'No-JavaScript preview controls must not submit or navigate');
  assert.equal(noJsRequests.length, noJsRequestCount, 'No-JavaScript preview controls must not send any request');
  assert(noJsRequests.every(url => !/NoJs|MDL24CS219|5550108822/.test(url)), 'No-JavaScript preview must not send entered details in a request URL');
  await noJsContext.close();
  const studentScreens = {
    home: 'A home base for your next idea.',
    lab: 'Find your way around the lab.',
    profile: 'Your details, in your control.',
    projects: 'Projects take shape together.',
    events: 'Make room for what is next.',
    requests: 'Turn an idea into a work request.',
    notifications: 'Keep the next step in view.',
    visits: 'Plan a lab visit with clarity.',
    borrowing: 'Keep shared tools moving.',
    settings: 'Make this space work for you.',
  };
  const studentDataRequests = [];
  page.on('request', request => {
    if (/supabase\.co|\/rest\/v1(?:\/|\?|$)|\/api\//i.test(request.url())) studentDataRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto(base + '/design/student?screen=home');
  await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow', 'Student workspace layout stays out of search results');
  assert(await page.getByRole('status').getByText('DESIGN PREVIEW · NO LIVE DATA').isVisible(), 'Student preview states that records are not connected');
  await page.waitForFunction(() => document.querySelector('.student-preview-welcome')?.getAnimations().some(animation => animation.playState === 'running'));
  assert(await page.locator('.student-preview-sidebar').isVisible(), 'Desktop workspace uses a persistent sidebar');
  assert(await page.evaluate(() => { const sidebar = document.querySelector('.student-preview-sidebar').getBoundingClientRect(); const main = document.querySelector('.student-preview-main-column').getBoundingClientRect(); return sidebar.width >= 200 && main.left >= sidebar.right - 1; }), 'Desktop workspace places its main content beside the navigation rail');
  assert.equal(await page.locator('.student-preview-sidebar a[aria-current="page"]').count(), 1, 'Desktop navigation identifies exactly one current destination');
  assert.equal(await page.locator('.student-preview-sidebar-toggle').getAttribute('aria-expanded'), 'true', 'Desktop sidebar starts expanded');
  await page.getByRole('button', { name: 'Collapse workspace sidebar' }).click();
  assert.equal(await page.locator('.student-preview-sidebar-toggle').getAttribute('aria-expanded'), 'false', 'Sidebar toggle exposes its collapsed state');
  assert(await page.locator('.student-preview-app').evaluate(element => element.classList.contains('student-preview-sidebar-collapsed')), 'Collapsed sidebar applies its compact desktop layout');
  await page.waitForFunction(() => Math.abs(document.querySelector('.student-preview-sidebar').getBoundingClientRect().width - 92) < 1);
  assert(await page.locator('.student-preview-side-nav a[aria-label="Projects"]').isVisible(), 'Collapsed navigation keeps icon links available and named');
  assert(await page.evaluate(() => { const sidebar = document.querySelector('.student-preview-sidebar').getBoundingClientRect(); const main = document.querySelector('.student-preview-main-column').getBoundingClientRect(); return sidebar.width >= 84 && sidebar.width <= 100 && main.left >= sidebar.right - 1; }), `Collapsed rail keeps its main content aligned beside it: ${await page.evaluate(() => { const sidebar = document.querySelector('.student-preview-sidebar').getBoundingClientRect(); const main = document.querySelector('.student-preview-main-column').getBoundingClientRect(); return JSON.stringify({ sidebar: sidebar.width, mainLeft: main.left, sidebarRight: sidebar.right }); })}`);
  assert(await page.evaluate(() => { const nav = document.querySelector('.student-preview-side-nav').getBoundingClientRect(); return [...document.querySelectorAll('.student-preview-side-nav>.student-preview-nav-link')].every(link => link.getBoundingClientRect().right <= nav.right + 1); }), 'Collapsed icon rows stay inside the navigation rail');
  await page.screenshot({ path: 'artifacts/acceptance/student-workspace-home-collapsed-desktop.png', fullPage: false, animations: 'disabled' });
  await page.setViewportSize({ width: 761, height: 900 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Collapsed rail keeps the tablet workspace within the viewport');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Expand workspace sidebar' }).click();
  assert.equal(await page.locator('.student-preview-sidebar-toggle').getAttribute('aria-expanded'), 'true', 'Sidebar expands again on activation');
  await page.locator('.student-preview-sidebar-toggle').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('.student-preview-sidebar-toggle').getAttribute('aria-expanded'), 'false', 'Keyboard activation collapses the sidebar');
  await page.waitForFunction(() => Math.abs(document.querySelector('.student-preview-sidebar').getBoundingClientRect().width - 92) < 1);
  await page.keyboard.press('Space');
  assert.equal(await page.locator('.student-preview-sidebar-toggle').getAttribute('aria-expanded'), 'true', 'Keyboard activation expands the sidebar');
  await page.waitForFunction(() => document.querySelector('.student-preview-sidebar').getBoundingClientRect().width >= 250);
  assert(await page.locator('.student-preview-sidebar').getByRole('link', { name: 'Settings' }).isVisible(), 'Settings stays pinned at the bottom of the desktop rail');
  assert(await page.locator('.student-preview-notification-button').isVisible(), 'Notification shortcut remains visible in the top-right controls');
  assert(await page.locator('.student-preview-topbar-actions').evaluate(element => element.querySelector('.student-preview-notification-button').compareDocumentPosition(element.querySelector('.theme-toggle')) & Node.DOCUMENT_POSITION_FOLLOWING), 'Notifications sits beside the theme control in the top bar');
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); document.body.tabIndex = -1; document.body.focus(); });
  await page.keyboard.press('Tab');
  assert(await page.locator('.skip-link').evaluate(element => element === document.activeElement && element.getBoundingClientRect().top >= 0), 'Student preview starts keyboard navigation at the visible site skip link');
  await page.keyboard.press('Enter');
  assert(await page.locator('#main-content').evaluate(element => element === document.activeElement), 'Skip link moves focus to the workspace main landmark');
  const finalStudentCard = page.locator('.student-preview-module').last();
  await finalStudentCard.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.student-preview-module')].at(-1)?.getAnimations().length > 0);
  await finalStudentCard.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))));
  assert(await finalStudentCard.isVisible(), 'Scroll-revealed module cards remain accessible after animation');
  await setTheme(page, 'light');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
  await page.screenshot({ path: 'artifacts/acceptance/student-workspace-home-desktop.png', fullPage: true, animations: 'disabled' });
  await page.locator('.student-preview-notification-button').click();
  await page.getByRole('heading', { name: studentScreens.notifications, exact: true }).waitFor();
  assert.match(page.url(), /screen=notifications$/, 'Top-right notifications shortcut opens the notification destination');
  await page.getByRole('link', { name: 'Projects' }).first().click();
  await page.getByRole('heading', { name: studentScreens.projects, exact: true }).waitFor();
  assert.match(page.url(), /screen=projects$/, 'Home module links navigate to their own review screen');
  for (const [screen, title] of Object.entries(studentScreens)) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/design/student?screen=${screen}`);
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    assert.equal(await page.locator('.student-preview-sidebar a[aria-current="page"]').count(), 1, `${screen} has one current desktop navigation item`);
    assert.equal(await page.locator('form').count(), 0, `${screen} preview exposes no real submission form`);
    assert.equal(await page.locator('.theme-toggle').count(), 1, `${screen} keeps one functional theme control`);
    assert.equal(await page.locator('.student-preview-sidebar-toggle').count(), 1, `${screen} provides a desktop sidebar toggle`);
    assert.equal(await page.locator('.student-preview-notification-button').count(), 1, `${screen} keeps the top-right notification destination available`);
    assert(await page.getByRole('status').getByText('DESIGN PREVIEW · NO LIVE DATA').isVisible(), `${screen} explains that it contains no live data`);
    if (screen === 'projects') assert(await page.getByText('Project names, teams and membership requests are not loaded in this preview.').isVisible());
    if (screen === 'events') assert(await page.getByText(/No event records or registration status are available/).isVisible());
    if (screen === 'requests') assert(await page.getByText(/cannot create, submit, reserve or track a real request/).isVisible());
    if (screen === 'notifications') assert(await page.getByText(/No message, request update or event reminder/).isVisible());
    if (screen === 'settings') {
      assert(await page.getByRole('heading', { name: 'Choose a comfortable view' }).isVisible(), 'Settings preview explains the working theme preference');
      assert(await page.getByRole('heading', { name: 'Your details stay private' }).isVisible(), 'Settings preview links account preferences to the private profile');
      assert(await page.getByRole('link', { name: /Open profile/ }).isVisible(), 'Settings offers a direct profile path');
    }
    if (screen === 'visits') assert(await page.getByText(/No sample history is shown/).isVisible(), 'Visit wireframe avoids fabricated history');
    if (screen === 'projects') assert(await page.getByRole('heading', { name: 'One project, with its next step' }).isVisible(), 'Project detail and creator review are mapped');
    if (screen === 'events') assert(await page.getByRole('heading', { name: 'Know the terms before registering' }).isVisible(), 'Event detail and registration states are mapped');
    if (screen === 'requests') assert(await page.getByRole('heading', { name: 'From preferred time to an agreed time' }).isVisible(), 'Request timing acceptance and history are mapped');
    if (screen === 'visits') assert(await page.getByRole('heading', { name: 'A visit has a clear start and finish' }).isVisible(), 'Visit check-in, check-out and history are mapped');
    if (screen === 'borrowing') {
      assert(await page.getByRole('heading', { name: 'Browse the approved catalog' }).isVisible(), 'Borrowing catalog is mapped');
      assert(await page.getByRole('heading', { name: 'Track each handoff' }).isVisible(), 'Borrowing issue and return verification are mapped');
    }
    if (screen === 'profile') assert(await page.getByRole('heading', { name: 'Profile editing layout' }).isVisible(), 'Profile edit fields are mapped');
    for (const width of [320, 375, 760, 761, 850, 980, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await setTheme(page, [375, 761, 1440].includes(width) ? 'dark' : 'light');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${screen} fits ${width}px without horizontal scrolling`);
      if (width <= 760) {
        assert(await page.locator('.student-preview-mobile-nav').isVisible(), 'Narrow screens keep the primary navigation visible');
        assert.equal(await page.locator('.student-preview-mobile-nav a').count(), 3, 'Mobile bottom navigation mirrors the three app anchors');
        assert(!await page.locator('.student-preview-sidebar').isVisible(), 'Narrow screens replace the desktop rail');
        assert(await page.locator('.student-preview-notification-button').isVisible(), 'Narrow screens retain top-right notifications');
        const isMobileAnchor = ['home', 'lab', 'profile'].includes(screen);
        assert.equal(await page.locator(`.student-preview-mobile-nav a[aria-current="${isMobileAnchor ? 'page' : 'location'}"]`).count(), 1, `${screen} marks its mobile page or grouping location accurately`);
        if (!isMobileAnchor) {
          const expectedLocation = screen === 'settings' ? 'profile' : 'home';
          const parentHref = await page.locator('.student-preview-mobile-nav a[aria-current="location"]').getAttribute('href');
          assert(parentHref?.includes(`screen=${expectedLocation}`), `${screen} points to its mobile parent destination: expected ${expectedLocation}, received ${parentHref} at ${width}px`);
        }
      } else {
        assert(await page.locator('.student-preview-sidebar').isVisible(), 'Wide screens retain the student destination rail');
      }
      if (width > 760 && width <= 980) {
        const detailGrid = page.locator('.student-preview-detail-grid').first();
        if (await detailGrid.count()) assert.equal(await detailGrid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 1, `Detail cards use a readable single column at ${width}px`);
        if (screen === 'visits') {
          const tracks = await page.locator('.student-preview-visit-states').evaluate(element => [...element.children].map(child => child.getBoundingClientRect().width));
          assert(Math.min(...tracks) >= 170, `Visit state cards retain readable width at ${width}px`);
        }
      }
    }
    if (await page.locator('.student-preview-feature').count()) {
      for (const theme of ['light', 'dark']) {
        await setTheme(page, theme);
        const colorState = await page.locator('.student-preview-feature').evaluate(element => ({ theme: document.documentElement.dataset.theme, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor, heading: getComputedStyle(element.querySelector('h2')).color, label: getComputedStyle(element.querySelector('.student-preview-kicker')).color, body: getComputedStyle(element.querySelector('div>p:not(.student-preview-kicker)')).color }));
        assert(await contrastAgainst(page, '.student-preview-feature h2', '.student-preview-feature') >= 4.5, `${screen} feature heading contrast passes in ${theme} mode: ${JSON.stringify(colorState)}`);
        assert(await contrastAgainst(page, '.student-preview-feature>div>p:not(.student-preview-kicker)', '.student-preview-feature') >= 4.5, `${screen} feature body contrast passes in ${theme} mode: ${JSON.stringify(colorState)}`);
        assert(await contrastAgainst(page, '.student-preview-feature .student-preview-kicker', '.student-preview-feature') >= 4.5, `${screen} feature label contrast passes in ${theme} mode: ${JSON.stringify(colorState)}`);
        if (theme === 'dark') assert.equal(await page.locator('.student-preview-feature').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', `${screen} dark feature surface stays near-black`);
      }
      await setTheme(page, 'dark');
      if (await page.locator('.student-preview-outline-link').count()) {
        const actionContrast = await elementContrast(page, '.student-preview-outline-link');
        const actionColors = await page.locator('.student-preview-outline-link').evaluate(element => ({ theme: document.documentElement.dataset.theme, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
        assert(actionContrast >= 4.5, `${screen} dark feature action remains readable: ${actionContrast}:1 ${JSON.stringify(actionColors)}`);
      }
      if (await page.locator('.student-preview-text-link').count()) assert(await contrastAgainst(page, '.student-preview-text-link', '.student-preview-content-card') >= 4.5, `${screen} dark inline action remains readable`);
    }
    if (screen === 'home') {
      await setTheme(page, 'dark');
      assert.equal(await page.locator('.student-preview-note-self-declared').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'MEC pilot note uses a neutral near-black dark surface');
      assert.equal(await page.locator('.student-preview-note-request').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'Request timing note uses a neutral near-black dark surface');
      assert(await contrastAgainst(page, '.student-preview-note-self-declared .student-preview-kicker', '.student-preview-note-self-declared') >= 4.5, 'MEC pilot note label remains readable in dark mode');
      assert(await contrastAgainst(page, '.student-preview-note-self-declared p:last-child', '.student-preview-note-self-declared') >= 4.5, 'MEC pilot note body remains readable in dark mode');
      assert(await contrastAgainst(page, '.student-preview-note-request p:last-child', '.student-preview-note-request') >= 4.5, 'Request timing note remains readable in dark mode');
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => localStorage.removeItem('idealab-mec:theme'));
      await page.reload();
      await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'system', 'First visit keeps system theme preference until the user selects a theme');
      assert.equal(await page.locator('.theme-toggle').getAttribute('aria-pressed'), 'true', 'System-dark preference is reflected in the toggle');
      assert.equal(await page.locator('.student-preview-note-self-declared').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'System-dark pilot note uses near-black without an explicit saved theme');
      assert.equal(await page.locator('.student-preview-note-request').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'System-dark timing note uses near-black without an explicit saved theme');
      assert(await contrastAgainst(page, '.student-preview-note-self-declared p:last-child', '.student-preview-note-self-declared') >= 4.5, 'System-dark pilot note body remains readable');
      await page.emulateMedia({ colorScheme: 'light' });
      await page.reload();
      await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'system', 'First visit remains on system theme when OS preference changes');
      assert.equal(await page.locator('.theme-toggle').getAttribute('aria-pressed'), 'false', 'System-light preference is reflected in the toggle');
    }
    if (screen === 'profile') {
      await setTheme(page, 'dark');
      assert.equal(await page.locator('.student-preview-profile-card').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'Profile summary uses a neutral near-black dark surface');
      assert(await contrastAgainst(page, '.student-preview-profile-card>div:nth-child(2)>p:last-child', '.student-preview-profile-card') >= 4.5, 'Private-profile description remains readable in dark mode');
      assert(await contrastAgainst(page, '.student-preview-field-plan .student-preview-privacy-copy', '.student-preview-field-plan .student-preview-privacy-copy') >= 4.5, 'Profile admission reminder remains readable in dark mode');
      assert(await contrastAgainst(page, '.student-preview-profile-edit .student-preview-privacy-copy', '.student-preview-profile-edit .student-preview-privacy-copy') >= 4.5, 'Profile edit reminder remains readable in dark mode');
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.evaluate(() => localStorage.removeItem('idealab-mec:theme'));
      await page.reload();
      await page.getByRole('heading', { name: studentScreens.profile, exact: true }).waitFor();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'system', 'Profile remains on the OS theme before an explicit choice');
      assert.equal(await page.locator('.student-preview-profile-card').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'System-dark profile summary uses a near-black surface');
      assert(await contrastAgainst(page, '.student-preview-profile-card>div:nth-child(2)>p:last-child', '.student-preview-profile-card') >= 4.5, 'System-dark private-profile description remains readable');
      assert(await contrastAgainst(page, '.student-preview-field-plan .student-preview-privacy-copy', '.student-preview-field-plan .student-preview-privacy-copy') >= 4.5, 'System-dark admission reminder remains readable');
    }
    await page.setViewportSize({ width: 375, height: 667 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const mobileBar = await page.locator('.student-preview-mobile-nav').boundingBox();
    const studentFooter = await page.locator('.student-preview-footer').boundingBox();
    assert(mobileBar && studentFooter && studentFooter.y + studentFooter.height <= mobileBar.y, `${screen} footer clears the fixed mobile navigation`);
  }
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(base + '/design/student?screen=home');
  await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
  await setTheme(page, 'light');
  const homeNav = page.locator('.student-preview-mobile-nav a[aria-current="page"]');
  assert.equal(await homeNav.innerText(), 'Home', 'Mobile navigation marks its current anchor');
  assert(await homeNav.evaluate(element => element.getBoundingClientRect().height >= 44), 'Mobile navigation links meet minimum touch height');
  await page.screenshot({ path: 'artifacts/acceptance/student-workspace-home-mobile.png', fullPage: true, animations: 'disabled' });
  await page.goto(base + '/design/student?screen=profile');
  await page.getByRole('heading', { name: studentScreens.profile, exact: true }).waitFor();
  assert(await page.getByRole('link', { name: 'Workspace settings' }).isVisible(), 'Mobile users can reach settings from their Profile destination');
  assert.equal(await page.locator('.student-preview-field-plan li').count(), 6, 'Profile preview documents the six required fields');
  assert.equal(await page.locator('.student-preview-edit-field').count(), 6, 'Profile page includes a six-field edit layout');
  assert(await page.getByText(/No ownership or duplicate check is represented here/).isVisible(), 'Profile preview does not imply independently verified MEC ownership');
  await page.getByRole('link', { name: 'Workspace settings' }).click();
  await page.getByRole('heading', { name: studentScreens.settings, exact: true }).waitFor();
  assert.equal(await page.locator('.student-preview-mobile-nav a[aria-current="location"]').getAttribute('href'), '/design/student?screen=profile', 'Mobile Settings stays grouped under the Profile destination');
  await page.goto(base + '/design/student?screen=profile');
  await page.getByRole('heading', { name: studentScreens.profile, exact: true }).waitFor();
  await setTheme(page, 'dark');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(0, 0, 0)', 'Student preview keeps the jet-black dark canvas');
  await page.screenshot({ path: 'artifacts/acceptance/student-workspace-profile-dark-mobile.png', fullPage: true, animations: 'disabled' });
  await page.goto(base + '/design/student?screen=home');
  await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
  await page.locator('.student-preview-module').last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('.student-preview-module')].at(-1)?.getAnimations().some(animation => animation.playState === 'running'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  assert(await page.evaluate(() => document.getAnimations().every(animation => animation.playState !== 'running')), 'Student scroll reveals respect reduced-motion preference');
  assert.deepEqual(studentDataRequests, [], 'Student layout preview makes no API or Supabase data requests');
  assert(!/student|profile|registration/i.test(await storageSnapshot(page)), 'Student preview does not store profile or registration values');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(base + '/projects');
  await page.getByRole('heading', { name: 'Ideas grow together.' }).waitFor();
  assert(await page.locator('main').getByRole('link', { name: /Sign in/ }).isVisible());
  for (const theme of ['Light', 'Dark']) {
    await page.goto(base + '/lab');
    await setTheme(page, theme.toLowerCase());
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await loadPageImages(page);
      assert.equal(await page.locator('.facility-card').count(), 11, 'Published facility directory contains eleven entries');
      assert(await page.getByRole('heading', { name: 'Epilog laser engraver', exact: true }).isVisible());
      assert(await page.getByRole('heading', { name: 'SolidWorks software', exact: true }).isVisible());
      assert(await page.getByText('This directory does not show live availability or reserve equipment.', { exact: false }).isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${theme} facility directory fits ${width}px`);
      await page.screenshot({ path: `artifacts/acceptance/lab-${theme.toLowerCase()}-${width}.png`, fullPage: true });
    }
  }
  await page.goto(base + '/explore');
  assert(await page.getByRole('heading', { name: 'Engage. Explore. Experience. Express. Excel.' }).isVisible());
  await page.goto(base + '/events');
  assert.equal(await page.getByText('TRIAD', { exact: true }).count(), 0, 'Individual event records remain outside the public page');
  assert(await page.getByRole('heading', { name: 'A culture of hands-on learning.' }).isVisible());
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(base + '/app/requests/new');
  assert.match(page.url(), /\/sign-in\?notice=configuration$/);
  await page.goto(base + '/design/request');
  await page.getByRole('heading', { name: 'Try the request flow.' }).waitFor();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Sample service (optional)').selectOption('sample-3d');
  await page.getByLabel('Request title').fill('Sample prototype fixture');
  await page.getByLabel('What do you need?').fill('Design preview only: discuss a prototype enclosure with the lab team.');
  const keyboardReferenceField = page.getByLabel('Reference links (optional)');
  await keyboardReferenceField.pressSequentially('https://idealab.mec.ac.in/');
  await keyboardReferenceField.press('Enter');
  await keyboardReferenceField.pressSequentially('https://mec.ac.in/');
  assert.equal(await keyboardReferenceField.inputValue(), 'https://idealab.mec.ac.in/\nhttps://mec.ac.in/', 'Typing a second URL keeps the line break in the controlled textarea');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Review your draft.' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'https://idealab.mec.ac.in/' }).getAttribute('rel'), 'noreferrer');
  assert(await page.getByRole('link', { name: 'https://mec.ac.in/' }).isVisible(), 'The second keyboard-entered URL is present in the review');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  assert.match(await page.getByRole('status').innerText(), /has not been sent to the lab/);
  const originalAccountKey = 'idealab-mec:request-draft:v1:design-preview';
  assert.equal(await page.evaluate(key => localStorage.getItem(key), originalAccountKey), null, 'Preview draft is not persisted in local storage');
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), originalAccountKey), null, 'Preview draft is not persisted in session storage');
  await page.getByRole('link', { name: 'Return to work requests' }).click();
  await page.getByRole('heading', { name: 'Sample prototype fixture', exact: true }).waitFor();
  assert(await page.getByText('UNSUBMITTED DRAFT', { exact: true }).isVisible());
  assert(await page.getByText('We can’t check your submitted requests here yet.', { exact: false }).isVisible());
  await page.screenshot({ path: 'artifacts/acceptance/request-workspace-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Delete browser draft' }).click();
  assert(await page.getByRole('button', { name: 'Keep draft' }).evaluate(element => element === document.activeElement), 'Delete confirmation focuses safe action');
  await page.getByRole('button', { name: 'Keep draft' }).click();
  assert(await page.getByRole('button', { name: 'Check again' }).evaluate(element => element === document.activeElement), 'Closing confirmation preserves keyboard position');
  await page.getByRole('link', { name: 'Continue saved draft' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await page.getByLabel('Request title').inputValue(), 'Sample prototype fixture');
  assert.equal(await page.getByLabel('Reference links (optional)').inputValue(), 'https://idealab.mec.ac.in/\nhttps://mec.ac.in/');
  await page.getByLabel('Reference links (optional)').fill('https://unsaved.example/');
  await page.getByRole('button', { name: 'Restore saved draft' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await page.getByLabel('Request title').inputValue(), 'Sample prototype fixture');
  assert.equal(await page.getByLabel('Reference links (optional)').inputValue(), 'https://idealab.mec.ac.in/\nhttps://mec.ac.in/', 'Manual restore replaces unsaved URL text with saved references');
  await page.reload();
  await page.getByRole('button', { name: 'Restore saved draft' }).click();
  assert.match(await page.getByRole('status').innerText(), /No saved draft was found/);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Request title').fill('Preview delete fixture');
  await page.getByLabel('What do you need?').fill('A temporary preview draft for checking deletion and focus handling.');
  await page.getByRole('button', { name: 'Save for later' }).click();
  assert.match(await page.getByRole('status').innerText(), /Draft saved for this preview session/);
  await page.getByRole('link', { name: 'Return to work requests' }).click();
  await page.getByRole('heading', { name: 'Preview delete fixture', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Back to IDEALAB MEC' }).click();
  await page.getByRole('heading', { name: 'Big ideas. Real things. Your move.' }).waitFor();
  await page.goBack();
  await page.getByRole('heading', { name: 'Start with what you have.' }).waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), originalAccountKey), null, 'Leaving and re-entering the preview clears in-memory drafts');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Draft preview must fit on mobile');
  await page.screenshot({ path: 'artifacts/acceptance/request-preview-mobile.png', fullPage: true });
  await page.goto(base + '/design/request');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Request title').fill('Reference validation fixture');
  await page.getByLabel('What do you need?').fill('Testing the optional reference URL validation in the local preview.');
  const referenceField = page.getByLabel('Reference links (optional)');
  await referenceField.fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await referenceField.getAttribute('aria-invalid'), 'true', 'Unsafe reference protocols are rejected');
  assert.match(await page.locator('#reference-error').innerText(), /http:\/\/ or https:\/\//);
  await page.waitForFunction(() => document.activeElement?.id === 'request-references');
  assert(await referenceField.evaluate(element => element === document.activeElement), 'Reference validation focuses the invalid field');
  await referenceField.fill('https://example.edu/prototype');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  assert.equal(await page.getByRole('link', { name: 'https://example.edu/prototype' }).getAttribute('href'), 'https://example.edu/prototype');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(base);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  assert.equal(await page.locator('.hero-star').evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.equal(await page.locator('[data-reveal]').evaluateAll(elements => elements.every(element => getComputedStyle(element).opacity === '1')), true, 'Reduced-motion content stays fully visible');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto(base);
  await page.locator('.hero-copy').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  await page.locator('.path-grid').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction(() => [...document.querySelectorAll('.path-card')].some(element => element.getAnimations().some(animation => animation.playState === 'running')));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running'));
  assert(await page.getByRole('link', { name: 'Discover projects', exact: true }).isVisible(), 'Changing motion preference preserves card access');

  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(base + '/design/workspace');
  await setTheme(page, 'light');
  await page.getByRole('heading', { name: 'A workspace built around the work.' }).waitFor();
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow', 'Staff wireframe preview is excluded from search indexing');
  assert(await elementContrast(page, '.staff-preview-state') >= 4.5, 'Not-connected status meets text contrast in light mode');
  assert(await page.getByText('no account, assignments, records or actions are connected', { exact: false }).isVisible());
  assert.equal(await page.getByRole('button', { name: 'Machine / Room Head' }).getAttribute('aria-pressed'), 'true', 'Machine/room layout is initially selected');
  const previewStorage = await storageSnapshot(page);
  const layoutChoices = [
    ['Operations Head', 'Operations workspace'],
    ['Events Head', 'Events workspace'],
    ['Super Admin', 'Administration workspace'],
    ['Machine / Room Head', 'Machine & room workspace'],
  ];
  for (const [label, heading] of layoutChoices) {
    await page.getByRole('button', { name: label, exact: true }).click();
    assert.equal(await page.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true', `${label} layout announces selection`);
    assert(await page.getByRole('heading', { name: heading, exact: true }).isVisible(), `${label} layout updates its scope description`);
  }
  assert.deepEqual(await storageSnapshot(page), previewStorage, 'Changing staff layout previews does not persist data');
  assert(await page.getByText('This preview contains no requests, people, counts or machine records.', { exact: false }).isVisible(), 'Inbox is empty without fabricated records');
  assert.equal(await page.getByRole('button', { name: /assign|approve|confirm|publish|issue|refund/i }).count(), 0, 'Design preview exposes no operational actions');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Staff preview fits ${width}px without horizontal scrolling`);
    if (width === 375) await page.screenshot({ path: 'artifacts/acceptance/staff-workspace-mobile.png', fullPage: true });
  }
  await setTheme(page, 'dark');
  assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(0, 0, 0)', 'Staff preview keeps the jet-black dark canvas');
  assert(await elementContrast(page, '.staff-preview-state') >= 4.5, 'Not-connected status meets text contrast in dark mode');
  await page.screenshot({ path: 'artifacts/acceptance/staff-workspace-dark.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 1000 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Dark staff preview fits mobile width');
  await page.screenshot({ path: 'artifacts/acceptance/staff-workspace-dark-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.staff-preview-heading').evaluate(element => getComputedStyle(element).animationName), 'none', 'Staff preview entrance respects reduced motion');
  await setTheme(page, 'light');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  assert.deepEqual(cspErrors, [], 'CSP allows the application scripts, styles and assets needed for the public journey');
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
  assert.equal((await fetch(offBase + '/design/requests')).status, 404, 'Request workspace preview must be unavailable when disabled');
  assert.equal((await fetch(offBase + '/design/onboarding')).status, 404, 'Onboarding design preview must be unavailable when disabled');
  assert.equal((await fetch(offBase + '/design/student')).status, 404, 'Student workspace design preview must be unavailable when disabled');
  assert.equal((await fetch(offBase + '/design/workspace')).status, 404, 'Staff workspace design preview must be unavailable when disabled');
  const recoveryPort = await availablePort();
  const recoveryBase = `http://127.0.0.1:${recoveryPort}`;
  let recoveryOutput = '';
  recoveryConfigServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(recoveryPort)], { env: { ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://configuration-fixture.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_configuration_fixture', ENABLE_MEMBER_PLATFORM: 'true', AUTH_SITE_URL: recoveryBase, ENABLE_GOOGLE_SIGN_IN: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
  recoveryConfigServer.stdout.on('data', chunk => { recoveryOutput = (recoveryOutput + chunk).slice(-5000); });
  recoveryConfigServer.stderr.on('data', chunk => { recoveryOutput = (recoveryOutput + chunk).slice(-5000); });
  let recoveryReady = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (recoveryConfigServer.exitCode !== null) throw new Error(`Recovery configuration server exited: ${recoveryOutput}`);
    if (recoveryOutput.includes('Ready in')) {
      try { if ((await fetch(recoveryBase)).ok && recoveryConfigServer.exitCode === null) { recoveryReady = true; break; } } catch { /* Server starting. */ }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(recoveryReady, 'Recovery configuration fixture must start; its .invalid backend is never contacted');
  for (const route of ['forgot-password', 'reset-password']) {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${recoveryBase}/${route}`);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
    assert.equal(await page.locator('form input:disabled').count(), 0, `${route} form enables only with explicit member and valid origin configuration`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} configuration fixture has no horizontal overflow at 320px`);
    if (route === 'reset-password') {
      assert.equal(await page.locator('input[name="new_password"]').count(), 1);
      assert.equal(await page.locator('input[name="confirm_password"]').count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Show password' }).count(), 2, 'Both password fields have keyboard-operable visibility toggles');
    } else {
      assert(await page.getByLabel('Email address').isEnabled());
    }
  }
  const rejectedRecovery = await fetch(`${recoveryBase}/auth/recovery/callback?error=access_denied&next=https%3A%2F%2Fevil.invalid`, { redirect: 'manual' });
  assert.equal(rejectedRecovery.status, 307, 'Malformed/rejected recovery callback exits without contacting Supabase');
  assert.match(rejectedRecovery.headers.get('cache-control') ?? '', /private, no-store/);
  assert.equal(new URL(rejectedRecovery.headers.get('location')).origin, recoveryBase, 'Recovery callback stays on the configured canonical origin');
  assert.equal(new URL(rejectedRecovery.headers.get('location')).pathname, '/forgot-password', 'Callback ignores untrusted return paths');
  assert(!new URL(rejectedRecovery.headers.get('location')).searchParams.has('next'), 'Callback does not reflect attacker-controlled query data');
  const genericRecovery = await page.goto(`${recoveryBase}/forgot-password?notice=requested`);
  assert(genericRecovery?.ok(), 'Recovery request status page renders');
  assert(await page.getByText(/same whether or not an account exists/i).isVisible(), 'Recovery status avoids revealing whether an account exists');
  console.log('PASS: public journey, 5 widths in light/dark, login/signup and recovery layouts/themes, palette contrast, no-JavaScript content, scroll/card motion and live reduced-motion cancellation, assets, keyboard navigation, gated onboarding/staff previews, student module layouts and feature contrast, request drafts, recovery callback rejection, generic recovery response and security headers.');
  console.log('UNVERIFIED: live account creation, email delivery, email/Google sign-in, recovery-link exchange/password update, draft under a real member session, scoped permissions and operational backend workflows.');
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
  for (const child of [server, previewOffServer, recoveryConfigServer]) {
    if (!child || child.exitCode !== null) continue;
    const exit = once(child, 'exit');
    child.kill();
    await Promise.race([exit, new Promise(resolve => setTimeout(resolve, 3000))]);
  }
}
