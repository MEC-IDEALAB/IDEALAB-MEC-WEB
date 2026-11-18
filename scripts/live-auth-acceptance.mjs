import { setTimeout as delay } from 'node:timers/promises';

// This interactive helper uses real Auth and a fresh, temporary browser context.
// It never enters credentials, submits profile details or saves browser state.
// Do not add traces, screenshots, console forwarding or raw errors here: any of
// those may contain callback codes or private account information.
const ORIGIN = 'http://127.0.0.1:3015';
const MANUAL_SIGN_IN_MS = 10 * 60 * 1000;
const help = `Interactive IDEALAB MEC Google acceptance

  node scripts/live-auth-acceptance.mjs --interactive --mode=new
  node scripts/live-auth-acceptance.mjs --interactive --mode=returning

Uses only the local server on port 3015. A fresh Chrome window opens for the
account owner to sign in privately. Do not send credentials to the agent.

new: use a Google account without completed IDEALAB onboarding. This checks the
onboarding guard only; it does not enter, save or declare any student details.
returning: use an already-onboarded account to check Home and Profile access.

The browser closes on completion, failure or the ten-minute sign-in timeout.
Output contains fixed check labels only. No profile-save, email delivery,
recovery, cross-account or Grow acceptance is established by this helper.
`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(help);
} else {
  const modes = args.filter(arg => arg.startsWith('--mode='));
  const mode = modes.length === 1 ? modes[0].slice('--mode='.length) : null;
  if (!args.includes('--interactive') || !['new', 'returning'].includes(mode)
    || args.filter(arg => arg === '--interactive').length !== 1
    || args.some(arg => arg !== '--interactive' && !arg.startsWith('--mode='))) {
    console.error('Use --interactive with exactly one --mode=new or --mode=returning. Use --help for details.');
    process.exitCode = 2;
  } else {
    await run(mode);
  }
}

async function run(mode) {
  // An inherited Playwright debug setting can log network URLs. Disable it in
  // this process before loading Playwright; browser credentials remain private.
  delete process.env.DEBUG;
  delete process.env.PWDEBUG;
  const checks = [];
  let browser;
  let context;
  let currentCheck = 'browser-start';
  let cancelled = false;
  const cancel = () => { cancelled = true; void browser?.close().catch(() => {}); };
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);

  function check(label, condition) {
    currentCheck = label;
    checks.push({ check: label, passed: condition === true });
    if (!condition) throw new Error('Acceptance check failed.');
  }

  try {
    const { chromium } = await import('playwright');
    try { browser = await chromium.launch({ channel: 'chrome', headless: false }); }
    catch { browser = await chromium.launch({ headless: false }); }
    context = await browser.newContext();
    await context.addInitScript(() => {
      // Skip only the decorative intro. This does not alter account state.
      sessionStorage.setItem('idealab-mec:loader-seen:v3', '1');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(30_000);
    let googleVisited = false;
    page.on('framenavigated', frame => {
      if (frame !== page.mainFrame()) return;
      try {
        const destination = new URL(frame.url());
        // Provider pages are never inspected. Only this origin observation is
        // used to avoid calling a password login a Google acceptance result.
        if (destination.origin === 'https://accounts.google.com') googleVisited = true;
      } catch { /* No URL contents are reported. */ }
    });
    const localPath = () => {
      try {
        const destination = new URL(page.url());
        return destination.origin === ORIGIN ? destination.pathname : null;
      } catch { return null; }
    };

    currentCheck = 'sign-in-entry';
    const entry = await page.goto(`${ORIGIN}/sign-in`);
    check('sign-in-entry', entry?.status() === 200);
    await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor();
    check('google-control-enabled', await page.getByRole('button', { name: /^Continue with Google/ }).isEnabled());
    console.log(JSON.stringify({ phase: 'awaiting-private-google-sign-in', mode, timeoutSeconds: MANUAL_SIGN_IN_MS / 1000 }));
    console.log('In the opened browser, click Continue with Google and sign in privately. Do not enter or submit any onboarding details for this test.');

    currentCheck = 'manual-google-return';
    const deadline = Date.now() + MANUAL_SIGN_IN_MS;
    let destination;
    while (Date.now() < deadline && !cancelled && !page.isClosed()) {
      const path = localPath();
      if (googleVisited && (path === '/account-access' || path === '/app')) {
        destination = path;
        break;
      }
      if (googleVisited && path === '/sign-in') {
        // Reading only the known notice on our own page avoids printing or
        // inspecting provider parameters. A rejected return is not a pass.
        const notice = new URL(page.url()).searchParams.get('notice');
        if (notice) break;
      }
      await delay(500);
    }
    check('manual-google-return', googleVisited && Boolean(destination));

    const expectedPath = mode === 'new' ? '/account-access' : '/app';
    check(mode === 'new' ? 'new-account-needs-onboarding' : 'returning-account-enters-home', destination === expectedPath);
    const readySelector = mode === 'new' ? '.setup-wizard' : '.member-main-content';
    currentCheck = 'server-rendered-account-state';
    await page.locator(readySelector).waitFor({ state: 'visible' });
    check('server-rendered-account-state', true);

    async function visit(path, label, expected = expectedPath, selector = readySelector) {
      currentCheck = label;
      const response = await page.goto(`${ORIGIN}${path}`);
      await page.waitForURL(url => url.origin === ORIGIN && url.pathname === expected);
      await page.locator(selector).waitFor({ state: 'visible' });
      check(label, response?.status() === 200 && localPath() === expected);
      check(`${label}-no-store`, /(?:^|,)\s*no-store\s*(?:,|$)/i.test(response?.headers()['cache-control'] ?? ''));
    }

    if (mode === 'new') {
      await visit('/app', 'home-requires-onboarding');
      await visit('/app/lab', 'lab-requires-onboarding');
      await visit('/app/profile', 'profile-requires-onboarding');
    } else {
      await visit('/app/profile', 'own-profile-access', '/app/profile', '.workspace-arcade-profile');
      await visit('/account-access', 'completed-onboarding-enters-home');
    }
    await visit('/sign-in', 'signed-in-login-entry-guard');
    await visit('/sign-up', 'signed-in-signup-entry-guard');
    currentCheck = 'reload-keeps-server-account-state';
    const reloaded = await page.reload();
    await page.locator(readySelector).waitFor({ state: 'visible' });
    check('reload-keeps-server-account-state', reloaded?.status() === 200 && localPath() === expectedPath);
    check('reload-no-store', /(?:^|,)\s*no-store\s*(?:,|$)/i.test(reloaded?.headers()['cache-control'] ?? ''));

    console.log(JSON.stringify({ result: 'passed', mode, checks,
      notProven: ['profile-save', 'student-declaration', 'email-confirmation', 'password-recovery', 'cross-account-authorization', 'Grow-client'] }));
  } catch {
    // Raw Playwright errors can contain callback URLs and private DOM text.
    console.error(JSON.stringify({ result: cancelled ? 'cancelled' : 'failed', mode, failedCheck: currentCheck, checks }));
    process.exitCode = 1;
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}
