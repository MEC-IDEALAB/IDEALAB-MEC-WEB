# Installable website delivery

The website supplies an IDEALAB MEC web app manifest and 192 px and 512 px
icons. Browsers that support installation can offer the website as a standalone
app when it is served from an eligible secure origin. The manifest starts at
the public home page and uses the site's existing authentication controls.

Production builds register a root-scoped service worker. It caches only the
static offline message, its stylesheet and the app icons, and serves those
assets from cache when needed. A page navigation that cannot reach the network
shows the offline message. It does not cache HTML pages, authentication routes,
APIs or member data. Lab and account work still needs a connection. Push
notifications are not implemented.

An Android APK is a separate deliverable. It requires a verified deployed HTTPS
origin, Android package identity and signing configuration, an association
between the app and the website, and device acceptance. No APK or signed release
is produced by the manifest alone. Production member access remains gated on
the shared Grow database, authorization and account-journey checks.

## Verification snapshot — 31 October 2026

On the isolated `codex/pwa-offline-shell` candidate, Node 24.22.1 passed
`npm ci`, `npm run lint`, `npm run typecheck`, all 128
`npm run test:boundaries` tests, and `npm audit --audit-level=moderate` with
zero vulnerabilities. `npm run build:acceptance` completed an optimized
production build. `npm run test:acceptance` passed the Chromium public-site
journey, including service-worker registration, the offline fallback for a
member-route navigation, CSP-compliant cached styling, and assertions that
member/auth URLs never enter Cache API storage. The browser suite also checked
five viewport widths, themes, accessibility, navigation, and security headers.

The full website review independently checked the PWA cache and CSP boundaries;
its inline-style finding was fixed before this candidate was tested. The local
browser journey does not verify installation from a hosted HTTPS origin, a real
account or member-data access. The connected Vercel account has only its personal
Hobby team and no IDEALAB organization namespace. Android package identity,
website association, release signing and physical-device acceptance remain
open; no APK has been built.

See the [PWA offline-shell verification record](quality/pwa-offline-shell-2026-10-31.md)
for the source fingerprint, local checks and independent security review.
