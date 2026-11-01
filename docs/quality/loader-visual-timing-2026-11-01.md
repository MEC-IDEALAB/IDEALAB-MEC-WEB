# First-visit loader motion and timing — 2026-11-01

## Observed behavior

Production was serving `d258dd25e483745dd82bf5edd6be662a5e7cb016` (PR #38). On that deployed build, Playwright observed the loader leave after 1,963 ms from its boot timestamp; the visual-start marker was only 67 ms after boot. The tab had the previous `idealab-mec:visited=1` session marker and no versioned marker. The running local service at port 3015 also used the old marker and removed its loader after 1,635 ms. Both observations reproduce the user's report that the intro appears briefly and vanishes before it reads as a complete animation.

The localhost service belongs to a separate in-progress checkout with unrelated uncommitted changes. It was left untouched during the baseline capture; a later, narrowly scoped local loader patch is recorded under Release status below.

At the time of the baseline run, the corrected build was running separately at `http://127.0.0.1:3016`. A fresh Chromium tab measured 10,350 ms from boot to loader removal, with the full-composition marker at 1,190 ms. Port 3015 was then serving the other checkout.

## Updated behavior

The tab marker is versioned as `idealab-mec:loader-seen:v2`, so a tab carrying the previous marker sees this revision's intro once. The ten-second intro timeline starts at the first boot frame and includes scene assembly, then the existing 320 ms fade. In the local browser run, the fully settled composition was visible for about 8.8 seconds of that ten-second sequence. The readiness check remains bounded to 400 ms. The 12-second watchdog from initial boot allows the ordinary sequence to complete, but still releases the page if hydration stalls; an unusually slow start can shorten the intro. Page controls remain inert through the fade. Reduced-motion users skip the intro and can interact immediately.

The desktop and 390×844 mobile layouts retain stable prototype sizes of 82×86 px and 66×70 px. Reloads and client navigation in the same tab do not replay the intro.

## Verification

Verified on Node v24.22.1, Next.js 16.4.2 and Chromium in branch `codex/loader-assembly-timing-20261101`, based on deployed production commit `d258dd25e483745dd82bf5edd6be662a5e7cb016`.

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test:boundaries` — 148 passed, 0 failed.
- `npm run build` and `npm run build:acceptance` — passed.
- `npm run test:acceptance` — passed. Desktop and 390×844 mobile first visits verify the full ten-second intro timing, the long settled composition, old-marker upgrade, stable mark size and measured fade. The suite also checks delayed CSS and JavaScript, the no-hydration watchdog, reduced-motion skip/cancellation, repeat visits, responsive public pages, member preview loading skeletons, keyboard access, PWA and offline shell behavior. Member/auth/backend integration stays separately unverified.
- Fresh Chromium visit to local port 3016 — passed; 10,350 ms to overlay removal and 1,190 ms until the full composition marker.
- `node scripts/check-docs.mjs` — 56 files and 295 local links passed. `git diff --check` passed.

Browser captures at `artifacts/acceptance/wordmark-loading.png` and `artifacts/acceptance/wordmark-loading-mobile.png` show the completed scene. These checks use no live member identity and do not verify authentication or operational backend flows.

The source manifest fingerprints the loader and its acceptance tests. Paths are sorted and each line is `<path> <file SHA-256>` with a trailing newline; the manifest hash is SHA-256 over those lines.

```text
scripts/acceptance.mjs 01bf9d632327f1502f2b60f9ff680a6875f781d24e26c9c9a6fe9ee0550ee0f5
src/app/brand-loading.css ad0ca3a5ee74acf3e9e1414f790bfb957ddd715d700fb0367afbdb3ab6f08ca8
src/app/layout.tsx 179239cc1c3dae6fcb43016402e5e06b18d368beff9adc83d0d371a7760fc4b0
src/components/boot-ready.tsx 212f9e30a892fe240370e8d036490ce0113f389990a4d5a38a9a138684523489
src/components/brand-loading.tsx 818cd07a5393b9e66d5e58dda2ca16bcd923d48d72f7cf6728bf7e15cbcd055c
src/lib/brand-loading.ts e263647d17d6f2bd8a42645ae4cd212e4bee03d576a62d961ac4126a3a0adc19
```

Manifest SHA-256: `7abe726ec02a020bb54aa90a7b49bbe8aa6193aa5f7c5bcab8817f10a2b4b123`.

## Release status

PR #47 merged on 2026-11-01 as `9787f39484ddfd2635396e3aecab1f8df17e1997` after independent review and passing Website CI, Documentation CI, the required gate, and Vercel checks on head `038bf27b2a7befe6f910aee86abb4a6f5cf23ea0`. Vercel production deployment `dpl_3bosN2yXgomcFWhuTUCBhvMBqcUv` is Ready and serves `https://idealab-mec-web.vercel.app/`.

A fresh Chromium run against the production alias returned HTTP 200, observed the `loader-marquee` and `loader-build-orbit-spin` animations, and measured 10,429 ms from boot to loader removal with zero page errors. The v2 session marker was set. A same-tab repeat is intentionally skipped; use a fresh tab to verify the first-visit sequence again. Reduced-motion behavior is covered by local browser and CI acceptance.

The user’s active localhost checkout on port 3015 was later updated locally to use the ten-second minimum, a 12-second watchdog, an orbit graphic and faster marquee. A fresh browser measured 10,431 ms; ordinary same-tab reload skipped the loader, `?loader=preview` replayed it on localhost, and reduced-motion mode skipped the overlay. These four loader-file edits remain uncommitted in the separate `codex/issue18-project-create-intent` checkout and are not part of the deployed PR #47 source.
