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
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', ENABLE_MEMBER_PLATFORM: 'false', ENABLE_MEMBER_PLATFORM_PRODUCTION: 'false', ENABLE_MEMBER_PLATFORM_TEST: 'false', IDEALAB_ISOLATED_ACCEPTANCE_BUILD: 'true', ENABLE_DESIGN_PREVIEW: 'true' };
// Workspace navigation is checked against rendered links, grouping, touch
// targets and viewport geometry below, rather than obsolete fixed-bar CSS.
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
  assert.equal(home.headers.get('referrer-policy'), 'origin');
  const policy = home.headers.get('content-security-policy');
  assert.match(policy, /frame-ancestors 'none'/);
  const nonce = policy.match(/(?:^|;)\s*script-src[^;]*'nonce-([^']+)'/)?.[1];
  assert(nonce, 'Every rendered HTML response must carry a nonce-based script policy');
  assert.match(policy, /object-src 'none'/);
  assert.doesNotMatch(policy.match(/script-src[^;]+/)?.[0] ?? '', /unsafe-inline|unsafe-eval/);
  const html = await home.text();
  assert.match(html, /rel="manifest"[^>]*href="\/manifest\.webmanifest"/, 'Home must link the install manifest');
  const manifestResponse = await fetch(base + '/manifest.webmanifest');
  assert.equal(manifestResponse.status, 200);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.name, 'IDEALAB MEC');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(item => item.sizes === `${size}x${size}` && item.type === 'image/png');
    assert(icon, `Install icon ${size} must be declared`);
    const iconResponse = await fetch(new URL(icon.src, base));
    assert.equal(iconResponse.status, 200);
    assert.match(iconResponse.headers.get('content-type'), /^image\/png/);
    const png = Buffer.from(await iconResponse.arrayBuffer());
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const inlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(([, attributes]) => !/\bsrc=/.test(attributes));
  assert(inlineScripts.length > 0, 'Rendered page should include framework and application scripts');
  assert(inlineScripts.every(([, attributes]) => attributes.match(/\bnonce=["']([^"']+)["']/)?.[1] === nonce), 'Inline scripts must receive the response nonce');
  const repeatedHome = await fetch(base);
  const repeatedNonce = repeatedHome.headers.get('content-security-policy')?.match(/(?:^|;)\s*script-src[^;]*'nonce-([^']+)'/)?.[1];
  assert(repeatedNonce && repeatedNonce !== nonce, 'Each page response must use a fresh nonce');
  const signInResponse = await fetch(base + '/sign-in');
  assert.equal(signInResponse.headers.get('referrer-policy'), 'origin', 'Sign-in URLs must not be sent as same-origin referrers');
  const authCallbackResponse = await fetch(base + '/auth/callback', { redirect: 'manual' });
  assert.equal(authCallbackResponse.headers.get('referrer-policy'), 'no-referrer', 'Auth callback URLs must never be sent as referrers');
  for (const path of ['/account-access', '/app', '/app/profile', '/app/settings', '/app/visits', '/app/borrowing', '/app/requests', '/app/requests/new', '/app/workspace']) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 307, `${path} must not be accessible without auth`);
    assert.match(response.headers.get('location'), /\/sign-in\?notice=configuration$/);
    assert.match(response.headers.get('cache-control'), /private.*no-store/);
    assert.match(response.headers.get('content-security-policy'), /script-src[^;]*'nonce-/);
  }
  assert.equal((await fetch(base + '/unknown-page')).status, 404);
  browser = await chromium.launch({ headless: true });
  const serviceWorkerResponse = await fetch(base + '/sw.js');
  assert.equal(serviceWorkerResponse.status, 200);
  assert.match(await serviceWorkerResponse.text(), /request\.mode !== 'navigate'/, 'The offline worker must not intercept API or asset requests');
  const pwaContext = await browser.newContext();
  const pwaPage = await pwaContext.newPage();
  await pwaPage.goto(base, { waitUntil: 'domcontentloaded' });
  await pwaPage.waitForFunction(async () => Boolean((await navigator.serviceWorker?.getRegistration('/'))?.active), null, { timeout: 10000 });
  await pwaPage.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const shellPaths = await pwaPage.evaluate(async () => {
    const names = await caches.keys();
    const keys = await Promise.all(names.map(async name => (await caches.open(name)).keys()));
    return keys.flat().map(request => new URL(request.url).pathname).sort();
  });
  assert.deepEqual(shellPaths, ['/brand/app-icon-192.png', '/brand/app-icon-512.png', '/brand/app-icon-maskable.svg', '/offline.css', '/offline.html'], 'Only the static offline screen, its stylesheet and app icons may be cached');
  await pwaContext.setOffline(true);
  await pwaPage.goto(base + '/app/profile', { waitUntil: 'domcontentloaded' });
  await pwaPage.getByRole('heading', { name: 'Back online soon.' }).waitFor();
  assert.match(await pwaPage.locator('main').innerText(), /never stored for offline use/i);
  assert.equal(await pwaPage.locator('body').evaluate(element => getComputedStyle(element).display), 'grid', 'The offline stylesheet must load from the cache under the site CSP');
  await pwaPage.waitForFunction(() => { const image = document.querySelector('main img'); return Boolean(image?.complete && image.naturalWidth > 0); });
  const cachedMemberRoutes = await pwaPage.evaluate(async () => (await Promise.all((await caches.keys()).map(async name => (await caches.open(name)).keys()))).flat().map(request => new URL(request.url).pathname).filter(path => path.startsWith('/app/') || path.startsWith('/auth/')));
  assert.deepEqual(cachedMemberRoutes, [], 'Member and auth routes must never enter the offline cache');
  await pwaContext.setOffline(false);
  await pwaContext.close();
  const projectPreviewContext = await browser.newContext();
  const projectPreview = await projectPreviewContext.newPage();
  await projectPreview.goto(base + '/design/project-create');
  await projectPreview.waitForFunction(()=>!document.getElementById('site-content')?.inert && !document.documentElement.dataset.boot);
  await projectPreview.getByLabel('Project title', {exact:true}).fill('A preserved idea');
  await projectPreview.getByLabel('What are you building?', {exact:true}).fill('Details must remain available.');
  await projectPreview.evaluate(() => { Object.defineProperty(window, 'indexedDB', {value:{open(){throw new Error('storage denied');}},configurable:true}); });
  await projectPreview.getByRole('button',{name:'Create project'}).click();
  await projectPreview.getByRole('heading',{name:'Check your earlier submission'}).waitFor();
  assert.equal(await projectPreview.getByLabel('Your title',{exact:true}).inputValue(),'A preserved idea');
  assert.equal(await projectPreview.getByLabel('Your description',{exact:true}).inputValue(),'Details must remain available.');
  await projectPreviewContext.close();
  const projectRaceContext=await browser.newContext();
  const projectA=await projectRaceContext.newPage(),projectB=await projectRaceContext.newPage();
  let previewPosts=0;
  for(const tab of [projectA,projectB]){tab.on('request',request=>{if(request.method()==='POST')previewPosts++;});await tab.goto(base+'/design/project-create');await tab.getByLabel('Project title',{exact:true}).waitFor();await tab.waitForFunction(()=>!document.getElementById('site-content')?.inert && !document.documentElement.dataset.boot);}
  await projectA.getByLabel('Project title',{exact:true}).fill('First idea');
  await projectA.getByLabel('What are you building?',{exact:true}).fill('First details');
  await projectB.getByLabel('Project title',{exact:true}).fill('Other idea');
  await projectB.getByLabel('What are you building?',{exact:true}).fill('Other details');
  await projectA.getByRole('button',{name:'Create project'}).click();
  await projectA.getByText('Design preview only. No project was submitted.').waitFor();
  await projectB.getByRole('button',{name:'Create project'}).click();
  assert.equal(await projectB.getByLabel('Your other title',{exact:true}).inputValue(),'Other idea');
  assert.equal(await projectB.getByLabel('Your other description',{exact:true}).inputValue(),'Other details');
  await projectB.evaluate(()=>Object.defineProperty(window,'indexedDB',{value:{open(){throw new Error('storage denied');}},configurable:true}));
  await projectB.getByRole('button',{name:'Retry saved submission'}).click();
  assert.equal(await projectB.getByLabel('Saved submission title',{exact:true}).inputValue(),'First idea');
  assert.equal(await projectB.getByLabel('Your title',{exact:true}).inputValue(),'Other idea');
  assert.equal(await projectB.getByLabel('Your description',{exact:true}).inputValue(),'Other details');
  assert.equal(previewPosts,0,'Preview must not send a project action');
  await projectRaceContext.close();
  const markerPreviewContext=await browser.newContext();
  await markerPreviewContext.addInitScript(()=>localStorage.setItem('idealab-mec:preview-project-create:v1:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222','1'));
  const markerPreview=await markerPreviewContext.newPage();let markerPosts=0;
  markerPreview.on('request',request=>{if(request.method()==='POST')markerPosts++;});
  await markerPreview.goto(base+'/design/project-create');
  await markerPreview.getByRole('button',{name:/Check saved submission/}).click();
  await markerPreview.getByText('Design preview only. No submission was checked.').waitFor();
  assert.equal(markerPosts,0,'Preview recovery must not call a server action');
  await markerPreviewContext.close();
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
  let releaseStyles;
  const stylesReady = new Promise(resolve => { releaseStyles = resolve; });
  let stylesheetRequests = 0;
  let stylesheetHoldMs = 0;
  let stylesReleaseTimer;
  await loaderPage.route('**/_next/static/**/*.css', async route => {
    stylesheetRequests += 1;
    if (!stylesReleaseTimer) stylesReleaseTimer = setTimeout(releaseStyles, 450);
    const heldSince = Date.now();
    await stylesReady;
    stylesheetHoldMs = Math.max(stylesheetHoldMs, Date.now() - heldSince);
    await route.continue();
  });
  let releaseScripts;
  const scriptsReady = new Promise(resolve => { releaseScripts = resolve; });
  await loaderPage.route('**/_next/static/**/*.js', async route => { await scriptsReady; await route.continue(); });
  await loaderPage.goto(base, { waitUntil: 'commit' });
  await loaderPage.locator('.boot-loader').waitFor({ state: 'visible' });
  await loaderPage.waitForFunction(() => document.getElementById('site-content')?.inert === true);
  await loaderPage.waitForFunction(() => Number(document.documentElement.dataset.bootVisualStarted) > 0);
  await loaderPage.waitForFunction(() => {
    const core = document.querySelector('.loader-core');
    const title = core?.querySelector('.loader-lockup');
    const visibleWords = [...(core?.querySelectorAll('.loader-title-chunk > span') ?? [])].every(word => {
      const text = word.getBoundingClientRect();
      const clip = word.parentElement.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(text.bottom, clip.bottom) - Math.max(text.top, clip.top));
      return text.width > 0 && text.height > 0 && visibleHeight > text.height * .6
        && Number(getComputedStyle(word).opacity) >= .7;
    });
    return core && title && Number(getComputedStyle(core).opacity) >= .45
      && core.getBoundingClientRect().width > 0
      && core.getBoundingClientRect().height > 0
      && title.getBoundingClientRect().width > 0 && visibleWords;
  }, null, { timeout: 800 });
  const criticalFrame = await loaderPage.locator('.loader-core').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { opacity: Number(getComputedStyle(element).opacity), width: rect.width, height: rect.height, title: element.querySelector('.loader-lockup')?.getBoundingClientRect().width ?? 0 };
  });
  assert(criticalFrame.opacity >= .45 && criticalFrame.width > 0 && criticalFrame.height > 0 && criticalFrame.title > 0, `The loader's first animation frame has a visible branded composition after delayed CSS arrives: ${JSON.stringify(criticalFrame)}`);
  releaseStyles();
  assert(stylesheetRequests > 0 && stylesheetHoldMs >= 400, `The delayed-CSS check holds a real stylesheet request for at least 400ms: ${JSON.stringify({ stylesheetRequests, stylesheetHoldMs })}`);
  clearTimeout(stylesReleaseTimer);
  const orbit = loaderPage.locator('.loader-build-orbit');
  const firstOrbitTransform = await orbit.evaluate(element => getComputedStyle(element).transform);
  await loaderPage.waitForFunction(transform => getComputedStyle(document.querySelector('.loader-build-orbit')).transform !== transform, firstOrbitTransform, { timeout: 400 });
  assert.notEqual(await orbit.evaluate(element => getComputedStyle(element).transform), firstOrbitTransform, 'The blueprint marker orbits the prototype while loading');
  await loaderPage.keyboard.press('Tab');
  assert.equal(await loaderPage.evaluate(() => Boolean(document.activeElement?.closest('#site-content'))), false, 'Covered page controls cannot receive keyboard focus before hydration');
  assert.equal(await loaderPage.locator('.boot-loader').evaluate(element => getComputedStyle(element).pointerEvents), 'auto', 'Boot screen blocks pointer input while it covers the page');
  const loop = loaderPage.locator('.loader-loop').first();
  const firstPosition = await loop.evaluate(element => element.getBoundingClientRect().x);
  await loaderPage.waitForFunction(position => document.querySelector('.loader-loop')?.getBoundingClientRect().x !== position, firstPosition, { timeout: 400 });
  const nextPosition = await loop.evaluate(element => element.getBoundingClientRect().x);
  assert.notEqual(nextPosition, firstPosition, 'Brand ribbons move while the first visit is loading');
  assert.deepEqual(await loaderPage.locator('.loader-title-chunk > span').evaluateAll(elements => elements.map(element => getComputedStyle(element).animationDelay)), ['0.18s', '0.27s', '0.36s'], 'The IDEALAB lockup reveals in a clear three-beat sequence');
  assert.equal(await loaderPage.locator('.loader-progress > span').evaluate(element => getComputedStyle(element).animationName), 'loader-progress-sweep', 'The loader uses an indeterminate moving rail rather than implying measured completion');
  assert.equal(await loaderPage.locator('.loader-progress').evaluate(element => getComputedStyle(element).animationDelay), '0.5s', 'The progress rail appears before its sweep begins');
  assert.equal(await loaderPage.locator('.loader-progress > span').evaluate(element => getComputedStyle(element).animationDelay), '0.74s', 'The rail sweep starts after its track is visible');
  assert.equal(await loaderPage.locator('.loader-progress > span').evaluate(element => getComputedStyle(element).animationDuration), '0.84s', 'The indeterminate rail uses a calmer sweep cycle');
  await loaderPage.waitForFunction(() => Number(getComputedStyle(document.querySelector('.loader-progress')).opacity) > .85, null, { timeout: 1100 });
  assert(await loaderPage.locator('.loader-progress').evaluate(element => Number(getComputedStyle(element).opacity) > .85), 'The rail is already visible before its sweep begins');
  const firstRailPosition = await loaderPage.locator('.loader-progress > span').evaluate(element => element.getBoundingClientRect().x);
  await loaderPage.waitForFunction(position => document.querySelector('.loader-progress > span')?.getBoundingClientRect().x !== position, firstRailPosition, { timeout: 400 });
  const nextRailPosition = await loaderPage.locator('.loader-progress > span').evaluate(element => element.getBoundingClientRect().x);
  assert.notEqual(nextRailPosition, firstRailPosition, 'The revealed rail visibly sweeps before the loader exits');
  const railMetrics = await loaderPage.locator('.loader-progress').evaluate(element => {
    const track = element.getBoundingClientRect();
    const sweepElement = element.querySelector('span');
    if (!sweepElement) return { track: { x: track.x, width: track.width, height: track.height }, sweep: null, transform: 'missing' };
    const sweep = sweepElement.getBoundingClientRect();
    const style = getComputedStyle(sweepElement);
    return { track: { x: track.x, width: track.width, height: track.height }, sweep: { x: sweep.x, width: sweep.width, height: sweep.height }, transform: style.transform };
  });
  assert(railMetrics.track.width > 0 && railMetrics.sweep && railMetrics.sweep.width > 0 && railMetrics.sweep.x < railMetrics.track.x + railMetrics.track.width && railMetrics.sweep.x + railMetrics.sweep.width > railMetrics.track.x, `The moving lime sweep is visible within its track before the loader exits: ${JSON.stringify(railMetrics)}`);
  await loaderPage.screenshot({ path: 'artifacts/acceptance/wordmark-loading.png' });
  const loaderExitState = loaderPage.evaluate(() => new Promise(resolve => {
    const root = document.documentElement;
    const content = document.getElementById('site-content');
    const capture = () => ({ inert: content?.inert === true, opacity: getComputedStyle(document.querySelector('.boot-loader')).opacity, bootAge: performance.now() - Number(root.dataset.bootStarted), visualAge: performance.now() - Number(root.dataset.bootVisualStarted) });
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
  assert(exitState.visualAge >= 1550, `The complete motion sequence stays visible for at least 1,550 ms after it becomes visible (${Math.round(exitState.visualAge)} ms)`);
  assert(exitState.bootAge < 2600, `A fast first visit does not linger after its readiness checks (${Math.round(exitState.bootAge)} ms)`);
  assert.match(await loaderPage.locator('.boot-loader').evaluate(element => getComputedStyle(element).transitionDuration), /^0\.32s(?:,|$)/, 'Boot screen has a measured fade-out');
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
  await reducedLoaderPage.waitForLoadState('domcontentloaded');
  assert.equal(await reducedLoaderPage.locator('html').getAttribute('data-boot'), null, 'Reduced-motion users skip the brand intro before client hydration');
  assert.equal(await reducedLoaderPage.locator('#site-content').evaluate(element => element.inert), false, 'Reduced-motion users can access the page without waiting for hydration');
  assert.equal(await reducedLoaderPage.locator('.loader-loop').first().evaluate(element => getComputedStyle(element).animationName), 'none', 'Brand loading respects reduced motion');
  assert.equal(await reducedLoaderPage.locator('.boot-loader').evaluate(element => getComputedStyle(element).display), 'none', 'Reduced-motion users do not receive a static overlay delay');
  assert.equal(await reducedLoaderPage.locator('.loader-core').evaluate(element => getComputedStyle(element).borderStyle), 'none', 'The wordmark loader uses the official open composition without a framed card');
  assert(await reducedLoaderPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Reduced-motion page has no horizontal overflow at 320px');
  await reducedLoaderPage.screenshot({ path: 'artifacts/acceptance/reduced-motion-dark-mobile.png' });
  releaseReducedScripts();
  await reducedLoaderPage.waitForLoadState('load');
  assert.equal(await reducedLoaderPage.locator('html').getAttribute('data-boot'), null, 'Hydrating later does not reintroduce the reduced-motion loader');
  await reducedLoaderPage.reload();
  assert.equal(await reducedLoaderPage.locator('html').getAttribute('data-boot'), null, 'Reduced-motion loader also stays first-visit only');
  await reducedLoaderContext.close();

  const motionChangeContext = await browser.newContext({ reducedMotion: 'no-preference' });
  const motionChangePage = await motionChangeContext.newPage();
  await motionChangePage.addInitScript(() => {
    const originalAdd = MediaQueryList.prototype.addEventListener;
    MediaQueryList.prototype.addEventListener = function (type, listener, options) {
      const listenerSource = Function.prototype.toString.call(listener);
      if (this.media === '(prefers-reduced-motion: reduce)' && type === 'change'
        && (listener.name === 'onMotionChange' || listenerSource.includes('.matches'))) {
        globalThis.__idealabReducedMotionListenerAttached = true;
      }
      return originalAdd.call(this, type, listener, options);
    };
  });
  let releaseMotionScripts;
  const motionScriptsReady = new Promise(resolve => { releaseMotionScripts = resolve; });
  await motionChangePage.route('**/_next/static/**/*.js', async route => { await motionScriptsReady; await route.continue(); });
  await motionChangePage.goto(`${base}/sign-in`, { waitUntil: 'commit' });
  await motionChangePage.locator('.boot-loader').waitFor({ state: 'visible' });
  await motionChangePage.waitForFunction(() => Number(document.documentElement.dataset.bootVisualStarted) > 0);
  releaseMotionScripts();
  await motionChangePage.waitForFunction(() => globalThis.__idealabReducedMotionListenerAttached === true, null, { timeout: 1800 });
  assert.equal(await motionChangePage.locator('html').getAttribute('data-boot'), 'loading', 'Preference changes are tested while the loader is still active');
  await motionChangePage.emulateMedia({ reducedMotion: 'reduce' });
  await motionChangePage.waitForFunction(() => !document.documentElement.hasAttribute('data-boot'), null, { timeout: 1200 });
  assert.equal(await motionChangePage.locator('#site-content').evaluate(element => element.inert), false, 'Switching to reduced motion during the intro immediately releases page interaction');
  assert.equal(await motionChangePage.locator('.boot-loader').evaluate(element => getComputedStyle(element).display), 'none', 'Switching to reduced motion during the intro removes the overlay');
  await motionChangeContext.close();

  const slowLoaderContext = await browser.newContext();
  const slowLoaderPage = await slowLoaderContext.newPage();
  let releaseSlowScripts;
  const slowScriptsReady = new Promise(resolve => { releaseSlowScripts = resolve; });
  await slowLoaderPage.route('**/_next/static/**/*.js', async route => { await slowScriptsReady; await route.continue(); });
  await slowLoaderPage.goto(base, { waitUntil: 'commit' });
  await slowLoaderPage.locator('.boot-loader').waitFor({ state: 'visible' });
  await slowLoaderPage.waitForFunction(() => Number(document.documentElement.dataset.bootVisualStarted) > 0);
  await slowLoaderPage.waitForTimeout(760);
  const slowReleaseAt = Date.now();
  releaseSlowScripts();
  await slowLoaderPage.waitForFunction(() => document.documentElement.dataset.boot === 'leaving');
  assert(Date.now() - slowReleaseAt < 1600, 'A delayed hydration completes within the remaining branded motion sequence');
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
  const watchdogStart = await watchdogPage.evaluate(() => Number(document.documentElement.dataset.bootStarted));
  await watchdogPage.waitForFunction(() => !document.documentElement.hasAttribute('data-boot'), { timeout: 3500 });
  const noHydrationElapsed = await watchdogPage.evaluate(start => performance.now() - start, watchdogStart);
  assert(noHydrationElapsed < 3200, `The inline fallback releases the boot overlay promptly without hydration (${Math.round(noHydrationElapsed)} ms)`);
  assert.equal(await watchdogPage.locator('#site-content').evaluate(element => element.inert), false, 'The no-hydration watchdog always releases page inertness');
  await watchdogPage.keyboard.press('Tab');
  assert(await watchdogPage.getByRole('link', { name: 'Skip to content' }).evaluate(element => element === document.activeElement), 'Keyboard navigation resumes after the no-hydration watchdog');
  await watchdogPage.locator('.maker-ticker-content').focus();
  assert.equal(await watchdogPage.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused', 'Keyboard focus can pause the ticker without hydration');
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
  await revisitPage.locator('.maker-ticker-content').focus();
  assert.equal(await revisitPage.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
  await revisitPage.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());
  assert.equal(await revisitPage.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'running', 'Ticker resumes after keyboard focus leaves');
  const tickerGeometry = () => revisitPage.evaluate(() => [
    '.maker-ticker-region', '.hero',
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
  await revisitPage.getByRole('navigation', { name: 'Mobile primary navigation' }).getByRole('link', { name: 'Lab', exact: true }).click();
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
  assert.equal(await noScriptPage.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationName), 'none', 'Ticker text stays still without JavaScript');
  const topStaticItems = noScriptPage.locator('.maker-ticker-content .ticker-run').first().locator('.ticker-item');
  assert.deepEqual(await topStaticItems.allTextContents(), ['AICTE × COGNICOR × MEC', 'Established in 2022', 'Engage · Explore · Experience · Express · Excel', 'From idea to prototype', 'Workshops · Training · Multidisciplinary STEM'], 'No-JavaScript visitors can read every top ticker highlight');
  assert.equal(await noScriptPage.locator('.ticker-run').nth(1).evaluate(element => getComputedStyle(element).display), 'none', 'Static tickers hide the duplicated visual copy');
  await noScriptPage.setViewportSize({ width: 320, height: 667 });
  assert(await noScriptPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Static no-JavaScript ticker rows have no horizontal overflow at 320px');
  await noScriptPage.screenshot({ path: 'artifacts/acceptance/home-tickers-nojs-320.png' });
  await noScriptPage.setViewportSize({ width: 375, height: 667 });
  assert(await noScriptPage.getByRole('navigation', { name: 'Mobile primary navigation' }).isVisible(), 'Mobile destinations remain available without JavaScript');
  await noScriptPage.getByRole('navigation', { name: 'Mobile primary navigation' }).getByRole('link', { name: 'Lab', exact: true }).click();
  await noScriptPage.waitForURL(`${base}/lab`);
  assert.equal(await noScriptPage.getByRole('navigation', { name: 'Mobile primary navigation' }).getByRole('link', { name: 'Lab', exact: true }).getAttribute('aria-current'), 'page', 'Server-rendered mobile navigation marks the current page without JavaScript');
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
    assert.equal(await page.locator('.hero-machine-photo img').count(), 1, 'Hero yellow card features the local Snapmaker machine photo');
    assert.equal(await page.locator('.machine-drawing').count(), 0, 'Hero yellow card no longer contains the machine illustration SVG');
    assert.match(await page.locator('.hero-machine-photo').textContent(), /Snapmaker A350T.*3D PRINTING.*LASER.*CNC/s, 'Hero photo caption names the machine and its functions');
    assert.equal(await page.locator('.try-poster').count(), 1, 'Homepage uses the oversized editorial question poster');
    assert.equal(await page.locator('.ideas-event-card').count(), 1, 'The ideas section pairs the poster with the event archive carousel');
    assert.match(await page.locator('#possibilities-title').textContent(), /Less.*what if.*More.*let’s.*try/s, 'The poster preserves the confirmed IDEA Lab headline');
    assert(await page.locator('.poster-headline').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Editorial heading fits its poster at ${width}px`);
    assert(await page.locator('.about-mark').getByText('IDEA', { exact: false }).count() === 1, 'IDEA Lab lockup remains beside the about copy');
    assert.equal(await page.locator('.path-card').count(), 3, 'Homepage offers three clear activity paths');
    for (const card of await page.locator('.path-card').all()) {
      assert(await card.getByRole('heading', { level: 3 }).isVisible(), 'Each activity card has a visible title');
      assert((await card.locator('p').textContent())?.trim(), 'Each activity card explains its purpose');
      assert(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Activity card fits within the ${width}px layout`);
    }
    if (width === 1440) {
      const firstTimelineStep = page.locator('.journey-steps li[data-reveal="timeline-step"]').first();
      await firstTimelineStep.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const step = document.querySelector('.journey-steps li[data-reveal="timeline-step"]');
        return Boolean(step?.getAnimations().some(animation => animation.playState === 'running'));
      }, null, { timeout: 2000 });
      assert(await firstTimelineStep.evaluate(element => element.getAnimations().some(animation => animation.playState === 'running')), 'Scrolling to the process timeline starts its reveal animation');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      for (const card of await page.locator('.path-card').all()) {
        await page.mouse.move(0, 0);
        await page.waitForTimeout(300);
        const before = await card.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color, transform: getComputedStyle(element).transform }));
        await card.hover();
        await page.waitForTimeout(300);
        const after = await card.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color, transform: getComputedStyle(element).transform }));
        assert.equal(after.background, before.background, 'Path-card hover preserves the background color');
        assert.equal(after.color, before.color, 'Path-card hover preserves the text color');
        assert.notEqual(after.transform, before.transform, 'All three path cards move on hover');
        await page.mouse.move(0, 0);
        await page.waitForTimeout(300);
        const beforeFocus = await card.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color, transform: getComputedStyle(element).transform }));
        const cardLink = card.locator('.card-link');
        await cardLink.focus();
        await page.waitForTimeout(300);
        const afterFocus = await card.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, color: getComputedStyle(element).color, transform: getComputedStyle(element).transform }));
        assert.equal(afterFocus.background, beforeFocus.background, 'Path-card focus preserves the background color');
        assert.equal(afterFocus.color, beforeFocus.color, 'Path-card focus preserves the text color');
        assert.notEqual(afterFocus.transform, beforeFocus.transform, 'All three path cards move on keyboard focus');
        await cardLink.evaluate(element => element.blur());
      }
      await page.mouse.move(0, 0);
    }
    const labTicker = page.getByRole('region', { name: 'IDEA Lab highlights' });
    const quoteTicker = page.getByRole('region', { name: 'Ideas to keep you making' });
    assert.equal(await quoteTicker.count(), 1, 'A second quote ribbon appears before the footer');
    assert.equal(await quoteTicker.locator('.ticker-run').first().locator('.ticker-item').count(), 3, 'The lower ribbon contains three original lab mottos');
    assert.equal(await quoteTicker.locator('.ticker-track').evaluate(element => getComputedStyle(element).animationName), 'idealab-ticker-marquee', 'The quote ribbon has automatic movement');
    if (width === 1440) {
      await quoteTicker.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const before = await quoteTicker.locator('.ticker-track').evaluate(element => getComputedStyle(element).transform);
      await page.waitForTimeout(160);
      assert.notEqual(await quoteTicker.locator('.ticker-track').evaluate(element => getComputedStyle(element).transform), before, 'The quote ribbon visibly advances over time');
      await quoteTicker.locator('.quote-ticker-content').focus();
      assert.equal(await quoteTicker.locator('.ticker-track').evaluate(element => getComputedStyle(element).animationPlayState), 'paused', 'Keyboard focus pauses the quote ribbon');
      await page.evaluate(() => document.activeElement?.blur());
    }
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    assert.equal(await labTicker.count(), 1, 'Homepage has one labelled institutional highlights ticker');
    assert.equal(await page.locator('.site-header .brand-wordmark').count(), 1, 'The site header retains the official IDEALAB MEC wordmark');
    assert.equal(await labTicker.locator('.ticker-item').first().textContent(), 'AICTE × COGNICOR × MEC');
    assert.equal(await labTicker.locator('.ticker-separator').first().textContent(), '\\\\', 'Top ticker facts are divided by the requested double-slash marker');
    assert.equal(await labTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationName), 'idealab-ticker-marquee', 'Top highlights move on the marquee track');
    assert.equal(await labTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationDirection), 'reverse', 'Top highlights advance toward the right');
    assert.notEqual(await labTicker.locator('.maker-ticker-band').evaluate(element => getComputedStyle(element).transform), 'none', 'Top highlights band is tilted');
    assert.equal(await labTicker.locator('.maker-ticker-band').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(0, 0, 0)', 'Top highlights band uses black');
    assert.equal(await labTicker.locator('.maker-ticker-band').evaluate(element => getComputedStyle(element).color), 'rgb(255, 224, 41)', 'Top ticker text uses yellow');
    const publicHeaderBox = await page.locator('.site-header').boundingBox();
    const topTickerBox = await labTicker.boundingBox();
    assert(publicHeaderBox && topTickerBox && topTickerBox.y >= publicHeaderBox.y + publicHeaderBox.height - 1, 'Top carousel appears after the public navigation/header');
    assert.equal(await page.locator('.ticker-motion-control').count(), 0, 'The ticker has no unwanted pause button');
    assert.equal(await page.locator('.past-event-slide').count(), 4, 'The event carousel contains four archive cards');
    const eventWindow = await page.locator('.event-carousel-window').boundingBox();
    const activeEventImage = await page.locator('.past-event-slide[aria-hidden="false"] .event-slide-image').boundingBox();
    assert(eventWindow && activeEventImage && activeEventImage.x < eventWindow.x + eventWindow.width && activeEventImage.x + activeEventImage.width > eventWindow.x, 'The active event image remains inside the visible carousel window');
    assert.deepEqual(await page.locator('.past-event-slide h3').allTextContents(), ['TRIAD', 'ARDUIGNITE', 'Technical training for school students', 'TinyML hands-on workshop'], 'Carousel labels remain attached to their existing events');
    assert.deepEqual(await page.locator('.past-event-slide .event-slide-date').allTextContents(), ['10 SEP 2025', '02 AUG 2025', '04 AUG 2024', '22 AUG 2023'], 'Carousel dates remain unchanged');
    const eventImageSources = await page.locator('.past-event-slide img').evaluateAll(images => images.map(image => new URL(image.getAttribute('src'), location.href).searchParams.get('url')));
    assert.deepEqual(eventImageSources, ['/events/triad.jpeg', '/events/arduignite.jpeg', '/events/robotics-training.jpg', '/events/raspberry-pi-workshop.jpg'], 'Only archive carousel images three and four use the clearer alternate photos');
    assert.equal(await page.locator('.past-event-carousel button[aria-label*="Pause"]').count(), 0, 'The event carousel has no pause control');
    assert(await page.locator('.facility-headline').evaluate(element => getComputedStyle(element).fontFamily.toLowerCase().includes('editorial')), 'The sketch-to-object headline uses the new local Bricolage display face');
    assert(await page.locator('.playful-site').evaluate(element => getComputedStyle(element).backgroundImage.includes('linear-gradient') && !getComputedStyle(element).backgroundImage.includes('radial-gradient')), 'Notebook cross grid replaces dotted page background');
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await loadPageImages(page);
    assert(await page.locator('img').evaluateAll(images => images.length >= 2 && images.every(image => image.complete && image.naturalWidth > 0)), 'Every displayed logo/image must load');
    for (const captureTarget of [page.locator('.try-poster'), page.locator('.ideas-event-card'), page.locator('.about-section')]) {
      await captureTarget.scrollIntoViewIfNeeded();
      await page.waitForTimeout(560);
      await captureTarget.evaluate(element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined))));
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.hero-copy').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No horizontal overflow at ${width}px`);
    await page.screenshot({ path: `artifacts/acceptance/home-${width}.png`, fullPage: true });
    await page.locator('.editorial-posters').screenshot({ path: `artifacts/acceptance/editorial-posters-${width}.png` });
    await page.locator('.about-section').screenshot({ path: `artifacts/acceptance/about-lockup-${width}.png` });
    if (width === 1440) await page.screenshot({ path: 'artifacts/acceptance/home-hero-1440.png' });
    if (width === 320) {
      const motionViewport = page.locator('.maker-ticker-content');
      await motionViewport.focus();
      assert.equal(await labTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused');
      await page.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());
      assert.equal(await labTicker.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationPlayState), 'running', 'Ticker resumes after focus leaves');
    }
  }
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto(base);
  const eventCarousel = page.locator('.past-event-carousel');
  await eventCarousel.scrollIntoViewIfNeeded();
  const nextEvent = eventCarousel.getByRole('button', { name: 'Next event' });
  await eventCarousel.hover();
  await page.waitForTimeout(7100);
  assert.equal(await eventCarousel.locator('.event-carousel-status').textContent(), '01 / 04', 'Hover pauses event-carousel autoplay');
  await nextEvent.click();
  assert.equal(await eventCarousel.locator('.event-carousel-status').textContent(), '02 / 04', 'Manual controls remain available while autoplay is paused');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(7100);
  assert.equal(await eventCarousel.locator('.event-carousel-status').textContent(), '02 / 04', 'Keyboard focus pauses event-carousel autoplay after the pointer leaves');
  await nextEvent.evaluate(element => element.blur());
  await page.waitForFunction(() => document.querySelectorAll('.past-event-slide')[2]?.getAttribute('aria-hidden') === 'false', null, { timeout: 7600 });
  assert.equal(await eventCarousel.locator('.event-carousel-status').textContent(), '03 / 04', 'Event autoplay resumes after hover and focus end');
  assert(await eventCarousel.locator('.event-carousel-track').evaluate(element => element.style.transform.startsWith('translate3d(200%,')), 'The row-reversed carousel moves the next event toward the right');
  await page.setViewportSize({ width: 320, height: 667 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  assert.equal(await page.locator('.ticker-track').first().evaluate(element => getComputedStyle(element).animationName), 'none', 'Reduced-motion preference keeps homepage ticker text still');
  assert.equal(await page.locator('.quote-ticker-content .ticker-track').evaluate(element => getComputedStyle(element).animationName), 'none', 'Reduced-motion disables the quote ribbon movement');
  const staticQuotes = page.locator('.quote-ticker-content');
  await staticQuotes.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(160);
  assert(await staticQuotes.evaluate(element => element.scrollLeft > 0), 'Keyboard users can scroll all quotes with reduced motion');
  await page.evaluate(() => document.activeElement?.blur());
  await eventCarousel.scrollIntoViewIfNeeded();
  const reducedMotionEventStatus = await eventCarousel.locator('.event-carousel-status').textContent();
  await page.waitForTimeout(7100);
  assert.equal(await eventCarousel.locator('.event-carousel-status').textContent(), reducedMotionEventStatus, 'Reduced-motion preference disables event-carousel autoplay');
  assert.deepEqual(await page.locator('.maker-ticker-content .ticker-run').first().locator('.ticker-item').allTextContents(), ['AICTE × COGNICOR × MEC', 'Established in 2022', 'Engage · Explore · Experience · Express · Excel', 'From idea to prototype', 'Workshops · Training · Multidisciplinary STEM'], 'Reduced-motion visitors can read every top ticker highlight');
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
    assert.equal(await page.locator('.maker-ticker-band').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(215, 255, 0)', 'Dark ticker switches to its bright lime palette');
    assert.equal(await page.locator('.maker-ticker-band').evaluate(element => getComputedStyle(element).color), 'rgb(5, 5, 5)', 'Dark ticker keeps high-contrast black lettering');
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
      const posterLime = document.querySelector('.poster-line-lime');
      const posterPink = document.querySelector('.poster-line-pink');
      const ideaWord = document.querySelector('.about-word-idea');
      const labWord = document.querySelector('.about-word-lab');
      const aboutTitle = document.querySelector('.about-title-cutout');
      return {
        primary: contrast(primary.color, primary.backgroundColor),
        plate: contrast(plate.color, plate.backgroundColor),
        secondary: contrast(getComputedStyle(document.querySelector('.hero-description')).color, canvas.backgroundColor),
        posterLime: contrast(getComputedStyle(posterLime).color, getComputedStyle(posterLime, '::before').backgroundColor),
        posterPink: contrast(getComputedStyle(posterPink).color, getComputedStyle(posterPink, '::before').backgroundColor),
        posterCutout: contrast(getComputedStyle(posterLime.querySelector('.poster-cutout')).color, getComputedStyle(posterLime.querySelector('.poster-cutout')).backgroundColor),
        ideaWord: contrast(getComputedStyle(ideaWord).color, getComputedStyle(ideaWord, '::before').backgroundColor),
        labWord: contrast(getComputedStyle(labWord).color, getComputedStyle(labWord, '::before').backgroundColor),
        aboutTitle: contrast(getComputedStyle(aboutTitle).color, getComputedStyle(aboutTitle, '::before').backgroundColor),
      };
    });
    assert(ratios.primary >= 4.5, `${theme} primary action contrast`);
    assert(ratios.plate >= 4.5, `${theme} accent plate contrast`);
    assert(ratios.secondary >= 4.5, `${theme} secondary copy contrast`);
    for (const role of ['posterLime', 'posterPink', 'posterCutout', 'ideaWord', 'labWord', 'aboutTitle']) {
      assert(ratios[role] >= 3, `${theme} oversized ${role} contrast`);
    }
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
  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile primary navigation' });
  assert(await mobileNavigation.isVisible(), 'Mobile bottom navigation is visible on narrow screens');
  assert.deepEqual(await mobileNavigation.locator('a span').allTextContents(), ['Home', 'Explore', 'Lab', 'Projects', 'Events'], 'Mobile bottom navigation mirrors the primary app destinations');
  assert.equal(await mobileNavigation.evaluate(element => getComputedStyle(element).borderRadius), '28px', 'Mobile bottom navigation uses the rounded reference treatment');
  assert.equal(await mobileNavigation.getByRole('link', { name: 'Home', exact: true }).getAttribute('aria-current'), 'page', 'Home is marked current on the homepage');
  await mobileNavigation.getByRole('link', { name: 'Lab', exact: true }).focus();
  assert(await mobileNavigation.getByRole('link', { name: 'Lab', exact: true }).evaluate(node => node === document.activeElement), 'Bottom navigation remains keyboard accessible');
  await mobileNavigation.getByRole('link', { name: 'Lab', exact: true }).click();
  await page.waitForURL(`${base}/lab`);
  assert.equal(await mobileNavigation.getByRole('link', { name: 'Lab', exact: true }).getAttribute('aria-current'), 'page', 'Bottom navigation identifies the selected route');
  await page.setViewportSize({ width: 1024, height: 768 });
  const desktopNavigation = page.getByRole('navigation', { name: 'Main navigation' });
  await desktopNavigation.waitFor();
  assert.equal(await mobileNavigation.isVisible(), false, 'Mobile bottom navigation hides at desktop widths');
  assert.equal(await desktopNavigation.locator('a[aria-current="page"]').count(), 1, 'Exactly one desktop link identifies the current page');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.setViewportSize({ width: 801, height: 768 });
  await page.setViewportSize({ width: 800, height: 667 });
  assert(await mobileNavigation.isVisible(), 'Mobile bottom navigation remains available at its exact CSS breakpoint');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: 'artifacts/acceptance/navigation-mobile-closed.png' });
  await page.goto(base + '/sign-in');
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();
  assert(await page.getByRole('button', { name: /Sign in/ }).isDisabled(), 'Missing config must disable sign-in');
  assert(await page.getByLabel('Email address').isDisabled());
  assert(await page.getByText(/Student account access is being prepared/i).isVisible());
  assert.equal(await page.getByText('Sign-in is unavailable in this release. Contact the lab team for account-access information.', { exact: true }).count(), 0, 'Stale sign-in warning is removed');
  assert(await page.getByRole('link', { name: 'Forgot password?' }).isVisible(), 'Sign-in offers a direct recovery path');
  await page.getByRole('button', { name: 'Create a new account' }).click();
  await page.getByRole('heading', { name: 'Create your account' }).waitFor();
  assert.equal(await page.locator('.auth-grid').getAttribute('data-auth-view'), 'create-account', 'The login card flips to account creation');
  await page.getByRole('button', { name: 'Return to sign in' }).click();
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();
  assert.equal(await page.locator('.public-mobile-nav').count(), 0, 'Auth routes do not inherit the website bottom navigation');
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
        if (route === 'sign-in') {
          assert(await page.getByRole('button', {name:'Continue with Google'}).isDisabled(), 'Unverified Google activation stays disabled');
          assert(await contrastAgainst(page, '.auth-label-row a', '.auth-card') >= 4.5, 'The recovery link is readable against the sign-in card in both themes');
        } else {
          assert(await page.getByRole('heading', { name: 'Create your account' }).isVisible(), 'Signup explains that account access is still gated');
          assert.equal(await page.locator('.auth-signup-preview input:disabled').count(), 2, 'The signup layout shows gated email and password fields');
          assert(await page.getByRole('button', { name: 'Create account', exact: true }).isDisabled(), 'Account creation cannot be submitted while the member gate is off');
          assert.equal(await page.locator('.auth-signup-preview input[name]:not([type="hidden"]):not([name=""])').count(), 2, 'Gated real signup retains its email/password input names');
          assert.notEqual(await page.locator('.auth-signup-preview').getAttribute('action'), null, 'The form is wired to the real signup action while activation stays gated');
        }
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
  await page.getByRole('heading', { name: 'Create your account' }).waitFor();
  assert(await page.getByRole('button', { name: 'Create account', exact: true }).isDisabled(), 'Registration remains gated until the shared backend passes validation');
  assert.equal(await page.getByText(/contact the lab team/i).count(), 0, 'Signup does not redirect account creation to a contact link');
  await page.getByRole('button', { name: 'Return to sign in' }).click();
  await page.getByRole('heading', { name: 'Sign in' }).waitFor();
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
  assert(await page.getByText(/intended for the account owner.*shared database privacy permissions still need validation/i).isVisible(), 'The preview distinguishes intended profile privacy from unverified database permissions');
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
  const labDestinations = { Overview: 'lab', Requests: 'requests', Borrowing: 'borrowing', Events: 'events', Visits: 'visits', Projects: 'projects' };
  const profileDestinations = { 'Your details': 'profile', Settings: 'settings' };
  async function assertStudentNavigation(screen) {
    const primary = page.getByRole('navigation', { name: 'Primary workspace navigation', exact: true });
    assert(await primary.isVisible(), `${screen} keeps primary navigation visible`);
    assert.deepEqual(await primary.getByRole('link').allTextContents(), ['Home', 'Lab', 'Profile'], 'The workspace has exactly three primary destinations');
    const group = Object.values(labDestinations).includes(screen) ? 'lab' : Object.values(profileDestinations).includes(screen) ? 'profile' : 'home';
    assert.equal(await primary.locator('a[aria-current]').count(), 1, `${screen} identifies one primary group`);
    for (const id of ['home', 'lab', 'profile']) {
      const link = primary.getByRole('link', { name: id[0].toUpperCase() + id.slice(1), exact: true });
      assert.equal(await link.getAttribute('href'), `/design/student?screen=${id}`);
      assert.equal(await link.getAttribute('aria-current'), group === id ? screen === id ? 'page' : 'location' : null, `${screen} distinguishes the current page from its parent group`);
    }
    const contextual = group === 'lab' ? labDestinations : group === 'profile' ? profileDestinations : null;
    assert.equal(await page.locator('.member-context-bar nav').count(), contextual ? 1 : 0, `${screen} exposes contextual navigation only for Lab or Profile`);
    if (contextual) {
      const contextNav = page.getByRole('navigation', { name: `${group === 'lab' ? 'Lab' : 'Profile'} pages`, exact: true });
      assert.deepEqual(await contextNav.getByRole('link').allTextContents(), Object.keys(contextual), `${screen} exposes the complete contextual hierarchy`);
      assert.equal(await contextNav.locator('a[aria-current="page"]').count(), 1, `${screen} marks its exact contextual destination`);
      for (const [label, id] of Object.entries(contextual)) {
        const link = contextNav.getByRole('link', { name: label, exact: true });
        assert(await link.isVisible(), `${label} remains directly reachable without a menu`);
        assert.equal(await link.getAttribute('href'), `/design/student?screen=${id}`);
        assert.equal(await link.getAttribute('aria-current'), screen === id ? 'page' : null);
      }
    }
    assert.equal(await page.locator('.member-notifications').getAttribute('aria-current'), screen === 'notifications' ? 'page' : null, 'Notifications has its own exact selected state');
    assert.equal(await page.locator('.member-sidebar, .student-preview-sidebar, .student-preview-sidebar-toggle, .student-preview-mobile-nav, .member-mobile-more, .member-mobile-more-links').count(), 0, 'No sidebar, bottom rail or More menu remains');
  }
  const studentDataRequests = [];
  page.on('request', request => {
    if (/supabase\.co|\/rest\/v1(?:\/|\?|$)|\/api\//i.test(request.url())) studentDataRequests.push(request.url());
  });
  const skeletonContext = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const skeletonPage = await skeletonContext.newPage();
  const skeletonDataRequests = [];
  skeletonPage.on('request', request => {
    if (/supabase\.co|\/rest\/v1(?:\/|\?|$)|\/api\//i.test(request.url())) skeletonDataRequests.push(request.url());
  });
  await skeletonPage.goto(base + '/design/student?loading=true');
  await skeletonPage.getByRole('heading', { name: 'While your space opens.', exact: true }).waitFor();
  await skeletonPage.waitForFunction(() => !document.documentElement.dataset.boot, null, { timeout: 5000 });
  assert.equal(await skeletonPage.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow', 'Member loading preview stays out of search results');
  const memberSkeletons = skeletonPage.locator('.member-loading[role="status"][aria-busy="true"]');
  assert.equal(await memberSkeletons.count(), 9, 'Preview renders the route fallback and each Home/Lab data-panel skeleton');
  assert.deepEqual(await memberSkeletons.allTextContents(), [
    'Loading your workspace.',
    'Loading the lab opening status.', 'Loading your lab visits.', 'Loading the event programme.', 'Loading your projects.',
    'Loading the lab opening status.', 'Loading your lab visits.', 'Loading the event programme.', 'Loading your projects.',
  ], 'Every skeleton announces only its truthful loading state');
  assert.equal(await skeletonPage.locator('.member-loading__visual[aria-hidden="true"]').count(), 9, 'Decorative skeleton blocks are hidden from assistive technology');
  assert.equal(await skeletonPage.locator('.member-loading__line').first().evaluate(element => getComputedStyle(element).animationName), 'member-loading-shimmer', 'Skeleton shimmer is enabled when motion is allowed');
  const projectSkeletonGrids = skeletonPage.locator('.member-loading--projects .member-loading__project-grid');
  assert.equal(await projectSkeletonGrids.count(), 2, 'Home and Lab project panel skeletons use the loaded project-card layout');
  for (const grid of await projectSkeletonGrids.all()) {
    assert.equal(await grid.locator('.member-loading__project-card').count(), 3, 'Project panel reserves space for the three recent project cards');
  }
  for (const theme of ['light', 'dark']) {
    await setTheme(skeletonPage, theme);
    for (const width of [320, 390, 700, 701, 768, 1440]) {
      await skeletonPage.setViewportSize({ width, height: width < 500 ? 800 : 950 });
      assert(await skeletonPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${theme} member skeleton preview fits ${width}px`);
      assert(await memberSkeletons.first().isVisible(), `${theme} route skeleton remains visible at ${width}px`);
      const expectedProjectColumns = width <= 700 ? 1 : 2;
      for (const grid of await projectSkeletonGrids.all()) {
        const columnCount = await grid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
        assert.equal(columnCount, expectedProjectColumns, `${theme} project skeleton uses ${expectedProjectColumns} card column(s) at ${width}px`);
      }
    }
    await skeletonPage.setViewportSize({ width: theme === 'light' ? 390 : 1440, height: 900 });
    await skeletonPage.screenshot({ path: `artifacts/acceptance/member-skeletons-${theme}-${theme === 'light' ? 'mobile' : 'desktop'}.png`, fullPage: true, animations: 'disabled' });
  }
  await skeletonPage.emulateMedia({ reducedMotion: 'reduce' });
  assert(await skeletonPage.locator('.member-loading__line').evaluateAll(elements => elements.every(element => getComputedStyle(element).animationName === 'none')), 'Skeleton shimmer is disabled for reduced-motion users');
  assert.deepEqual(skeletonDataRequests, [], 'Loading-state preview makes no live API or Supabase requests');
  await skeletonContext.close();
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto(base + '/design/student?screen=home');
  await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow', 'Student workspace layout stays out of search results');
  assert(await page.getByRole('status').getByText('DESIGN PREVIEW · NO LIVE DATA').isVisible(), 'Student preview states that records are not connected');
  await page.waitForFunction(() => document.querySelector('.student-preview-welcome')?.getAnimations().some(animation => animation.playState === 'running'));
  await assertStudentNavigation('home');
  assert(await page.evaluate(() => document.querySelector('.member-main-column').getBoundingClientRect().top >= document.querySelector('.member-topbar').getBoundingClientRect().bottom - 1), 'Desktop workspace content follows the top navigation');
  await page.setViewportSize({ width: 761, height: 900 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Top navigation keeps the tablet workspace within the viewport');
  await assertStudentNavigation('home');
  await page.setViewportSize({ width: 1440, height: 900 });
  assert(await page.locator('.member-notifications').isVisible(), 'Notification shortcut remains visible in the top-right controls');
  assert(await page.locator('.member-topbar-actions').evaluate(element => element.querySelector('.theme-toggle').compareDocumentPosition(element.querySelector('.member-notifications')) & Node.DOCUMENT_POSITION_FOLLOWING), 'Notifications remains the rightmost top-bar action');
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
  await page.locator('.member-notifications').click();
  await page.getByRole('heading', { name: studentScreens.notifications, exact: true }).waitFor();
  assert.match(page.url(), /screen=notifications$/, 'Top-right notifications shortcut opens the notification destination');
  await assertStudentNavigation('notifications');
  await page.getByRole('navigation', { name: 'Primary workspace navigation', exact: true }).getByRole('link', { name: 'Lab', exact: true }).click();
  await page.getByRole('heading', { name: studentScreens.lab, exact: true }).waitFor();
  await page.getByRole('navigation', { name: 'Lab pages', exact: true }).getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('heading', { name: studentScreens.projects, exact: true }).waitFor();
  assert.match(page.url(), /screen=projects$/, 'Lab contextual links navigate to their own review screen');
  for (const [screen, title] of Object.entries(studentScreens)) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/design/student?screen=${screen}`);
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    await assertStudentNavigation(screen);
    assert.equal(await page.locator('form').count(), 0, `${screen} preview exposes no real submission form`);
    assert.equal(await page.locator('.theme-toggle').count(), 1, `${screen} keeps one functional theme control`);
    assert.equal(await page.locator('.member-notifications').count(), 1, `${screen} keeps the top-right notification destination available`);
    assert(await page.getByRole('status').getByText('DESIGN PREVIEW · NO LIVE DATA').isVisible(), `${screen} explains that it contains no live data`);
    if (screen === 'projects') assert(await page.getByText('Project names, teams and membership requests are not loaded in this preview.').isVisible());
    if (screen === 'events') assert(await page.getByText(/No event records or registration status are available/).isVisible());
    if (screen === 'requests') assert(await page.getByText(/cannot create, submit, reserve or track a real request/).isVisible());
    if (screen === 'notifications') assert(await page.getByText(/No message, request update or event reminder/).isVisible());
    if (screen === 'settings') {
      assert(await page.getByRole('heading', { name: 'Choose a comfortable view' }).isVisible(), 'Settings preview explains the working theme preference');
      assert(await page.getByRole('heading', { name: 'Account privacy under review' }).isVisible(), 'Settings preview identifies the profile privacy review');
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
      await assertStudentNavigation(screen);
      assert(await page.locator('.member-notifications').isVisible(), `${screen} retains top-right notifications at ${width}px`);
      assert(await page.locator('.member-primary-nav a, .member-context-bar a').evaluateAll(links => links.every(link => { const rect = link.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidth + 1; })), `${screen} navigation retains visible 44px touch targets at ${width}px`);
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
      await page.waitForFunction(() => document.querySelector('.theme-toggle')?.getAttribute('aria-pressed') === 'true', null, { timeout: 5000 });
      assert.equal(await page.locator('.theme-toggle').getAttribute('aria-pressed'), 'true', 'System-dark preference is reflected in the toggle');
      assert.equal(await page.locator('.student-preview-note-self-declared').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'System-dark pilot note uses near-black without an explicit saved theme');
      assert.equal(await page.locator('.student-preview-note-request').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(11, 11, 11)', 'System-dark timing note uses near-black without an explicit saved theme');
      assert(await contrastAgainst(page, '.student-preview-note-self-declared p:last-child', '.student-preview-note-self-declared') >= 4.5, 'System-dark pilot note body remains readable');
      await page.emulateMedia({ colorScheme: 'light' });
      await page.reload();
      await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'system', 'First visit remains on system theme when OS preference changes');
      await page.waitForFunction(() => document.querySelector('.theme-toggle')?.getAttribute('aria-pressed') === 'false', null, { timeout: 5000 });
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
    const studentFooter = await page.locator('.student-preview-footer').boundingBox();
    assert(studentFooter && studentFooter.y >= 0 && studentFooter.y + studentFooter.height <= page.viewportSize().height + 1, `${screen} footer remains visible at the document end without a bottom-navigation overlay`);
  }
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto(base + '/design/student?screen=home');
  await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
  await setTheme(page, 'light');
  await assertStudentNavigation('home');
  const homeNav = page.locator('.member-primary-nav > a[aria-current="page"]');
  assert.equal(await homeNav.innerText(), 'Home', 'Mobile navigation marks its current anchor');
  assert(await homeNav.evaluate(element => element.getBoundingClientRect().height >= 44), 'Mobile navigation links meet minimum touch height');
  for (const selector of ['.theme-toggle', '.member-notifications']) {
    const bounds = await page.locator(selector).boundingBox();
    const minimum = selector === '.theme-toggle' ? 48 : 44;
    assert(bounds && bounds.width >= minimum && bounds.height >= minimum, `${selector} meets its ${minimum}px mobile touch-target goal`);
  }
  await page.screenshot({ path: 'artifacts/acceptance/student-workspace-home-mobile.png', fullPage: false, animations: 'disabled' });
  const mobileLabLink = page.getByRole('navigation', { name: 'Primary workspace navigation', exact: true }).getByRole('link', { name: 'Lab', exact: true });
  await mobileLabLink.focus();
  assert(await mobileLabLink.evaluate(element => element === document.activeElement), 'Keyboard users can focus the top-level Lab link');
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: studentScreens.lab, exact: true }).waitFor();
  await assertStudentNavigation('lab');
  const borrowingLink = page.getByRole('navigation', { name: 'Lab pages', exact: true }).getByRole('link', { name: 'Borrowing', exact: true });
  await borrowingLink.focus();
  assert(await borrowingLink.evaluate(element => element === document.activeElement), 'Keyboard users can focus contextual destinations directly');
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: studentScreens.borrowing, exact: true }).waitFor();
  await assertStudentNavigation('borrowing');
  await page.screenshot({ path: 'artifacts/acceptance/student-workspace-lab-borrowing-mobile.png', fullPage: false, animations: 'disabled' });
  await page.goBack();
  await page.getByRole('heading', { name: studentScreens.lab, exact: true }).waitFor();
  await assertStudentNavigation('lab');
  await page.goBack();
  await page.getByRole('heading', { name: studentScreens.home, exact: true }).waitFor();
  await assertStudentNavigation('home');
  assert.equal(await page.locator('.member-context-bar').count(), 0, 'Browser Back restores Home without stale Lab contextual links');
  await page.goto(base + '/design/student?screen=profile');
  await page.getByRole('heading', { name: studentScreens.profile, exact: true }).waitFor();
  assert(await page.getByRole('link', { name: 'Workspace settings' }).isVisible(), 'Mobile users can reach settings from their Profile destination');
  assert.equal(await page.locator('.student-preview-field-plan li').count(), 6, 'Profile preview documents the six required fields');
  assert.equal(await page.locator('.student-preview-edit-field').count(), 6, 'Profile page includes a six-field edit layout');
  assert(await page.getByText(/No ownership or duplicate check is represented here/).isVisible(), 'Profile preview does not imply independently verified MEC ownership');
  await page.getByRole('link', { name: 'Workspace settings' }).click();
  await page.getByRole('heading', { name: studentScreens.settings, exact: true }).waitFor();
  await assertStudentNavigation('settings');
  await page.getByRole('navigation', { name: 'Profile pages', exact: true }).getByRole('link', { name: 'Your details', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: studentScreens.profile, exact: true }).waitFor();
  await assertStudentNavigation('profile');
  await page.goBack();
  await page.getByRole('heading', { name: studentScreens.settings, exact: true }).waitFor();
  await assertStudentNavigation('settings');
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
  assert.match(await page.getByRole('status').innerText(), /Draft saved for this preview session.*It has not been sent to the lab/);
  const originalAccountKey = 'idealab-mec:request-draft:v1:design-preview';
  assert.equal(await page.evaluate(key => localStorage.getItem(key), originalAccountKey), null, 'Preview draft is not persisted in local storage');
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), originalAccountKey), null, 'Preview draft is not persisted in session storage');
  await page.getByRole('link', { name: 'Return to work requests' }).click();
  await page.getByRole('heading', { name: 'Sample prototype fixture', exact: true }).waitFor();
  assert(await page.getByText('BROWSER DRAFT', { exact: true }).isVisible());
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
  await referenceField.fill('https://xn--/');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Save for later', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'request-references');
  assert.equal(await referenceField.getAttribute('aria-invalid'), 'true', 'Saving from another step opens and focuses the invalid reference');
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
  assert.equal((await fetch(offBase + '/design/project-create')).status, 404, 'Project design preview must be unavailable when disabled');
  assert.equal((await fetch(offBase + '/design/requests')).status, 404, 'Request workspace preview must be unavailable when disabled');
  assert.equal((await fetch(offBase + '/design/onboarding')).status, 404, 'Onboarding design preview must be unavailable when disabled');
  assert.equal((await fetch(offBase + '/design/student')).status, 404, 'Student workspace design preview must be unavailable when disabled');
  assert.equal((await fetch(offBase + '/design/workspace')).status, 404, 'Staff workspace design preview must be unavailable when disabled');
  const recoveryPort = await availablePort();
  const recoveryBase = `http://127.0.0.1:${recoveryPort}`;
  let recoveryOutput = '';
  recoveryConfigServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(recoveryPort)], { env: { ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://configuration-fixture.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_configuration_fixture', ENABLE_MEMBER_PLATFORM: 'true', ENABLE_MEMBER_PLATFORM_PRODUCTION: 'false', ENABLE_MEMBER_PLATFORM_TEST: 'true', ACCOUNT_ENVIRONMENT: 'test', AUTH_SITE_URL: recoveryBase, ENABLE_GOOGLE_SIGN_IN: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
    assert(await page.locator('form input:disabled').count() > 0, `${route} remains disabled until the recovery session boundary is verified`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} configuration fixture has no horizontal overflow at 320px`);
    if (route === 'reset-password') {
      assert.equal(await page.locator('input[name="new_password"]').count(), 1);
      assert.equal(await page.locator('input[name="confirm_password"]').count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Show password' }).count(), 2, 'Both password fields have keyboard-operable visibility toggles');
    } else {
      assert(await page.getByLabel('Email address').isDisabled());
    }
  }
  for (const route of ['sign-in', 'sign-up', 'confirm-email']) {
    for (const theme of ['light', 'dark']) {
      for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1366, height: 768 }]) {
        await page.setViewportSize(viewport);
        const rendered = await page.goto(`${recoveryBase}/${route}`);
        await setTheme(page, theme);
        assert.match(rendered.headers()['cache-control'] ?? '', /private, no-store/, 'Account entry is never publicly cached');
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} enabled layout fits ${viewport.width}px`);
        assert(await page.getByLabel('Email address', { exact: true }).isEnabled(), 'Real form enables only with configured origin and member gate');
        if (route === 'sign-up') {
          assert(await page.getByRole('button', { name: 'Create account', exact: true }).isEnabled());
          assert.equal(await page.locator('#signup-password').getAttribute('minlength'), '8');
          assert(await page.getByRole('button', { name: 'Continue with Google' }).isDisabled(), 'Email signup does not require Google');
        }
        if (viewport.width === 320) await page.screenshot({ path: `artifacts/acceptance/auth-enabled-${route}-${theme}-320.png`, fullPage: true });
      }
    }
  }
  for (const query of ['error=access_denied&next=https://evil.invalid', 'code=a&code=b', 'code=a&sb_flow_id=invalid']) {
    const rejected = await fetch(`${recoveryBase}/auth/confirm?${query}`, { redirect: 'manual' });
    assert.equal(rejected.status, 307);
    assert.equal(rejected.headers.get('referrer-policy'), 'no-referrer');
    assert.match(rejected.headers.get('cache-control') ?? '', /private, no-store/);
    assert.equal(new URL(rejected.headers.get('location')).origin, recoveryBase);
    assert.equal(new URL(rejected.headers.get('location')).pathname, '/confirm-email');
  }
  await page.goto(`${recoveryBase}/sign-up?notice=signup-invalid`);
  assert(await page.getByText('Enter a valid email address and a password of at least 8 characters.').isVisible());
  await page.getByRole('button', { name: 'Return to sign in' }).click();
  await page.waitForURL('**/sign-in');
  await page.getByRole('button', { name: 'Create a new account' }).click();
  await page.waitForURL('**/sign-up');
  await page.reload();
  assert(await page.getByRole('heading', { name: 'Create your account' }).isVisible(), 'Refresh preserves the selected signup card');
  const rejectedRecovery = await fetch(`${recoveryBase}/auth/recovery/callback?error=access_denied&next=https%3A%2F%2Fevil.invalid`, { redirect: 'manual' });
  assert.equal(rejectedRecovery.status, 404, 'Disabled recovery callback exits without contacting Supabase');
  assert.match(rejectedRecovery.headers.get('cache-control') ?? '', /private, no-store/);
  const genericRecovery = await page.goto(`${recoveryBase}/forgot-password?notice=requested`);
  assert(genericRecovery?.ok(), 'Recovery request status page renders');
  assert(await page.getByText(/recovery is paused/i).isVisible(), 'Recovery remains visibly disabled until the security boundary is complete');
  console.log('PASS: public journey, 5 widths in light/dark, login/signup and recovery layouts/themes, palette contrast, no-JavaScript content, scroll/card motion and live reduced-motion cancellation, assets, keyboard navigation, gated onboarding/staff previews, responsive member Home/Lab skeletons in both themes and reduced motion, student module layouts and feature contrast, request drafts, disabled recovery callback, security headers, PWA service-worker registration and offline fallback with member routes uncached.');
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
