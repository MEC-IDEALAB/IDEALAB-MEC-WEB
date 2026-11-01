# Accessible motion and route audit — 1 November 2026

This change adds a site-wide motion control and checks the public and preview
routes for common WCAG 2.2 AA issues. The control can pause or resume the
moving home highlights, including the hero vector orbit and sun, the event
archive and the quote strip. It is keyboard
operable, keeps a 44 px touch target, persists the user's preference for the
tab, and pauses motion while focus is inside a moving region. Reduced-motion
users do not receive the continuous animations.

Entrance and scroll reveals retain their translate, rotate and flip movement
without fading text or controls through low-contrast states. This covers the
home intro, scroll-reveal cards, mobile navigation, staff preview, account
card/story transitions and onboarding steps. The one-time loader's visual
timeline is held for at least ten seconds after its composition starts; its
tab marker is versioned so existing tabs can replay the updated first-visit
scene once.

## Verification

Verified from branch `codex/issue43-accessibility` with Node 24.22.1,
Next.js 16.4.2 and local Chromium:

- `npm run build:acceptance` — passed.
- `npm run test:acceptance` — passed the public journey, five widths in both
  themes, sign-in/sign-up and recovery layouts, loader timing, reduced motion,
  motion pause/resume, keyboard focus latching, 44 px motion control, draft
  flows, security headers, PWA registration and offline fallback.
- The acceptance suite ran axe WCAG 2.2 AA snapshots on 10 routes in both
  themes at 375 px and on the homepage in both themes at 1440 px — no
  violations.
- `npm run build`, `npm run typecheck`, `npm run lint` and
  `npm run test:boundaries` — passed; 148 boundary tests passed.
- A fresh local Chromium replay at
  `http://127.0.0.1:3015/?loader=preview` observed the marquee, orbit and
  progress-sweep animations running, no page errors, and the loader visible
  for 11,594 ms from boot start through its exit. The capture is
  `artifacts/acceptance/local-loader-3015.png`.

The browser checks use an isolated public/configuration build. They do not
create accounts, send email, authenticate with Google, read or write member
records, or verify production backend permissions. Manual screen-reader
testing has not been completed; issue #43 remains open for that and any
desktop/mobile assistive-technology findings.
