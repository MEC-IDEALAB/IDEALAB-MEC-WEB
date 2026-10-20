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
async function setTheme(page, theme) {
  await page.waitForFunction(() => {
    const button = document.querySelector('.theme-toggle');
    const current = document.documentElement.dataset.theme;
    const dark = current === 'dark' || (current !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    return button?.getAttribute('aria-pressed') === String(dark);
  });
  const dark = await page.locator('.theme-toggle').getAttribute('aria-pressed') === 'true';
  if (dark !== (theme === 'dark')) await page.locator('.theme-toggle').click();
}
async function loadPageImages(page) {
  for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
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
  releaseScripts();
  await loaderPage.waitForFunction(() => document.documentElement.dataset.boot === 'leaving');
  assert.equal(await loaderPage.locator('#site-content').evaluate(element => element.inert), true, 'Page content stays inert during the loader exit');
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
  releaseWatchdogScripts();
  await watchdogContext.close();
  const noScriptContext = await browser.newContext({ javaScriptEnabled: false });
  const noScriptPage = await noScriptContext.newPage();
  await noScriptPage.goto(base);
  assert(await noScriptPage.getByRole('heading', { name: 'Big ideas. Real things. Your move.' }).isVisible(), 'Homepage remains visible without JavaScript');
  assert(await noScriptPage.getByRole('link', { name: 'Discover projects', exact: true }).isVisible(), 'Server-rendered card links remain usable without animation enhancement');
  await noScriptContext.close();
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(base);
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert(await page.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'The global theme stylesheet must be applied');
    assert.match(await page.title(), /IDEALAB MEC/);
    assert.equal(await page.locator('main').count(), 1);
    assert.equal(await page.getByText('THE MAKER SPIRIT, AT MEC.', { exact: true }).count(), 0);
    assert.equal(await page.locator('.hero-footnote').count(), 0);
    assert.equal(await page.locator('.facility-card').count(), 3, 'Homepage shows three curated facility highlights');
    assert.equal(await page.locator('.activity-card').count(), 3, 'Homepage introduces three activity themes');
    assert(await page.locator('.playful-site').evaluate(element => getComputedStyle(element).backgroundImage.includes('linear-gradient') && !getComputedStyle(element).backgroundImage.includes('radial-gradient')), 'Notebook cross grid replaces dotted page background');
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await loadPageImages(page);
    assert(await page.locator('img').evaluateAll(images => images.length >= 2 && images.every(image => image.complete && image.naturalWidth > 0)), 'Every displayed logo/image must load');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.hero-copy').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow at ${width}px`);
    await page.screenshot({ path: `artifacts/acceptance/home-${width}.png`, fullPage: true });
    if (width === 1440) await page.screenshot({ path: 'artifacts/acceptance/home-hero-1440.png' });
  }
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
  assert(await page.getByText('Roll numbers are unique within each institution.').isVisible(), 'Roll-number scope is visible in the onboarding preview');
  assert(await page.getByText('Free text. Any institution is welcome; email domain does not verify affiliation.').isVisible(), 'Institution is presented as free text without implying affiliation verification');
  assert(await page.getByText(/private by default/i).isVisible(), 'Required profile details are described as private by default');
  await setTheme(page, 'dark');
  const storageBeforePreview = await storageSnapshot(page);
  await page.getByRole('button', { name: 'Check preview fields' }).click();
  await page.locator('.onboarding-error-summary').waitFor();
  assert.equal(await page.locator('.onboarding-error-summary li').count(), 6, 'Invalid submit summarizes all missing required fields');
  await page.waitForFunction(() => document.querySelector('.onboarding-error-summary') === document.activeElement);
  assert(await page.locator('.onboarding-error-summary').evaluate(element => element === document.activeElement), 'Validation moves focus to the error summary');
  await page.getByRole('link', { name: 'College / institution' }).click();
  assert(await page.getByLabel('College / institution').evaluate(element => element === document.activeElement), 'Error-summary field links move focus to the named input');
  await page.getByLabel('Full name').fill('Ada Example');
  await page.getByLabel('Phone number').fill('0000000000');
  await page.getByLabel('Roll number').fill('SAMPLE-001');
  await page.getByLabel('Department').fill('Sample Engineering');
  await page.getByLabel('Current year of study').selectOption('Year 2');
  await page.getByLabel('College / institution').fill('Example Institution');
  await page.getByRole('button', { name: 'Check preview fields' }).click();
  await page.locator('.onboarding-preview-result').getByText('Preview check complete. Nothing was sent or saved.').waitFor();
  assert.equal(await storageSnapshot(page), storageBeforePreview, 'Onboarding preview must not persist entered values');
  for (const [width, theme] of [[320, 'light'], [375, 'dark'], [768, 'light'], [1440, 'dark']]) {
    await page.goto(base + '/design/onboarding');
    await page.setViewportSize({ width, height: 900 });
    await setTheme(page, theme);
    await page.getByRole('heading', { name: 'Your details' }).waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Onboarding preview fits ${width}px in ${theme} mode`);
    await page.screenshot({ path: `artifacts/acceptance/onboarding-preview-${width}-${theme}.png`, fullPage: true });
  }
  const noJsContext = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJsContext.newPage();
  const noJsRequests = [];
  noJsPage.on('request', request => noJsRequests.push(request.url()));
  await noJsPage.goto(base + '/design/onboarding');
  await noJsPage.getByLabel('Full name').fill('NoJs Example');
  await noJsPage.getByLabel('Phone number').fill('5550108822');
  await noJsPage.getByLabel('Roll number').fill('WEB-NOJS-CASE');
  await noJsPage.getByLabel('Department').fill('NoJs Engineering');
  await noJsPage.getByLabel('Current year of study').selectOption('Year 3');
  await noJsPage.getByLabel('College / institution').fill('Example University');
  const noJsUrl = noJsPage.url();
  const noJsRequestCount = noJsRequests.length;
  await noJsPage.getByRole('button', { name: 'Check preview fields' }).click();
  assert.equal(noJsPage.url(), noJsUrl, 'No-JavaScript preview controls must not submit or navigate');
  assert.equal(noJsRequests.length, noJsRequestCount, 'No-JavaScript preview controls must not send any request');
  assert(noJsRequests.every(url => !/NoJs|WEB-NOJS|5550108822/.test(url)), 'No-JavaScript preview must not send entered details in a request URL');
  await noJsContext.close();
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
  console.log('PASS: public journey, 5 widths in light/dark, auth layouts/themes, palette contrast, no-JavaScript content, scroll/card motion and live reduced-motion cancellation, assets, keyboard navigation, gated six-field onboarding preview with validation/no storage, route denial, sample draft journeys, 404 and security headers.');
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
