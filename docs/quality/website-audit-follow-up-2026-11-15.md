# Website audit follow-up — 15 November 2026

This record verifies the actionable findings from the two owner-supplied audit
notes against the local website checkout. The review is source-specific; it does
not certify production readiness or replace the staged release gates.

## Changes made

- Added shared public footer to the Home, public section pages, and root 404.
  Home-only motion controls and intro replay stay on Home.
- Added the canonical `metadataBase`, Home and section-specific titles,
  descriptions, canonical URLs, Open Graph and Twitter metadata.
- Added a sitemap containing only `/`, `/explore`, `/lab`, `/projects`, and
  `/events`; added its URL to `robots.txt`. Private app, design and share-profile
  paths are excluded.
- Added a branded 404 with public navigation and footer, and `noindex` metadata.
- Added a member error-boundary recovery path to the workspace and public site;
  the error text is announced to assistive technology.
- Added a visible project-search clear link that retains the selected list view
  and an Events first-page link that retains the active event filter.
- Removed shadowed request/event fallback entries and the unused mobile-nav
  component export.
- Moved member workspace CSS into the `/app` layout, design-preview CSS into
  `/design`, auth CSS into auth/account pages, and public-profile CSS into the
  member layout, design previews and public share route.
- Corrected deployment documentation: the telemetry component and filters exist
  but the component is not mounted in this source. No telemetry collection via
  that component is established here. MEC privacy/consent approval remains
  required before it is mounted.

## Checks

Initial local checks on this source: `npm run typecheck` passed,
`npm run lint` passed after removal of one unused import, and
`npm run test:boundaries` passed 208/208. `npm run build:acceptance` passed
using the repository's reserved `.invalid` Supabase fixture and with the member
gate off; it makes no live account or production-database claim.

`npm run test:acceptance` passed after adding checks for public sitemap contents,
the robots sitemap reference, titles and descriptions on five public routes,
Open Graph route URLs, the shared footer, and the actual 404 response and
metadata. The first browser run exposed two assertion issues: the root `og:url`
was emitted without a trailing slash, and Next.js supplied its own `noindex` for
the 404, making an explicit override duplicate it. The checks now match the
observed valid behavior and the duplicate override was removed.

The passing browser run covered five responsive widths in light and dark themes,
login/signup/recovery layouts, contrast, no-JavaScript content, motion and
reduced-motion interactions, keyboard focus, ten WCAG 2.2 AA route snapshots,
gated onboarding/staff previews, member Home/Lab skeletons, request drafts,
security headers, PWA registration and offline fallback. It explicitly leaves
real account creation, email delivery, Google/email login, recovery exchange,
real-member drafts, scoped permissions and operational backend journeys
unverified.

An independent read-only review found no blocking issue in the changed routes.
It recommended guarding the section map against inherited properties; both
metadata generation and page rendering now use `Object.hasOwn` before lookup.

The production acceptance build manifests confirm route-specific CSS. Before
the split, Home, Sign-in and `/app` each loaded the same three root CSS assets
(315,366 uncompressed bytes). After the split, the emitted route CSS totals
were Home 117,954 bytes, Sign-in 156,108 bytes, `/app` 252,021 bytes, design
preview 307,795 bytes and public profile 164,764 bytes. These are local build
asset sizes, not compressed network transfer measurements. The root
`globals.css` still contains shared base rules; a broader CSS-module rewrite was
not part of this change.

After the CSS split, `npm run lint`, a serial `npm run typecheck`,
`npm run test:boundaries` (208/208), `npm run test:proxy`,
`npm run build:acceptance`, and `npm run test:acceptance` passed. A concurrent
typecheck run initially returned TS6053 for generated `.next-acceptance/dev/types`
files while other checks were running; the serial typecheck passed. The
acceptance browser suite included the existing responsive, keyboard, reduced-
motion and WCAG 2.2 AA checks.

`npm run check:docs` is not defined in `package.json`; the repository's
`node scripts/check-docs.mjs` command passed with 108 documentation files and
505 local links. `git diff --check` also passed.

## Isolated maker-publication SQL evidence

The standalone maker-publication candidate and rollback were exercised with
`node scripts/db-runtime.mjs --maker-publication` on a disposable local
PostgreSQL 17.6 cluster. The run captured at
`2026-11-15T13:19:48.675Z` passed all checks. The exact sanitized machine
record is [maker-publication-runtime-2026-11-15.json](../research/maker-publication-runtime-2026-11-15.json).

The observed checks include private scratch identity, wrong-credential denial,
transaction rollback, private draft/publish/withdraw transitions, no anonymous
resolver, atomic and missing-marker rollback behavior, ACL matrix, NULL
admission denial, mutation-marker denial, one winning concurrent publication,
two sessions observed waiting on the account lock, refusal to roll back after
use even after cascade deletion, and scratch-cluster removal. Source hashes are
inside the machine record. The live shared project `huftzhfqnnslvnfzvbex` was
not queried or modified. No legacy Grow migrations were replayed.

This is a local working-tree experiment, not part of the reviewed Phase 1
website commit. The publication SQL edits and rollback artifact remain
uncommitted and are excluded from the PR update; the scratch run is not
installation approval and does not replace a current shared FK/ledger read.

## Findings still open or outside this scope

- `globals.css` still includes shared baseline auth/workspace selectors. Any
  broader CSS cleanup needs separate scope and regression coverage.
- Privacy, terms, cookie and telemetry-consent copy needs MEC approval. No legal
  policy text was invented or published.
- The production member/auth release gate remains unchanged. Real provider,
  recovery, shared Grow/Flutter compatibility, authenticated RLS and operational
  acceptance are still outstanding.
- `/app/borrowing`, staff production review flows, and real-time operational
  modules remain unavailable until their approved database contracts and
  institutional policies pass their own gates.
- `noindex`, self-declared MEC admission and payment after project completion
  remain unchanged.
- No production database, GitHub PR, Vercel deployment, or release setting was
  changed by this follow-up.

## Dependency audit follow-up — 18 November 2026

The hosted `npm audit --audit-level=high` check failed on PR head
`ebce6994b5acbb873a6bf9d049de46b0da8ca008`. Updated the direct Next.js
dependency from 16.4.2 to 16.4.6, which is beyond the fixed 16.4.5 versions
listed in the two applicable Next.js cache-disclosure advisories. The lockfile
was regenerated from the npm registry; no audit override or CI exception was
added.

After the update, `npm audit --omit=dev --audit-level=high` reports zero
production dependency vulnerabilities. The full audit still exits 1 with nine
high findings because `picomatch@4.0.7` is pulled into the development toolchain
through `fdir` and `tinyglobby` used by `typescript-eslint`. The reviewed GitHub
advisory currently lists no patched release. `npm audit fix --force` proposes
a downgrade to `typescript-eslint@8.47.0`; that breaking downgrade was not
applied. The repository's high-severity audit gate remains unchanged, so this
finding still blocks a green hosted foundation check.

On the updated local source, `npm run typecheck`, `npm run lint`,
`npm run test:boundaries` (218/218), `npm run test:proxy`,
`npm run build:acceptance`, and `npm run test:acceptance` passed.
`node scripts/check-docs.mjs` passed before this section was added; rerun it
after the documentation update. The browser suite covers public and gated
preview behavior only. Live account creation, provider callbacks, email
delivery, recovery, authenticated member workflows and Grow runtime
compatibility remain unverified. No database mutation, merge or production
deployment was performed.
