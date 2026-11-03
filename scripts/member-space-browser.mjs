import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import assert from 'node:assert/strict';

// Visual preview only: no account fixtures, provider calls or live writes.
const origin = process.env.MEMBER_PREVIEW_ORIGIN || 'http://127.0.0.1:3043';
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const output = resolve(process.cwd(), process.env.MEMBER_SPACE_ARTIFACT_DIR || 'artifacts/member-space');
const outputRelative = relative(process.cwd(), output);
assert.ok(outputRelative && outputRelative !== '..' && !outputRelative.startsWith(`..${sep}`), 'browser artifacts must stay inside the website checkout');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', colorScheme: theme });
    await context.addInitScript(theme => {
      localStorage.setItem('idealab-mec:theme', theme);
      sessionStorage.setItem('idealab-mec:loader-seen:v3', '1');
    }, theme);
    for (const screen of ['home', 'lab', 'profile']) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(`${origin}/design/member-space?screen=${screen}`);
      assert.equal(response.status(), 200, `${screen} returns preview HTML`);
      await page.locator('h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('.member-breadcrumb').count(), 0, 'no preview breadcrumb clutter');
      assert.equal(await page.getByRole('navigation', { name: 'Visual preview screens' }).count(), 0, 'only the primary page navigation remains');
      assert.equal(await page.getByText('Visual preview only.', { exact: true }).count(), 0, 'no preview banner');
      const pageWidth = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        document: document.documentElement.scrollWidth,
        viewport: innerWidth,
        layout: ['.member-main-content', '.workspace-page', '.member-discovery', '.discovery-hero', '.discovery-activity-carousel', '.discovery-activity-carousel__track', '.discovery-activity-slide'].map(selector => {
          const element = document.querySelector(selector);
          if (!element) return { selector, missing: true };
          const rect = element.getBoundingClientRect();
          return { selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, minWidth: getComputedStyle(element).minWidth };
        }),
        elements: [...document.querySelectorAll('body *')].map(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { tag: element.tagName, className: typeof element.className === 'string' ? element.className : '', right: Math.round(rect.right), width: Math.round(rect.width), overflowX: style.overflowX };
        }).filter(element => element.right > innerWidth + 1).slice(0, 8),
      }));
      assert.equal(pageWidth.overflow, false, `${screen} ${width} no horizontal overflow: ${JSON.stringify(pageWidth)}`);
      if (screen === 'home') {
        const carousel = page.getByRole('region', { name: 'Featured activities', exact: true });
        assert.equal(await carousel.getAttribute('aria-roledescription'), 'carousel', 'featured activities are announced as a carousel');
        assert.equal(await carousel.locator('[data-activity-slide]').count(), 3, 'all featured activity slides remain available');
        const previous = page.getByRole('button', { name: 'Previous featured activity' });
        const next = page.getByRole('button', { name: 'Next featured activity' });
        assert.equal(await previous.isDisabled(), true, 'previous is disabled on the first slide');
        assert.equal(await next.isEnabled(), true, 'next is available from the first slide');
        await next.click();
        await page.waitForTimeout(100);
        const scrollState = await carousel.evaluate(node => ({ scrollLeft: node.scrollLeft, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, slides: [...node.querySelectorAll('[data-activity-slide]')].map(slide => ({ left: slide.getBoundingClientRect().left, width: slide.getBoundingClientRect().width })) }));
        assert.equal(scrollState.scrollLeft > 0, true, `next control moves the slide strip: ${JSON.stringify(scrollState)}`);
        assert.match(await page.locator('.discovery-activity-carousel__count').textContent() ?? '', /02/, `next control updates the active slide: ${JSON.stringify(scrollState)}`);
        await previous.click();
        await page.waitForTimeout(100);
        const returnState = await carousel.evaluate(node => ({ scrollLeft: node.scrollLeft, previousDisabled: document.querySelector('[aria-label="Previous featured activity"]')?.disabled }));
        assert.ok(returnState.scrollLeft <= 1, `previous control returns to the first slide: ${JSON.stringify(returnState)}`);
        assert.match(await page.locator('.discovery-activity-carousel__count').textContent() ?? '', /01/);
        assert.equal(await previous.isDisabled(), true, 'carousel returns to its first slide');
      }
      if (screen === 'lab') {
        assert.equal(await page.locator('.member-lab-quick-access nav a').count(), 6, 'six quick access cards replace the link strip');
        assert.equal(await page.locator('.member-lab-quick-access').count(), 1, 'one quick-access card owns Lab navigation');
        assert.equal(await page.locator('.workspace-grid').count(), 0, 'no repeated destination card grid below quick access');
        assert.equal(await page.locator('.member-context-bar').count(), 0, 'no Lab link strip');
        assert.equal(await page.getByRole('img', { name: /status unknown/ }).count(), 2, 'both utility icons have accessible unknown labels');
        assert.equal(await page.locator('.lab-photo-status svg').count(), 2, 'utility artwork contains only Wi-Fi and electricity symbols');
        assert.equal(await page.locator('.lab-photo-banner').innerText(), 'Your lab.', 'image banner has no visible marketing or utility text');
        assert.equal(await page.locator('#quote-ticker').count(), 1, 'Lab overview includes the matching bottom quote band');
        assert.equal(await page.locator('#quote-ticker .quote-ticker-content').getAttribute('aria-describedby'), 'lab-quotes-copy', 'the visual quote band has an accessible text alternative');
        assert.equal(await page.locator('.member-loading--visits').count(), 0, 'static preview does not pretend to be a pending data request');
        await page.getByRole('heading', { name: 'Start a session', exact: true }).waitFor();
        await page.getByRole('heading', { name: 'Your sessions', exact: true }).waitFor();
        assert.equal(await page.locator('.lab-visits-preview__cards a').count(), 2, 'check-in and history preview actions are visible');
        assert.equal(await page.evaluate(() => {
          const nodes = ['.member-topbar', '#maker-ticker', '.lab-photo-banner', '.member-lab-quick-access', '.member-main-content'];
          const tops = nodes.map(selector => document.querySelector(selector).getBoundingClientRect().top);
          return tops.every((value, index) => !index || value >= tops[index - 1]);
        }), true, 'navigation → carousel → image/status → quick-access card → visit content');
        await page.getByRole('link', { name: 'My sessions', exact: true }).waitFor();
      }
      if (screen === 'profile') {
        await page.getByText(/no public profile has been published here/).waitFor();
        assert.equal(await page.locator('.profile-qr-card__image').count(), 0, 'QR library and image stay unloaded until the card is opened');
        await page.getByRole('button', { name: 'Flip for QR' }).click();
        const qr = page.getByRole('img', { name: 'Sample QR code for this local design preview' });
        await qr.waitFor();
        assert.equal(await qr.evaluate(node => node.complete && node.naturalWidth >= 256), true, 'on-demand QR renders as a real image');
        assert.equal(await page.getByText(/Preview QR only/).count(), 1, 'preview does not claim a live member profile');
        const backToCard = page.getByRole('button', { name: /Back to card/ });
        assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes('Back to card')), true, 'flip moves keyboard focus to the visible back face');
        assert.equal(await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }), true, 'keyboard focus stays in the viewport after flip');
        await backToCard.click();
        await page.waitForFunction(() => document.activeElement?.textContent?.includes('Flip for QR'), null, { timeout: 2000 });
        assert.equal(await page.evaluate(() => document.activeElement?.textContent?.includes('Flip for QR')), true, 'flip restores keyboard focus to the visible front face');
        assert.equal(await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }), true, 'restored keyboard focus stays in the viewport');
      }
      if (width === 390 || width === 1440) {
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], `${screen}/${width}/${theme} axe`);
      }
      assert.deepEqual(errors, [], `${screen} no uncaught browser errors`);
      await page.screenshot({ path: `${output}/${screen}-${width}-${theme}.png`, fullPage: true });
      results.push({ screen, width, theme, horizontalOverflow: false, browserErrors: errors.length });
      await page.close();
    }
    await context.close();
  }
  const motion = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await motion.addInitScript(() => sessionStorage.setItem('idealab-mec:loader-seen:v3', '1'));
  const page = await motion.newPage();
  await page.goto(`${origin}/design/member-space`);
  await page.getByRole('button', { name: 'Pause automatic motion', exact: true }).waitFor();
  const track = page.locator('#maker-ticker .ticker-track');
  assert.equal(await page.locator('#quote-ticker').count(), 1, 'shared landing quote band present');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#maker-ticker .ticker-track')).animationPlayState === 'running');
  const before = await track.evaluate(node => getComputedStyle(node).transform);
  await page.waitForTimeout(250);
  assert.notEqual(await track.evaluate(node => getComputedStyle(node).transform), before, 'ribbon really moves');
  await page.getByRole('button', { name: 'Pause automatic motion', exact: true }).click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#maker-ticker .ticker-track')).animationPlayState === 'paused');
  const still = await page.locator('.auth-ascii canvas').evaluate(node => node.toDataURL());
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.auth-ascii canvas').evaluate(node => node.toDataURL()), still, 'global pause stops canvas');
  await page.getByRole('navigation', { name: 'Primary workspace navigation' }).getByRole('link', { name: 'Lab', exact: true }).click();
  await page.waitForURL(/\/design\/member-space\?screen=lab$/);
  await page.getByRole('heading', { name: 'Your lab.', exact: true }).waitFor({ state: 'attached' });
  const quoteTrack = page.locator('#quote-ticker .ticker-track');
  await quoteTrack.waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#quote-ticker .ticker-track')).animationPlayState === 'paused');
  await page.getByRole('button', { name: 'Resume automatic motion', exact: true }).click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#quote-ticker .ticker-track')).animationPlayState === 'running');
  const quoteBefore = await quoteTrack.evaluate(node => getComputedStyle(node).transform);
  await page.waitForTimeout(250);
  assert.notEqual(await quoteTrack.evaluate(node => getComputedStyle(node).transform), quoteBefore, 'Lab quote band moves when automatic motion is resumed');
  await page.getByRole('button', { name: 'Pause automatic motion', exact: true }).click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#quote-ticker .ticker-track')).animationPlayState === 'paused');
  await motion.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJs.newPage();
  await noJsPage.goto(`${origin}/design/member-space`);
  assert.equal(await noJsPage.locator('h1').count(), 1, 'server-rendered content without JavaScript');
  await noJsPage.getByRole('link', { name: 'Equipment guide' }).waitFor({ state: 'attached' });
  await noJs.close();
  const mobileCases = [
    { width: 360, height: 800, text: 100 }, { width: 375, height: 667, text: 100 },
    { width: 414, height: 896, text: 100 }, { width: 430, height: 932, text: 100 },
    { width: 320, height: 568, text: 200 }, { width: 390, height: 844, text: 200 },
    { width: 600, height: 900, text: 200 },
    { width: 844, height: 390, text: 100 },
  ];
  for (const device of mobileCases) {
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await context.addInitScript(() => sessionStorage.setItem('idealab-mec:loader-seen:v3', '1'));
    const page = await context.newPage();
    for (const screen of ['home', 'lab', 'profile']) {
      await page.goto(`${origin}/design/member-space?screen=${screen}`);
      await page.evaluate(() => document.fonts.ready);
      if (device.text === 200) await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${screen} ${device.width}/${device.text}% text no page overflow`);
      if (screen === 'profile' && device.text === 200) assert.equal(await page.locator('.profile-qr-card').evaluate(card => {
        const host = card.getBoundingClientRect();
        return [...card.querySelectorAll('.profile-qr-card__face')].every(face => face.getBoundingClientRect().bottom <= host.bottom + 1);
      }), true, `${device.width}px large text QR faces do not clip`);
      const targets = page.locator('.member-primary-nav > a, .member-lab-quick-access nav a, .lab-visits-preview__cards a, .discovery-hero-links > a, .discovery-activity-carousel__buttons button, .workspace-presence > a');
      for (const target of await targets.all()) {
        const box = await target.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, `${screen} ${device.width} large touch target`);
      }
      if (device.width === 375 || device.text === 200) await page.screenshot({ path: `${output}/${screen}-${device.width}-text-${device.text}.png`, fullPage: true });
      results.push({ screen, ...device, horizontalOverflow: false, touchTargets: true });
    }
    await context.close();
  }
  const settingsContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await settingsContext.addInitScript(() => {
    localStorage.setItem('idealab-mec:theme', 'light');
    sessionStorage.setItem('idealab-mec:loader-seen:v3', '1');
  });
  const settingsPage = await settingsContext.newPage();
  await settingsPage.goto(`${origin}/design/member-space?screen=profile`);
  const profileNavigation = settingsPage.getByRole('navigation', { name: 'Profile pages', exact: true });
  assert.equal(await profileNavigation.getByRole('link', { name: 'Settings', exact: true }).getAttribute('href'), '/design/member-settings', 'Profile settings opens the redesigned settings preview');
  await profileNavigation.getByRole('link', { name: 'Settings', exact: true }).click();
  await settingsPage.waitForURL('**/design/member-settings');
  await settingsPage.getByRole('heading', { name: 'Make it feel like you.' }).waitFor();
  assert.equal(await settingsPage.getByRole('navigation', { name: 'Profile pages', exact: true }).getByRole('link', { name: 'Settings', exact: true }).getAttribute('aria-current'), 'page', 'Settings remains selected in Profile navigation');
  const primaryNavigation = settingsPage.getByRole('navigation', { name: 'Primary workspace navigation', exact: true });
  await primaryNavigation.getByRole('link', { name: 'Home', exact: true }).click();
  await settingsPage.waitForURL('**/design/member-space?screen=home');
  await settingsPage.getByRole('region', { name: 'Featured activities', exact: true }).waitFor();
  await settingsPage.goBack();
  await settingsPage.waitForURL('**/design/member-settings');
  await primaryNavigation.getByRole('link', { name: 'Lab', exact: true }).click();
  await settingsPage.waitForURL('**/design/member-space?screen=lab');
  await settingsPage.getByRole('heading', { name: 'Your lab.', exact: true }).waitFor();
  await settingsPage.goBack();
  await settingsPage.waitForURL('**/design/member-settings');
  await settingsPage.getByRole('navigation', { name: 'Profile pages', exact: true }).getByRole('link', { name: 'Your details', exact: true }).click();
  await settingsPage.waitForURL('**/design/member-space?screen=profile');
  await settingsPage.getByRole('button', { name: 'Flip for QR' }).waitFor();
  await settingsPage.goBack();
  await settingsPage.waitForURL('**/design/member-settings');
  await settingsPage.goForward();
  await settingsPage.waitForURL('**/design/member-space?screen=profile');
  await settingsPage.getByRole('button', { name: 'Flip for QR' }).waitFor();
  await settingsContext.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ scope: 'Local visual preview, not authenticated persistence or provider E2E', results }, null, 2));
  console.log(`PASS: ${results.length} member visual layouts including touch/landscape/200% text, 12 axe snapshots, featured-carousel controls, ribbon/canvas pause, preview navigation and no-JS content; no live accounts used.`);
} finally { await browser.close(); }
