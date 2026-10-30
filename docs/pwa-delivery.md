# Installable website delivery

The website supplies an IDEALAB MEC web app manifest and 192 px and 512 px
icons. Browsers that support installation can offer the website as a standalone
app when it is served from an eligible secure origin. The manifest starts at
the public home page and uses the site's existing authentication controls.

This first implementation does not register a service worker, cache member
pages, or claim offline access. An installed app still needs a network connection
for member operations. Push notifications are not implemented.

An Android APK is a separate deliverable. It requires a verified deployed HTTPS
origin, Android package identity and signing configuration, an association
between the app and the website, and device acceptance. No APK or signed release
is produced by the manifest alone. Production member access remains gated on
the shared Grow database, authorization and account-journey checks.

## Verification snapshot — 31 October 2026

On the current local worktree, Node 24.19.0 passed `npm run lint`,
`npm run typecheck`, all 127 `npm run test:boundaries` tests, and
`npm audit --audit-level=high` (zero advisories). `npm run build:acceptance`
produced an optimized Next.js build, and `npm run test:acceptance` passed the
Chromium journey. The browser check confirmed the manifest route, standalone
display, root scope, and valid 192 px and 512 px PNG responses, alongside the
public and preview acceptance checks. Documentation-link validation passed for
49 files and 277 local links.

This run used the local isolated validation configuration. It does not verify
installation from a hosted HTTPS origin, offline behavior, a real account or
member-data access. Vercel has no project connected to this repository in the
connected account. Android package identity, website association, release
signing and physical-device acceptance remain open; no APK has been built.
