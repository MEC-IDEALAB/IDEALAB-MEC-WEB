# PWA offline shell verification — 31 October 2026

Candidate branch: `codex/pwa-offline-shell`, based on `origin/main` at
`1f4eaf78a2bca00a4ebbe1576b9f15632613a05a`.

Source fingerprint (SHA-256 over the sorted SHA-256 hashes for the eight code,
test, asset and dependency files changed for this feature):
`d1962acb59756d1730e59609d99e4b528fb176eb84c2a5d75ccb9fc6de9948be`.

## Local checks

- `npm ci` completed with zero vulnerabilities after pinning the transitive
  `minimatch` dependency to `11.0.1`.
- `npm run lint` passed.
- `npm run typecheck` passed after the production build generated route types.
- `npm run test:boundaries` passed all 128 tests.
- `npm audit --audit-level=moderate` reported zero vulnerabilities.
- `npm run build:acceptance` completed the optimized Next.js build.
- `npm run test:acceptance` passed in Chromium. It verified the service worker
  registers in production, caches only `/offline.html`, `/offline.css` and the
  two app icons, returns the offline page for a failed `/app/profile`
  navigation, loads the cached stylesheet and app icon while offline, and does
  not cache `/app/*` or `/auth/*` routes.
- `node scripts/check-docs.mjs` passed for 50 documentation files and 283 local
  links.
- `git diff --check` passed.

## Independent review and limits

The independent security review first caught the offline page's inline style
being blocked by the nonce-based CSP. The CSS was moved to the same-origin
`/offline.css`, pre-cached, and verified by a second review with no remaining
findings.

These are local build and browser results. Hosted HTTPS installation, the
organization's Vercel access, a real account or member-data journey, APK
identity/signing, and physical-device acceptance remain unverified. No APK was
built and no production deployment was made.
