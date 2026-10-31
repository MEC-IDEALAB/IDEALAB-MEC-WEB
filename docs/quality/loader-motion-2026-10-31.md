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
