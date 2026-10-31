# First-visit loader motion and timing — 31 October 2026

The first-visit scene now has a paced reveal: the prototype draws, the IDEALAB
wordmark enters in three staggered beats, the geometric star settles, the
caption fades in, and one indeterminate rail sweeps continuously. The large
repeated-wordmark ribbons stay in the background. The central composition
finishes before the page hands off, instead of ending at an arbitrary point in
the reveal.

Fonts and high-priority images get a bounded 1.1-second readiness check. Fast
loads keep the full scene visible for at least 1.5 seconds. The progress track
finishes fading in before a 680 ms sweep starts; it completes just before the
overlay finishes its 320 ms exit. Page content remains inert through that
handoff. Reduced-motion users skip the animations and release the overlay
after hydration. A 3.6-second hydrated watchdog and 4.4-second inline fallback
release the page if startup stalls. The session marker keeps the scene to one
appearance per browser-tab visit.

## Verification

Using Node 24.22.1 in an isolated temporary source copy, preserving existing
project artifacts:

- `npm audit --audit-level=high` — 0 vulnerabilities.
- `npm run lint` and `npm run typecheck` — passed.
- `npm run test:boundaries` — 147 passed, 0 failed.
- `npm run test:project-journal` and `npm run test:request-journal` — passed in
  Chromium.
- `npm run build:acceptance` and `npm run build` — passed.
- `npm run test:acceptance` — passed the public journey, five widths in both
  themes, loader choreography and hand-off, reduced motion, slow readiness,
  no-hydration release, keyboard/inert hand-off, page flows and security
  boundaries.
- `node scripts/check-docs.mjs` — 53 documentation files and 292 local links
  passed; `git diff --check` — passed.

Desktop and dark mobile captures from the passing Chromium run were visually
inspected in the isolated QA copy; local screenshots remain in the untracked
`artifacts/acceptance/` output and are not a source dependency.

These browser checks use no live account, do not submit to Supabase, and do not
verify production analytics dashboard collection. The initial loader shipped
in PR #30; its timing correction and production result are recorded below.

## Production timing follow-up — 1 November 2026

The live production alias returned HTTP 200 and showed the full wordmark scene.
A capture at about one second showed that the progress sweep had started before
the rail finished fading in, so the rail was hard to see. The current follow-up
fades the track in from 700 ms, starts its 680 ms sweep at 940 ms, and holds the
loader for 1.5 seconds before its 320 ms exit. This leaves about 200 ms between
the sweep finishing and the overlay disappearing. The acceptance journey checks
the track opacity, sweep movement, and CSS timing, in addition to the existing
handoff and reduced-motion checks. The full isolated Chromium acceptance passed
with this follow-up.

PR #31 merged at `6ae71d6`. The Vercel production deployment for that exact
`main` commit is Ready and serves `https://idealab-mec-web.vercel.app/` with
HTTP 200. A fresh Playwright Chromium session measured the overlay at 1.86 s:
the track was visible before its sweep, the rail moved, content stayed inert
until the overlay exited, and a same-tab reload skipped the loader. With
reduced motion enabled, all loader animations resolved to `0s` and the overlay
released 358 ms after its start. The capture and browser checks used no account
or member data.

## Motion and timing refinement — 1 November 2026

The central prototype now has a rotating blueprint marker to make the maker
graphic visibly move alongside the background wordmark ribbons. The progress
rail still communicates indeterminate loading, but its 840 ms loop gives each
sweep a short pause instead of repeatedly snapping back at the previous 680 ms
pace. Its track appears from 500 ms, then the sweep begins at 740 ms and settles
near the far edge inside the track so it stays visible during hand-off. The completed
composition now holds for 1.22 seconds before the same 320 ms fade, shortening a
fast first visit by about 280 ms. The hydration watchdog and no-hydration
fallback now share a 3.6-second timeout.

PR [#33](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/pull/33) merged into
`main` at `ccfbb7466553ec64c0239a3ab167fa4c863f69a0`. Its exact-head Website CI,
Documentation CI, required gate and Vercel preview passed; post-merge Website
CI and Documentation CI also passed. The production Vercel deployment for that
commit is Ready, and the public alias returns HTTP 200.

A fresh Playwright Chromium check on the deployed alias measured 1.567 seconds
from boot start to loader removal on desktop and 1.549 seconds at a 390 px
mobile width. The live page reports the orbit and 840 ms progress sweep
animations, and a same-tab reload skips the first-visit overlay. With reduced
motion enabled, the orbit and sweep resolve to no animation, the page becomes
interactive, and the overlay exits in 338 ms. The hosted manifest returns HTTP
200 and advertises the maskable icon; the SVG and service worker also return
HTTP 200, and the worker includes the maskable icon in its cache list.

The local production build measured 1.593 seconds. Local Chromium acceptance
also passed the orbit movement, visible sweep, 1.2–2.2 second fast-load handoff,
reduced-motion, slow-readiness, no-hydration release, keyboard/inert handoff,
and full public-site journey. Lint, typecheck, 148 boundary tests, docs checks,
and production build passed. Live account and backend workflows remain outside
this public-site acceptance.
