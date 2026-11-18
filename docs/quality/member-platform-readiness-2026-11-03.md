# Member platform readiness — 3 November 2026

This is a read-only status record for the standalone website and the shared
Grow/IDEALAB MEC Supabase project. It contains no member rows or credentials.

## Pages and user flow

- The design-only member preview is gated by `ENABLE_DESIGN_PREVIEW` and does
  not read account records or submit operations.
- Home has the top highlights and bottom quote motion bands, a touch-first
  featured-activity carousel with explicit previous/next controls, learning and
  support links, facilities/team links, and an explicit note that donations are
  not connected. The carousel does not advance while members are reading and
  follows reduced-motion preferences.
- Lab order is primary navigation → highlights band → monochrome image with
  Wi-Fi and electricity symbols only → one responsive Quick access card →
  opening/check-in/history content → quote band. The symbols report unknown;
  no live utility state is fabricated.
- Lab presence and utilities are unconnected. The preview sign-in actions show
  the intended check-in/history flow but do not create a session. Home mentor,
  team, and support actions open email; they do not create submissions or
  bookings.
- Profile edits the current private account fields. Public sharing/QR is
  disabled pending the cross-client API and privacy cutover. Education,
  work, volunteering, user-selected badges, and avatar delivery are not yet
  persisted by this member profile slice.

## Shared Supabase evidence

The active Supabase project is currently displayed as **IDEALAB MEC,** (the
returned project name includes a trailing comma) by the connected Supabase MCP
and was reported `ACTIVE_HEALTHY`. The separate
`idealab-mec-validation` project is currently inactive. The live project was
inspected through read-only Supabase MCP metadata and function-definition
queries. The recorded migration ledger contains four migrations:

1. `20260503073726` — `create_initial_schema`
2. `20260503073744` — `add_rls_policies`
3. `20261102083307` — `shared_access_hardening_v1`
4. `20261102130200` — `shared_profile_contract_v1`

The last two are the specifically approved and installed access-hardening and
account-profile migrations. No migration or database write was made in this
review. The relevant installed account APIs include the owner profile read/save
and MEC registration claim. The inspected `public` and `idealab_private`
catalog contains no project, event registration, lab opening, presence, visit,
tool booking, borrowing, or public-profile RPC. Existing tables alone do not
establish usable PostgREST access or a cross-client contract.

### Supabase advisor snapshot

The connected advisor snapshot was observed at 2026-11-02 22:58:58 UTC; counts
below are lint findings, not proof that a query is slow or an exploitable path.

- Security: three private-schema RLS tables with no policies (INFO), the
  `btree_gist` extension in `public` (WARN), two authenticated SECURITY DEFINER
  functions (WARN), and leaked-password protection disabled (WARN).
- Performance: eight foreign keys without covering indexes, 59 RLS policies
  where auth lookups may be re-evaluated per row, two tables with overlapping
  permissive policies, and 21 indexes reported unused in the observed period.
- The private no-policy tables are `profile_contract_baseline_v1`,
  `mec_registration_claims_v1`, and `mec_registration_collision_state_v1`.
  Their installed contract forces RLS and revokes direct client grants, so the
  INFO findings are intentional. Do not add direct policies to silence them.
- The two flagged RPCs were inspected read-only. `get_own_profile_v1` requires
  a verified signed-in user, uses a fixed empty search path, and returns the
  `auth.uid()` row. `get_user_role` reads only the caller's own role and pins
  `search_path` to `pg_catalog`. Authenticated execution is part of the profile
  API for the first function. A source search did not find an explicit client
  RPC call to `get_user_role`; confirm policy and shipped-client dependencies
  before deciding whether to retain its authenticated grant. Do not blanket
  revoke SECURITY DEFINER functions to clear the warning.
- `btree_gist` supports Grow's booking-overlap exclusion constraint. Do not drop
  it. Relocation from `public` needs a local rollback trial and checks for
  relocatability, extension schema exposure, and dependent objects.
- Supabase's current [password security guidance](https://supabase.com/docs/guides/auth/password-security)
  says leaked-password protection is Pro+; the website's eight-character
  minimum does not replace that screening. This is plan-gated.
- The eight unindexed foreign keys are `events_club_id_fkey`,
  `events_created_by_fkey`, `knowledge_articles_author_id_fkey`,
  `project_members_user_id_fkey`, `projects_club_id_fkey`,
  `fk_bookings_project`, `tool_bookings_approved_by_fkey`, and
  `fk_users_club`. Check query plans and current index prefixes before proposing
  any index changes. The overlapping authenticated SELECT policies are
  `notif_select_own`/`notifications_select_own` on `notifications` and
  `bookings_select_admin`/`bookings_select_own` on `tool_bookings`; PostgreSQL
  combines permissive policies with OR, so review their access semantics before
  changing them. The unused-index advisory does not include index names in its
  returned metadata; do not drop any index based on that count alone.
- No project setting or database object was changed from this advisory review.
  Leaked-password protection and SMTP/email delivery still need a plan-aware
  Auth configuration review. Performance policy/index changes need exact
  SQL, rollback/concurrency evidence, Flutter compatibility review and
  approval before installation.

### Operational candidate and Grow compatibility

The repository contains SQL candidates and historical synthetic tests for
several operations, but those candidates target the inactive validation
project and do not establish a production contract:

- Lab opening and own-visit candidates exist. The visit-write candidate assumes
  an empty `lab_sessions` table and removes direct writers; Grow Flutter still
  reads and checks out of that table directly. It cannot be installed against
  shared history as written. No candidate supplies the requested live-presence
  projection or Wi-Fi/electricity status API.
- Work-request intake has submit/read/cancel candidates, but staff review,
  scheduling and notification flows are incomplete. Its account-deletion
  trigger and anonymized retention behavior need reconciliation with Grow.
- There is no shared tool-booking/borrowing candidate. Grow currently performs
  a client-side overlap preflight followed by separate direct writes; that is
  not an atomic booking contract.
- Event candidates are read-only. Grow RSVP, seat-count and notification writes
  remain separate operations, and its event-state vocabulary/schema differs
  from the candidate. No atomic registration, payment or attendance API exists.
- The active project has no project RPCs. The website and Grow Flutter client
  use matching account-bound create RPC names and argument shapes in the six
  archived isolated-validation patches. Those statements are not installed in
  the active project; current checked-in candidates are not an exact migration
  chain. A new static contract test guards the website adapter and archive
  fingerprints but does not claim live RPC or cross-client E2E proof.
  Project membership also needs a trusted owner/head authority path.
- Private profile read/save/claim is the only confirmed shared member API.
  Public profile, interest, share-QR, media, and cross-client privacy APIs
  remain disabled or uninstalled.

Run candidate SQL and rollback/concurrency checks on a disposable local
PostgreSQL 17 fixture. Do not use the active IDEALAB MEC database as the
validation environment, and do not treat historical isolated-project passes as
current production acceptance.

## Safety and release gates

- `src/lib/config.ts` source-disables hosted member access. A Vercel environment
  flag alone cannot activate it.
- `src/features/profile/public-profile-config.ts` now keeps optional public
  profile calls off even when its old flag is set. The installed schema lacks
  the three expected public-profile RPCs, and the Flutter cutover is incomplete.
- Independent review of `Grow/supabase/candidates/shared_public_profile_v1.sql`
  found the candidate revokes direct access to eight ecosystem tables. Legacy
  rows remain stored but the new API cannot return them to their owners. The
  Flutter app still has direct callers. The saved passing SQL result does not
  include the current candidate or its concurrency checks. Keep this candidate
  uninstalled until the owner-read path, Flutter compatibility, complete
  current-source SQL/rollback/concurrency evidence, and exact migration approval
  are resolved.
- Existing account/auth presentation tests do not prove live signup, email
  delivery, Google callback, recovery, real member sessions, or production
  authorization.

## Local verification — 3 November 2026

- Verification used Node.js 24.22.1, matching the repository engine range.
- `npm run test:member-space` passed on a fresh optimized preview build with 42
  responsive layouts, 12 axe snapshots, and assertions for the featured
  activity carousel's three slides, next/previous movement, count, and return
  to the first slide. Coverage includes 320/390/1440px, both themes, touch,
  landscape, 200% text, reduced-motion, keyboard and no-JavaScript states.
  It also verifies Profile → Settings, the new member-settings preview,
  Home/Lab and Your details navigation, plus Browser Back/Forward history.
- `npm run test:acceptance` passed on the current checkout: public journey,
  five widths in both themes, auth/recovery layouts, security headers, PWA
  registration/offline fallback, reduced-motion and loader timing, skeleton
  layouts, and responsive member Home/Lab preview. The test explicitly reports
  real account creation, email/Google auth, recovery and operational member
  workflows as unverified.
- `npm run build`, `npm run lint`, `npm run typecheck`, and
  `npm run test:boundaries` (180 passed) all passed on Node.js 24.22.1.
  `npm run test:proxy`, `npm run test:request-journal`,
  `npm run test:project-journal`, docs validation (73 files / 363 local links),
  `npm audit --audit-level=high` (0 vulnerabilities), and `git diff --check`
  also passed during this local work cycle.
- The recovery callback now exchanges an email code only when the current
  session is definitely signed out; existing or uncertain sessions are routed
  away from recovery. The password-reset action also requires a signed-out
  entry before contacting Supabase. These are locally tested guardrails; the
  production recovery feature remains disabled and its real email/code flow is
  unverified. Session inspection is a preflight check, not an atomic lock
  against concurrent browser requests.
- Browser checks used isolated preview data and no real member session. No
  live signup, email delivery, Google callback, recovery, storage, operational
  authorization or cross-client Flutter journey was exercised.

## Next implementation sequence

1. Define and version the operational contracts for core-managed utility
   status, opening periods, presence, visits, work requests, tool reservations,
   events and projects.
2. Reconcile each contract against existing Grow Flutter repositories and
   offline behavior; add RPC adapters before removing any legacy access.
3. Build exact migration candidates with deny-by-default tests, real PostgreSQL
   rollback and concurrency evidence in a disposable environment. Address the
   observed RLS/index lints only after checking query plans, current policies,
   existing indexes and Flutter client dependencies.
4. Request approval for one exact shared-project migration, with hash, scope,
   downtime/cutover steps, and rollback. Do not infer blanket approval from the
   request to finish the product.
5. Complete real provider/email and both-client acceptance before enabling
   hosted member access, then run current-head CI and independent review.

No production schema writes, client deployments, pushes, merges, or releases
were performed for this checkpoint.

## Follow-up — PR #67, 3 November 2026

- The website work is now pushed on `codex/member-platform-readiness-20261103`
  at `c2fa18ffcc57c1692d06585b223f78eb3f7970bf`. The change makes the ASCII
  auth canvas cancel its animation frame as soon as the global motion control
  is paused; the member browser suite covers pause behavior.
- On Node.js 24.19.0, the exact source passed `npm run build`, `npm run lint`,
  `npm run typecheck`, `npm run test:boundaries` (180/180),
  `npm run test:acceptance`, and `npm run test:member-space` (42 responsive
  layouts and 12 axe snapshots).
- Hosted Documentation CI, Website CI and its required gate passed on PR #67's
  exact head. The Vercel PR preview deployed and returned HTTP 200. This is a
  preview deployment only; no production deployment or database write occurred.
- PR #67 remains draft. Live Google/email confirmation/recovery, real signed-in
  onboarding, the coordinated Grow Flutter permission cutover and operational
  APIs remain unverified or uninstalled. The GitHub API reports `main` has no
  server-enforced branch protection. Do not interpret preview CI as production
  authorization or a full production-readiness pass.
