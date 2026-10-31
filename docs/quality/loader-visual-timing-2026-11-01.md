# First-visit loader motion and timing — 2026-11-01

## Scope

This record covers the public website’s first-visit loader, including its CSS entrance, visual-start handoff, reduced-motion behavior, hydration delay, and no-hydration watchdog. It does not verify account creation, email delivery, OAuth, member permissions, or operational backend flows.

## Finding and change

The live production loader was captured with a near-black opening frame at 380 ms; the brand composition was visible later, and the exit countdown began before the full motion had been seen. In the cold-start sequence, the center, marquee wall, and rows all began at zero opacity, and the lockup text initially moved completely below its clipped wrappers.

The entrance now starts with a dim but readable composition and settles into full brightness. The three lockup words use a small blurred, lowered entrance so they remain visible during their stagger. The inline visual-start probe waits for the central mark’s opacity and visible text boxes before recording `data-boot-visual-started`. The minimum display is 1,550 ms from that frame; the exit transition is 320 ms. High-priority fonts and images have a 400 ms readiness window. The watchdog remains bounded to 2,600 ms from the original boot marker, including hydration delay. Reduced-motion users skip the intro, and changing to reduced motion while it is running releases it.

The delayed-CSS browser check holds at least one real stylesheet request for at least 400 ms and verifies the visible lockup after CSS arrives. It then checks that the full reveal remains visible before the loader exits.

## Verification

Verified on Node v24.22.1, Next.js 16.4.2, and Chromium. The source snapshot is based on `e471b795e3d924ee7ff043308a14a2c29e76b127`; the SHA-256 manifest `5bfb1a3537dac65440b5b89bce80e9d06a02ba347413548909b33179394b4e33` covers `scripts/acceptance.mjs`, `src/app/brand-loading.css`, `src/app/layout.tsx`, `src/components/boot-ready.tsx`, and `src/lib/brand-loading.ts`.

- `npm run test:boundaries` — 148 passed, 0 failed.
- `npm run typecheck` — passed.
- Targeted ESLint for the edited layout, loader readiness, timing constants, and acceptance script — passed.
- `npm run build` and `npm run build:acceptance` — optimized production builds passed, including TypeScript and static page generation.
- `npm run test:acceptance` — passed. The delayed-CSS case held an intercepted stylesheet request for at least 400 ms; the rendered loader remained visible for at least 1,550 ms from its visible title frame. The live reduced-motion cancellation case ran on the sign-in route and waited for the boot listener before switching preferences. The suite also covers delayed JavaScript, the no-hydration watchdog, first-visit-only behavior, responsive public pages, and protected-route checks.
- `docs/quality/loader-visual-timing-2026-11-01.md` link check and `git diff --check` — recorded after the document was added.

The acceptance screenshot `artifacts/acceptance/wordmark-loading.png` shows the dark IDEALAB wordmark composition, prototype orbit, background type field, and lime/magenta accents during the reveal.

## Remaining verification

This worktree’s change has not yet been deployed. The post-deployment timing and visual state on the production alias remain to be checked after the reviewed change is merged and Vercel completes its production deployment. The wider member/auth/backend exclusions above remain unverified by this loader-focused suite.
