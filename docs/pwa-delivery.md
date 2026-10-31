# Installable website delivery

The website supplies an IDEALAB MEC web app manifest with the existing 192 px
and 512 px icons plus a separate maskable SVG icon. The maskable icon embeds the
original 512 px artwork at 70% size over the same full-bleed lime background,
keeping the black mark inside the platform's central safe area without changing
the existing icons. Browsers that support installation can offer the website as
a standalone app when it is served from an eligible secure origin. The manifest
starts at the public home page and uses the site's existing authentication
controls.

Production builds register a root-scoped service worker. It caches only the
static offline message, its stylesheet and the app icons, including the new
maskable variant, and serves those
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
browser journey does not establish real account or member-data access. A later
hosted check confirms the public production HTTPS origin serves the manifest,
both declared icons and an active root-scoped service worker; it does not prove
an install prompt, home-screen launch, offline acceptance on a device or member
access. The Vercel project remains on the connected personal Hobby team, with no
IDEALAB organization namespace available. Android package identity, website
association, release signing and physical-device acceptance remain open; no APK
has been built.

See the [PWA offline-shell verification record](quality/pwa-offline-shell-2026-10-31.md)
for the source fingerprint, local checks and independent security review.

## Hosted HTTPS checks — 31 October 2026

On `https://idealab-mec-web.vercel.app/`, Chromium confirmed a secure context,
`/manifest.webmanifest` returned HTTP 200 with `display: standalone` and
`start_url: /`, the root-scoped service worker was activated and controlled the
page, and the manifest's `/brand/app-icon-192.png` and
`/brand/app-icon-512.png` assets each returned HTTP 200 as PNG files. The
service worker script `/sw.js` also returned HTTP 200.

This verifies hosted delivery of the PWA foundation. The browser installation
prompt, an actual installed home-screen launch, mobile operating-system
installation, Android wrapper/build, package ID, domain association, signing
and device acceptance remain unverified.

See the [current Vercel route verification](deployment.md#current-production-route-and-pwa-recheck-31-october-2026)
for the production deployment revision and route results.

## Maskable icon source update — 1 November 2026

The manifest now advertises `/brand/app-icon-maskable.svg` with `purpose:
maskable`. It is a self-contained SVG with the original PNG embedded as data,
so it does not depend on a second network fetch when the platform decodes the
icon. The full lime canvas fills the platform mask. A browser pixel-bound check
measured the scaled mark's farthest bounding-box corner at 194.1 px from the
512 px icon center, inside the 204.8 px radius of the central 80% safe circle.
The service worker includes the SVG in its icon precache and same-origin image
cache path. The original `any` PNG icons remain available for browsers that
prefer raster sources.

This is source-level packaging evidence. Hosted delivery was rechecked after
PR #33 merged at `ccfbb7466553ec64c0239a3ab167fa4c863f69a0`: the production
manifest returns HTTP 200 and advertises the SVG with `purpose: maskable`; the
SVG returns HTTP 200 as `image/svg+xml`, and `/sw.js` returns HTTP 200 with the
maskable icon in its precache list. These checks confirm hosted asset delivery,
not device installation. Android package identity, website association,
release signing, and physical-device acceptance remain open; no APK has been
built.
