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
 for (const width of [320, 390, 768, 1024, 1440]) for (const theme of ['light', 'dark']) {
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
      const topNavigation = page.getByRole('navigation', { name: 'Primary workspace navigation', exact: true });
      const mobileNavigation = page.getByRole('navigation', { name: 'Mobile workspace navigation', exact: true });
      if (width <= 850) {
        assert.equal(await topNavigation.isVisible(), false, `${width}px hides the redundant top navigation`);
        assert.equal(await mobileNavigation.isVisible(), true, `${width}px shows the thumb-friendly bottom navigation`);
        assert.equal(await mobileNavigation.getByRole('link').count(), 3, 'bottom navigation has Home, Lab and Profile only');
      } else {
        assert.equal(await topNavigation.isVisible(), true, 'desktop retains the spacious primary navigation');
        assert.equal(await mobileNavigation.isVisible(), false, 'desktop hides the mobile bottom bar');
      }
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
        await page.getByRole('heading', { name: 'Upcoming in the lab.', exact: true }).waitFor();
        assert.equal(await page.locator('.discovery-maker-scene').count(), 1, 'Home hero uses the original maker scene');
        assert.equal(await page.getByRole('img', { name: 'A sketch becoming a 3D printed prototype' }).count(), 1, 'maker illustration has an accessible description');
        for (const removedHeroCopy of ['CURIOUS_MINDS.EXE', '[ IDEA → OBJECT ]', 'One question can open a world.', 'MAKE SOMETHING.']) {
          assert.equal(await page.getByText(removedHeroCopy, { exact: true }).count(), 0, `Home hero removes the previous console copy: ${removedHeroCopy}`);
        }
        assert.equal(await page.locator('.discovery-art-toolbar').count(), 0, 'Home hero no longer shows the console toolbar');
        assert.equal(await page.getByRole('region', { name: 'Upcoming events', exact: true }).getByRole('heading', { name: 'Event cards will appear here.' }).count(), 1, 'preview shows the event-card placement without inventing an event');
        const carousel = page.getByRole('region', { name: 'Featured activities', exact: true });
        assert.equal(await carousel.getAttribute('aria-roledescription'), 'carousel', 'featured activities are announced as a carousel');
        assert.equal(await carousel.locator('[data-activity-slide]').count(), 3, 'all featured activity slides remain available');
        assert.equal(await carousel.locator('.home-pixel-illustration').count(), 3, 'each featured activity has its own original pixel SVG');
        const dots = page.getByRole('group', { name: 'Choose a featured activity' });
        assert.equal(await dots.getByRole('button').count(), 3, 'each activity has a direct, touch-sized carousel indicator');
        assert.equal(await dots.getByRole('button', { pressed: true }).count(), 1, 'one activity indicator is selected at a time');
        if (width >= 1101) {
          const desktopStrip = await carousel.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth, cards: [...node.querySelectorAll('[data-activity-slide]')].map(slide => { const rect = slide.getBoundingClientRect(); return { left: rect.left, right: rect.right }; }), rect: node.getBoundingClientRect().toJSON() }));
          assert.equal(desktopStrip.scroll <= desktopStrip.client + 1, true, `wide screens show the full three-card carousel without clipped cards: ${JSON.stringify(desktopStrip)}`);
          assert.equal(desktopStrip.cards.every(card => card.left >= desktopStrip.rect.left && card.right <= desktopStrip.rect.right + 1), true, 'all activity cards fit edge-to-edge inside the desktop carousel');
        }
        if (width <= 760) assert.equal(await carousel.evaluate(node => node.scrollWidth > node.clientWidth), true, 'phone layout keeps a one-card touch-swipe carousel');
        const previous = page.getByRole('button', { name: 'Previous featured activity' });
        const next = page.getByRole('button', { name: 'Next featured activity' });
        assert.equal(await previous.isDisabled(), true, 'previous is disabled on the first slide');
        assert.equal(await next.isEnabled(), true, 'next is available from the first slide');
        await next.click();
        await page.waitForTimeout(100);
        const scrollState = await carousel.evaluate(node => ({ scrollLeft: node.scrollLeft, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, slides: [...node.querySelectorAll('[data-activity-slide]')].map(slide => ({ left: slide.getBoundingClientRect().left, width: slide.getBoundingClientRect().width })) }));
        if (width < 1101) assert.equal(scrollState.scrollLeft > 0, true, `next control moves the slide strip: ${JSON.stringify(scrollState)}`);
        assert.match(await page.locator('.discovery-activity-carousel__count').textContent() ?? '', /02/, `next control updates the active slide: ${JSON.stringify(scrollState)}`);
        assert.equal(await carousel.locator('[data-activity-slide].is-active').getAttribute('aria-label'), '2 of 3: Connect the dots.', 'the selected card follows the active slide');
        await previous.click();
        await page.waitForTimeout(100);
        const returnState = await carousel.evaluate(node => ({ scrollLeft: node.scrollLeft, previousDisabled: document.querySelector('[aria-label="Previous featured activity"]')?.disabled }));
        assert.ok(returnState.scrollLeft <= 1, `previous control returns to the first slide: ${JSON.stringify(returnState)}`);
        assert.match(await page.locator('.discovery-activity-carousel__count').textContent() ?? '', /01/);
        assert.equal(await previous.isDisabled(), true, 'carousel returns to its first slide');
        if (width === 390) {
          await dots.getByRole('button', { name: /activity 3:/i }).click();
          assert.match(await page.locator('.discovery-activity-carousel__count').textContent() ?? '', /03/, 'activity dots select a card directly');
          await dots.getByRole('button', { name: /activity 1:/i }).click();
          assert.match(await page.locator('.discovery-activity-carousel__count').textContent() ?? '', /01/, 'the first activity can be restored from its dot');
        }
      }
      if (screen === 'lab') {
        assert.equal(await page.locator('.member-lab-quick-access nav a').count(), 3, 'quick access has Make & borrow, Events and Projects');
        assert.equal(await page.locator('.member-lab-quick-access').count(), 1, 'one quick-access card owns Lab navigation');
        assert.deepEqual(await page.locator('.member-lab-quick-access nav a').allTextContents(), ['Make & borrow', 'Events', 'Projects']);
        assert.equal(await page.locator('.member-lab-quick-access nav a').first().getAttribute('href'), '/design/student?screen=make-borrow', 'merged destination opens its combined preview');
        assert.equal(await page.locator('.workspace-grid').count(), 0, 'no repeated destination card grid below quick access');
        assert.equal(await page.locator('.member-context-bar').count(), 0, 'no Lab link strip');
        assert.equal(await page.getByRole('img', { name: /status unknown/ }).count(), 2, 'both utility icons have accessible unknown labels');
        assert.equal(await page.locator('.lab-photo-status svg').count(), 2, 'utility artwork contains only Wi-Fi and electricity symbols');
        assert.equal(await page.locator('.lab-photo-banner .member-signal-art[aria-hidden="true"]').count(), 1, 'ASCII artwork stays decorative');
        const bannerCopy = await page.locator('.lab-photo-banner').evaluate(banner => {
          const copy = banner.cloneNode(true);
          copy.querySelectorAll('.member-signal-art[aria-hidden="true"]').forEach(art => art.remove());
          return copy.textContent.trim();
        });
        assert.equal(bannerCopy, 'Your lab.', 'image banner has no marketing or utility copy');
        assert.equal(await page.locator('#quote-ticker').count(), 1, 'Lab overview includes the matching bottom quote band');
        assert.equal(await page.locator('#quote-ticker .quote-ticker-content').getAttribute('aria-describedby'), 'lab-quotes-copy', 'the visual quote band has an accessible text alternative');
        assert.equal(await page.locator('.member-loading--visits').count(), 0, 'static preview does not pretend to be a pending data request');
        await page.getByRole('heading', { name: 'Your session', exact: true }).waitFor();
        assert.equal(await page.locator('.lab-visits-preview').count(), 1, 'session actions and history share one compact card');
        assert.equal(await page.locator('.lab-visits-preview__actions a').count(), 1, 'one sign-in action serves the visit card');
        assert.equal(await page.locator('.workspace-presence.workspace-card').count(), 1, 'live presence has its own compact card');
        assert.match(await page.locator('.workspace-presence').innerText(), /Who’s here now\?[\s\S]*Live attendance isn’t connected[\s\S]*Not connected/, 'presence card stays short and reports its unavailable state');
        await page.getByRole('heading', { name: 'Upcoming in the lab.', exact: true }).waitFor();
        assert.equal(await page.getByRole('region', { name: 'Upcoming events', exact: true }).count(), 1, 'Lab includes the upcoming event-card placement');
        assert.equal(await page.evaluate(() => {
          const nodes = ['.member-topbar', '#maker-ticker', '.lab-photo-banner', '.member-lab-quick-access', '.member-main-content'];
          const tops = nodes.map(selector => document.querySelector(selector).getBoundingClientRect().top);
          return tops.every((value, index) => !index || value >= tops[index - 1]);
        }), true, 'navigation → carousel → image/status → quick-access card → visit content');
      }
      if (screen === 'profile') {
        await page.getByRole('heading', { name: 'Profile', exact: true }).waitFor();
        assert.equal(await page.locator('.member-context-bar nav').count(), 0, 'Profile has no repeated Your details / Settings navigation strip');
        assert.equal(await page.locator('.profile-settings-dropdown').count(), 1, 'Profile header has a settings dropdown');
        const shareButton = page.getByRole('button', { name: 'Share profile', exact: true });
        assert.equal(await shareButton.count(), 1, 'Profile header has an icon-only Share button with an accessible name');
        assert.equal((await shareButton.innerText()).trim(), '', 'Share control has no visible text label');
        if ([320, 1440].includes(width) && theme === 'light') {
          await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
          await shareButton.click();
          const feedback = page.getByRole('status').filter({ hasText: 'Profile link copied.' });
          await feedback.waitFor();
          assert.equal(await feedback.evaluate(node => {
            const bounds = node.getBoundingClientRect();
            return bounds.width > 100 && bounds.left >= 0 && bounds.right <= innerWidth;
          }), true, 'share confirmation is readable within the viewport');
          const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
          assert.equal(copied.origin, origin, 'share copies the local preview URL');
        }
        assert.equal(await page.locator('.profile-settings-dropdown > summary').getAttribute('aria-label'), 'Open profile settings', 'icon-only Settings control has an accessible name');
        assert.equal((await page.locator('.profile-settings-dropdown > summary').innerText()).trim(), '', 'Settings control has no visible text label');
        assert.equal(await page.locator('.profile-qr-card__art').evaluate(node => getComputedStyle(node).backgroundImage === 'none'), true, 'member card uses CSS pixel art instead of a background image');
        assert.equal(await page.getByText('Aarya Menon', { exact: true }).count(), 1, 'profile preview has a clear maker identity card');
        assert.equal(await page.getByRole('link', { name: /Edit profile/ }).count(), 1, 'profile has one full-width edit action');
        assert.equal(await page.getByRole('navigation', { name: 'Profile sections' }).getByRole('link').count(), 5, 'profile section navigation links to its five showcase chapters');
        if ([320, 1440].includes(width) && theme === 'light') {
          const sectionNav = page.getByRole('navigation', { name: 'Profile sections' });
          await page.locator('#profile-projects').evaluate(node => node.scrollIntoView({ block: 'start' }));
          await page.waitForFunction(() => document.querySelector('.maker-profile-section-nav [aria-current="location"]')?.getAttribute('href') === '#profile-projects');
          const activeLink = sectionNav.locator('[aria-current="location"]');
          assert.equal(await activeLink.count(), 1, 'only one profile chapter is current');
          assert.equal(await activeLink.evaluate(node => {
            const link = node.getBoundingClientRect();
            const nav = node.closest('nav').getBoundingClientRect();
            return link.left >= nav.left - 1 && link.right <= nav.right + 1;
          }), true, 'current chapter stays within the mobile tab strip');
          await sectionNav.getByRole('link', { name: 'Activity', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('.maker-profile-section-nav [aria-current="location"]')?.getAttribute('href') === '#profile-activity');
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        assert.equal(await page.locator('.maker-interest-chips li').count(), 8, 'profile interests use compact chips');
        assert.equal(await page.locator('.maker-github-grid--sample>span').count(), 364, 'GitHub visual preview contains a marked sample contribution grid');
        assert.equal(await page.getByText('SAMPLE CHART · NOT LIVE DATA').count(), 1, 'sample contribution grid is clearly labeled as not live');
        assert.equal(await page.getByRole('heading', { name: 'Activity', exact: true }).count(), 1, 'profile has an activity chapter');
        assert.equal(await page.getByRole('heading', { name: 'Projects', exact: true }).count(), 1, 'profile has a projects chapter');
        assert.equal(await page.getByRole('heading', { name: 'Experience', exact: true }).count(), 1, 'profile has an experience chapter');
        assert.equal(await page.getByRole('heading', { name: 'Education', exact: true }).count(), 1, 'profile has an education chapter');
        assert.equal(await page.getByRole('heading', { name: 'Volunteering', exact: true }).count(), 1, 'profile has a volunteering chapter');
        assert.equal(await page.locator('.maker-profile-preview-note').count(), 1, 'preview sample data is disclosed');
        assert.equal(await page.getByText('Example account details', { exact: true }).count(), 0, 'profile no longer exposes a redundant private account-details card');
        for (const removedCopy of ['YOUR NEXT CONNECTION', 'Make yourself known.', 'YOUR CURIOSITY / YOUR CALL', 'A profile with your fingerprints.']) {
          assert.equal(await page.getByText(removedCopy, { exact: true }).count(), 0, `Profile omits repeated copy: ${removedCopy}`);
        }
        assert.equal(await page.locator('.profile-qr-card__image').count(), 0, 'QR library and image stay unloaded until the card is opened');
        const frontCard = page.locator('.profile-qr-card__front');
        assert.equal(await frontCard.getAttribute('aria-label'), "Flip Aarya Menon's photo card to show QR code", 'the full front face announces the member identity and QR action');
        assert.equal(await frontCard.getAttribute('aria-expanded'), 'false', 'profile card exposes its flip state');
        assert.equal(await page.locator('.profile-qr-card__rotor').evaluate(node => getComputedStyle(node).transitionDuration), '0s', 'reduced-motion preference disables the card flip animation');
        assert.equal(await page.locator('.profile-qr-card__art-code').evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize) < 16), true, 'card code texture uses a compact pixel type size');
        assert.equal(await page.locator('.profile-qr-card__front').evaluate(node => getComputedStyle(node, '::after').backgroundSize.startsWith('10px 10px')), true, 'card pixel grid uses fine blocks');
        assert.equal(await page.locator('.profile-qr-card__front').evaluate(face => {
          const faceBox = face.getBoundingClientRect();
          const artBox = face.querySelector('.profile-qr-card__art').getBoundingClientRect();
          const coverage = artBox.width * artBox.height / (faceBox.width * faceBox.height);
          return coverage >= .38 && coverage <= .41;
        }), true, 'pixel/ASCII artwork stays near 40% of the card area');
        await page.locator('.profile-qr-card__art').click();
        const qr = page.getByRole('img', { name: 'Sample QR code for this local design preview' });
        await qr.waitFor();
        assert.equal(await frontCard.getAttribute('aria-expanded'), 'true', 'clicking card artwork flips the whole card');
        assert.equal(await qr.evaluate(node => node.complete && node.naturalWidth >= 256), true, 'on-demand QR renders as a real image');
        assert.equal(await page.getByText(/Preview QR only/).count(), 1, 'preview does not claim a live member profile');
        const backFaceButton = page.getByRole('button', { name: "Flip Aarya Menon's profile card back to member details" });
        assert.equal(await page.getByRole('button', { name: /Back to card/ }).count(), 0, 'back-face text button is removed');
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === "Flip Aarya Menon's profile card back to member details"), true, 'flip moves keyboard focus to the full-card return target');
        assert.equal(await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }), true, 'keyboard focus stays in the viewport after flip');
        await backFaceButton.click({ position: { x: 8, y: 8 } });
        await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === "Flip Aarya Menon's photo card to show QR code", null, { timeout: 2500 });
        assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === "Flip Aarya Menon's photo card to show QR code"), true, 'clicking the back-card edge flips it to the member face');
        assert.equal(await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }), true, 'restored keyboard focus stays in the viewport');
        await page.locator('.profile-settings-dropdown>summary').click();
        assert.equal(await page.locator('.maker-profile-edit-cta').getAttribute('href'), '/design/member-profile-edit', 'profile card offers the full-width edit action');
        assert.equal(await page.getByRole('navigation', { name: 'Profile settings' }).getByRole('link', { name: 'Edit profile', exact: true }).getAttribute('href'), '/design/member-profile-edit', 'settings menu links to the profile section hub');
        for (const label of ['Feedback / talk to us', 'Terms of service', 'Privacy policy', 'Community guidelines', 'Invite a friend', 'Request account deletion']) {
          assert.equal(await page.getByRole('link', { name: label, exact: true }).count(), 1, `settings dropdown contains ${label}`);
        }
        await page.locator('.profile-settings-dropdown>summary').click();
      }
      if (width === 390 || width === 1440) {
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        assert.deepEqual(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], `${screen}/${width}/${theme} axe`);
      }
      assert.deepEqual(errors, [], `${screen} no uncaught browser errors`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${screen}-${width}-${theme}.png`, fullPage: true });
      results.push({ screen, width, theme, horizontalOverflow: false, browserErrors: errors.length });
      await page.close();
    }
    await context.close();
  }
  const editContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: 'light' });
  const editPage = await editContext.newPage();
  const editErrors = [];
  editPage.on('pageerror', error => editErrors.push(error.message));
  const editResponse = await editPage.goto(`${origin}/design/member-profile-edit`);
  assert.equal(editResponse.status(), 200, 'profile section preview loads');
  await editPage.getByRole('heading', { name: 'Edit your profile', exact: true }).waitFor();
  assert.equal(await editPage.getByRole('navigation', { name: 'Profile preview sections' }).getByRole('link').count(), 9, 'edit page offers all nine profile sections');
  for (const id of ['basic-profile', 'social-links', 'profile-settings', 'projects', 'activities', 'work-experience', 'education', 'volunteering', 'interests']) {
    assert.equal(await editPage.locator(`#${id}`).count(), 1, `profile section target exists: ${id}`);
  }
  assert.equal(await editPage.getByRole('button', { name: 'Review local draft' }).count(), 1, 'optional profile changes are preview-only and cannot claim to save');
  const nameInput = editPage.getByLabel('Name to share', { exact: false });
  const bioInput = editPage.getByLabel('A little about you', { exact: true });
  await nameInput.fill('Sample maker');
  await bioInput.fill('Building a prototype.');
  await editPage.getByRole('button', { name: 'Review local draft' }).click();
  await editPage.getByText('This is a local design draft. No account or database has been changed.', { exact: true }).waitFor();
  assert.equal(await nameInput.inputValue(), 'Sample maker', 'resolved action preserves edited name');
  assert.equal(await bioInput.inputValue(), 'Building a prototype.', 'resolved action preserves edited bio');
  const editAxe = await new AxeBuilder({ page: editPage }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(editAxe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], 'profile edit preview axe');
  assert.deepEqual(editErrors, [], 'profile edit page has no browser errors');
  await editPage.screenshot({ path: `${output}/profile-edit-390-light.png`, fullPage: true });
  await editContext.close();
  const motion = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await motion.addInitScript(() => sessionStorage.setItem('idealab-mec:loader-seen:v3', '1'));
  const page = await motion.newPage();
  await page.goto(`${origin}/design/member-space`);
  await page.getByRole('button', { name: 'Pause automatic motion', exact: true }).waitFor();
  const track = page.locator('#maker-ticker .ticker-track');
  assert.equal(await page.locator('#quote-ticker').count(), 1, 'shared landing quote band present');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#maker-ticker .ticker-track')).animationPlayState === 'running');
  assert.equal(await track.evaluate(node => getComputedStyle(node).animationDirection), 'normal', 'top ribbon travels from right to left');
  assert.equal(await page.locator('.maker-scene-route').evaluate(node => getComputedStyle(node).animationName), 'maker-scene-flow', 'maker illustration motion is enabled when motion is allowed');
  const before = await track.evaluate(node => getComputedStyle(node).transform);
  const beforeX = await track.evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41);
  await page.waitForTimeout(250);
  assert.notEqual(await track.evaluate(node => getComputedStyle(node).transform), before, 'ribbon really moves');
  const ribbonTravel = { before: beforeX, after: await track.evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41) };
  assert.equal(ribbonTravel.after < ribbonTravel.before, true, `top ribbon moves left: ${JSON.stringify(ribbonTravel)}`);
  await page.waitForFunction(() => document.querySelector('.discovery-activity-carousel__count')?.textContent?.trim().startsWith('02'), null, { timeout: 8500 });
  assert.equal(await page.locator('#featured-activities-carousel').getAttribute('aria-roledescription'), 'carousel', 'featured activity cards advance using the touch-first carousel');
  await page.waitForFunction(() => document.querySelector('.discovery-activity-carousel__count')?.textContent?.trim().startsWith('03'), null, { timeout: 8500 });
  await page.waitForFunction(() => document.querySelector('.discovery-activity-carousel__count')?.textContent?.trim().startsWith('01'), null, { timeout: 8500 });
  await page.locator('.discovery-learning').evaluate(node => node.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => document.querySelector('.discovery-learning')?.getAnimations().some(animation => animation.playState === 'running'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelector('.discovery-learning')?.getAnimations().every(animation => animation.playState !== 'running'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Pause automatic motion', exact: true }).click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#maker-ticker .ticker-track')).animationPlayState === 'paused');
  assert.equal(await page.locator('.maker-scene-route').evaluate(node => getComputedStyle(node).animationPlayState), 'paused', 'global pause stops the maker illustration motion');
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
      if (screen === 'home') assert.equal(await page.evaluate(() => {
        const stamp = document.querySelector('.event-preview-card__stamp')?.getBoundingClientRect();
        const heading = document.querySelector('.event-preview-card h3')?.getBoundingClientRect();
        return Boolean(stamp && heading && stamp.left < heading.right && stamp.right > heading.left && stamp.top < heading.bottom && stamp.bottom > heading.top);
      }), false, `${device.width}px event placeholder stamp does not cover the heading`);
      const mobileFrame = await page.evaluate(() => {
        const content = document.querySelector('.member-main-column');
        const nav = document.querySelector('.member-bottom-nav');
        const contentBottom = content.getBoundingClientRect().bottom;
        const navTop = nav.getBoundingClientRect().top;
        content.scrollTop = content.scrollHeight;
        const reachesEnd = content.scrollTop + content.clientHeight >= content.scrollHeight - 1;
        content.scrollTop = 0;
        return {
          navClear: navTop >= contentBottom - 1,
          reachesEnd,
          rootLocked: getComputedStyle(document.documentElement).overflowY === 'hidden' && getComputedStyle(document.body).overflowY === 'hidden',
          windowScroll: window.scrollY,
        };
      });
      assert.equal(mobileFrame.navClear, true, `${screen} ${device.width} bottom navigation has its own space`);
      assert.equal(mobileFrame.reachesEnd, true, `${screen} ${device.width} content scrolls within the workspace frame`);
      assert.equal(mobileFrame.rootLocked, true, `${screen} ${device.width} document leaves vertical scrolling to the workspace frame`);
      assert.equal(mobileFrame.windowScroll, 0, `${screen} ${device.width} browser window stays at the app frame`);
      if (screen === 'profile' && device.text === 200) assert.equal(await page.locator('.profile-qr-card').evaluate(card => {
        const host = card.getBoundingClientRect();
        return [...card.querySelectorAll('.profile-qr-card__face')].every(face => face.getBoundingClientRect().bottom <= host.bottom + 1);
      }), true, `${device.width}px large text QR faces do not clip`);
      const targets = page.locator('.member-primary-nav > a:visible, .member-bottom-nav > a:visible, .member-lab-quick-access nav a, .lab-visits-preview__actions a, .discovery-hero-links > a, .discovery-activity-carousel__buttons button, .workspace-lab-resources a');
      for (const target of await targets.all()) {
        const box = await target.boundingBox();
        assert.ok(box && box.width >= 44 && box.height >= 44, `${screen} ${device.width} large touch target`);
      }
      if (device.width === 375 || device.text === 200) await page.screenshot({ path: `${output}/${screen}-${device.width}-text-${device.text}.png` });
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
  assert.equal(await settingsPage.locator('.member-context-bar nav').count(), 0, 'Profile has no duplicated contextual navigation');
  const settingsMenu = settingsPage.locator('.profile-settings-dropdown');
  await settingsMenu.locator('summary').click();
  assert.equal(await settingsMenu.getByRole('link', { name: 'Appearance & motion', exact: true }).getAttribute('href'), '/design/member-settings#appearance', 'Profile settings opens from the settings menu');
  await settingsMenu.getByRole('link', { name: 'Appearance & motion', exact: true }).click();
  await settingsPage.waitForURL(/\/design\/member-settings(?:#.*)?$/);
  await settingsPage.getByRole('heading', { name: 'Make it feel like you.' }).waitFor();
  assert.equal(await settingsPage.locator('.member-context-bar nav').count(), 0, 'Settings does not restore the redundant Profile navigation row');
  const primaryNavigation = settingsPage.getByRole('navigation', { name: 'Mobile workspace navigation', exact: true });
  await primaryNavigation.getByRole('link', { name: 'Home', exact: true }).click();
  await settingsPage.waitForURL('**/design/member-space?screen=home');
  await settingsPage.getByRole('region', { name: 'Featured activities', exact: true }).waitFor();
  await settingsPage.goBack();
  await settingsPage.waitForURL(/\/design\/member-settings(?:#.*)?$/);
  await primaryNavigation.getByRole('link', { name: 'Lab', exact: true }).click();
  await settingsPage.waitForURL('**/design/member-space?screen=lab');
  await settingsPage.getByRole('heading', { name: 'Your lab.', exact: true }).waitFor();
  await settingsPage.goBack();
  await settingsPage.waitForURL(/\/design\/member-settings(?:#.*)?$/);
  await primaryNavigation.getByRole('link', { name: 'Profile', exact: true }).click();
  await settingsPage.waitForURL('**/design/member-space?screen=profile');
  await settingsPage.getByRole('button', { name: "Flip Aarya Menon's photo card to show QR code" }).waitFor();
  await settingsPage.goBack();
  await settingsPage.waitForURL(/\/design\/member-settings(?:#.*)?$/);
  await settingsPage.goForward();
  await settingsPage.waitForURL('**/design/member-space?screen=profile');
  await settingsPage.getByRole('button', { name: "Flip Aarya Menon's photo card to show QR code" }).waitFor();
  await settingsPage.goto(`${origin}/design/onboarding?layout=wizard`);
  const wizard = settingsPage.locator('.setup-wizard');
  await wizard.getByRole('textbox', { name: /Full name/ }).fill('Sample Maker');
  await wizard.getByRole('textbox', { name: /Phone number/ }).fill('+919000000000');
  await wizard.getByRole('button', { name: 'Next' }).click();
  await wizard.getByRole('textbox', { name: /Department/ }).fill('Sample department');
  await wizard.getByRole('combobox', { name: /Current year/ }).selectOption('2');
  await wizard.getByRole('button', { name: 'Next' }).click();
  const registration = wizard.getByRole('textbox', { name: /MEC registration/ });
  await registration.fill('OTHER24CS219');
  await wizard.getByRole('button', { name: 'Next' }).click();
  await wizard.getByText('MEC registration numbers start with MDL or LMDL.').waitFor();
  assert.equal(await registration.evaluate(input => input === document.activeElement), true);
  assert.equal(await wizard.getByRole('button', { name: 'Submit profile' }).count(), 0);
  await wizard.getByRole('button', { name: 'Back' }).click();
  assert.equal(await wizard.getByRole('textbox', { name: /Department/ }).inputValue(), 'Sample department');
  await wizard.getByRole('button', { name: 'Next' }).click();
  await registration.fill('LMDL24CS219');
  let wizardPosts = 0;
  const countWizardPost = request => {
    if (request.method() === 'POST') wizardPosts++;
  };
  settingsPage.on('request', countWizardPost);
  const registrationNext = wizard.getByRole('button', { name: 'Next' });
  const nextPosition = await registrationNext.boundingBox();
  assert.ok(nextPosition, 'The registration Next button is visible');
  await settingsPage.mouse.dblclick(nextPosition.x + nextPosition.width / 2, nextPosition.y + nextPosition.height / 2);
  const review = wizard.locator('.setup-review dd');
  assert.deepEqual(await review.allTextContents(), [
    'Sample Maker', '+919000000000', 'LMDL24CS219', 'Model Engineering College', 'Sample department', '2',
  ], 'The review displays all six synthetic profile values');
  const submitProfile = wizard.getByRole('button', { name: 'Submit profile' });
  assert.equal(await submitProfile.isDisabled(), true, 'Submit starts disabled on entering Review');
  await wizard.getByRole('heading', { name: /Step 4 of 4/ }).press('Enter');
  await submitProfile.click({ trial: true });
  assert.equal(wizardPosts, 0, 'Rapid Next and Enter on the review heading do not submit the profile');
  await submitProfile.click();
  await wizard.getByRole('status').getByText('Preview check complete. Nothing was sent to the database.').waitFor();
  assert.equal(wizardPosts, 1, 'One deliberate submit sends one preview request');
  settingsPage.off('request', countWizardPost);
  await settingsContext.close();
  const combinedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await combinedContext.addInitScript(() => sessionStorage.setItem('idealab-mec:loader-seen:v3', '1'));
  const combinedPage = await combinedContext.newPage();
  await combinedPage.goto(`${origin}/design/member-space?screen=lab`);
  await combinedPage.getByRole('navigation', { name: 'Lab pages' }).getByRole('link', { name: 'Make & borrow' }).click();
  await combinedPage.waitForURL('**/design/student?screen=make-borrow');
  await combinedPage.getByRole('heading', { name: /Make something\. Borrow what helps\./ }).waitFor();
  assert.equal(await combinedPage.getByRole('heading', { name: 'Request lab support.' }).count(), 1, 'combined preview contains work request entry');
  assert.equal(await combinedPage.getByRole('heading', { name: 'Shared lab tools.' }).count(), 1, 'combined preview contains shared tools entry');
  assert.equal(await combinedPage.getByRole('navigation', { name: 'Mobile workspace navigation' }).isVisible(), true, 'combined page keeps bottom navigation');
  await combinedContext.close();
  const eventContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await eventContext.addInitScript(() => sessionStorage.setItem('idealab-mec:loader-seen:v3', '1'));
  const eventPage = await eventContext.newPage();
  await eventPage.goto(`${origin}/design/event-carousel-test`);
  const eventList = eventPage.locator('.event-programme-list--carousel');
  const nextEvent = eventPage.getByRole('button', { name: 'Next upcoming event' });
  const previousEvent = eventPage.getByRole('button', { name: 'Previous upcoming event' });
  assert.equal(await eventList.locator('li').count(), 3, 'event carousel fixture has three test-only slides');
  assert.equal(await previousEvent.isDisabled(), true, 'previous event control starts disabled');
  await eventPage.evaluate(() => {
    const list = document.querySelector('.event-programme-list--carousel');
    const original = list.scrollTo.bind(list);
    list.scrollTo = options => { window.__lastEventScrollBehavior = options.behavior; original(options); };
  });
  await nextEvent.click();
  assert.equal(await eventPage.evaluate(() => window.__lastEventScrollBehavior), 'auto', 'reduced motion disables animated event scrolling');
  await eventPage.waitForFunction(() => document.querySelector('.event-programme-list--carousel').scrollLeft > 0);
  assert.equal(await previousEvent.isEnabled(), true, 'previous becomes available after moving forward');
  await nextEvent.click();
  await eventPage.waitForFunction(() => document.querySelector('[aria-label="Next upcoming event"]').disabled);
  assert.equal(await nextEvent.isDisabled(), true, 'next becomes disabled at the end of the event list');
  await previousEvent.click();
  await eventPage.waitForFunction(() => {
    const list = document.querySelector('.event-programme-list--carousel');
    return list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
  });
  await previousEvent.click();
  await eventPage.waitForTimeout(100);
  const returnPosition = await eventPage.locator('.event-programme-list--carousel').evaluate(list => ({ firstCardLeft: list.querySelector('li').getBoundingClientRect().left - list.getBoundingClientRect().left, previousDisabled: document.querySelector('[aria-label="Previous upcoming event"]').disabled }));
  assert.ok(returnPosition.firstCardLeft >= -1, `previous control returns to the first snap point: ${JSON.stringify(returnPosition)}`);
  await eventPage.waitForFunction(() => document.querySelector('[aria-label="Previous upcoming event"]').disabled);
  assert.equal(await previousEvent.isDisabled(), true, 'previous returns to the start and disables');
  await eventPage.goto(`${origin}/design/event-carousel-test?count=1`);
  assert.equal(await eventPage.getByRole('button', { name: /upcoming event/ }).count(), 0, 'single-event state has no misleading carousel controls');
  const singleCard = await eventPage.locator('.event-programme-list--carousel > li').evaluate(node => {
    const track = node.parentElement;
    const style = getComputedStyle(track);
    return { width: node.getBoundingClientRect().width, viewport: track.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight) };
  });
  assert.ok(Math.abs(singleCard.width - singleCard.viewport) <= 1, `single event fills the track: ${JSON.stringify(singleCard)}`);
  await eventContext.close();
  const smoothContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await smoothContext.addInitScript(() => sessionStorage.setItem('idealab-mec:loader-seen:v3', '1'));
  const smoothPage = await smoothContext.newPage();
  await smoothPage.goto(`${origin}/design/event-carousel-test`);
  await smoothPage.evaluate(() => {
    const list = document.querySelector('.event-programme-list--carousel');
    const original = list.scrollTo.bind(list);
    list.scrollTo = options => { window.__lastEventScrollBehavior = options.behavior; original(options); };
  });
  await smoothPage.getByRole('button', { name: 'Next upcoming event' }).click();
  assert.equal(await smoothPage.evaluate(() => window.__lastEventScrollBehavior), 'smooth', 'event cards glide smoothly when motion is allowed');
  await smoothPage.goto(`${origin}/design/member-space?screen=profile`);
  const profileRotor = smoothPage.locator('.profile-qr-card__rotor');
  const profileFront = smoothPage.locator('.profile-qr-card__front');
  assert.equal(await profileRotor.evaluate(node => getComputedStyle(node).transitionDuration), '1.05s', 'profile card uses the smooth 1.05-second flip when motion is allowed');
  await profileFront.click();
  await smoothPage.waitForTimeout(240);
  const flipProgress = await profileRotor.evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).m11);
  assert.equal(Math.abs(flipProgress) < .99, true, `flip visibly passes through an animated midpoint: ${flipProgress}`);
  await smoothPage.waitForFunction(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.profile-qr-card__rotor')).transform).m11 < -.98, null, { timeout: 1600 });
  await smoothPage.locator('.profile-qr-card__back-hit-area').click({ position: { x: 8, y: 8 } });
  await smoothPage.waitForFunction(() => document.querySelector('.profile-qr-card').classList.contains('is-flipped') === false);
  await smoothContext.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ scope: 'Local visual preview, not authenticated persistence or provider E2E', results }, null, 2));
  console.log(`PASS: ${results.length} member visual layouts including touch/landscape/200% text, 12 axe snapshots, featured-carousel controls, ribbon and SVG motion controls, preview navigation and no-JS content; no live accounts used.`);
} finally { await browser.close(); }
