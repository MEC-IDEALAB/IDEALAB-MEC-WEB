# UI audit and corrections

## Poster-reference collage follow-up — 21 October 2026

The homepage hero now pairs its original maker illustration with a compact,
tilted Snapmaker A350T equipment print, using the supplied poster references for
the layered-paper composition. The photo comes from the site's locally stored
IDEA Lab facilities assets; the caption names the equipment and its actual
three functions. The editorial activity list above already applies the supplied
event-list reference through numbered metadata, colored marks, serif titles,
short descriptions and thin separators. These rows remain learning themes,
not a claim that dated events are scheduled. Desktop and 320 px production
captures were inspected; no horizontal overflow appeared. Current snapshots are
`artifacts/acceptance/home-hero-1440.png` and
`artifacts/acceptance/home-320.png`.

The current source passed Node 24.19.0 ESLint, TypeScript, all 28 boundary tests,
an optimized production build, the full local Chromium acceptance journey and
the documentation validation. The independent visual/source review found no
concrete issue in the collage. The installed Impeccable CLI does not provide
the documented `audit` subcommand; its detector reported two existing auth
story `side-tab` warnings and the existing notebook-grid advisory. The grid is
an explicitly approved brand treatment; the auth warnings are outside this
homepage change. This is a local UI review, not evidence of live account or
backend acceptance.

## Homepage editorial activity list — 21 October 2026

Reworked the homepage activity cards into a reference-inspired editorial list:
colored vector marks, numbered metadata, compact retro category labels, serif
italic titles, fine separators and short descriptions. It uses published
learning themes rather than exposing scheduled event records; current event
details and registration stay behind sign-in. Responsive browser acceptance
checks all three rows at the five homepage widths in both themes, and the 320px
layout remains within the viewport. The list keeps its motion subtle and turns
off row movement when reduced motion is preferred.

## Homepage highlights tickers — 21 October 2026

Added two responsive editorial tickers to the public homepage. The slightly
tilted black/yellow strip now sits below the public navigation; it omits the
repeated logo and divides institutional highlights with a double-backslash
separator. A muted grey band near the footer pairs activity/facility highlights
with color-coded labels and a dedicated pause/resume control. The control pauses
both tracks; hover/focus pauses incidentally until explicit resume.
No-JavaScript and reduced-motion layouts wrap all copy into still, readable
rows. A nonce-protected head script primes the animated state before paint on
repeat visits. A native checkbox keeps Pause/Resume operable when hydration is
delayed or fails. Browser acceptance measures the ticker regions and hero
before and after hydration, then checks client navigation away and back to
catch reflow. Each moving visual has a screen-reader summary.
Copy describes published institutional context; it is not presented as live or
breaking news.

The production build and full Chromium acceptance passed on this source. Browser
coverage checked five widths in light/dark themes, no horizontal overflow,
repeat-visit and client-navigation geometry stability, reduced-motion still
rows, all static ticker copy at 320px, pause/resume while focus and hover
remain, the header-to-ticker order, and the lower control's reserved space.
Desktop, mobile, no-JavaScript and reduced-motion captures were
inspected in `artifacts/acceptance/`. Lint, TypeScript, boundary tests (28/28)
and the 18-file/112-link documentation check also passed. Penpot was unavailable
in this session because the connected MCP reported no Penpot instance; this UI
pass was reviewed against the local design-system source and real-browser
captures instead.

## Public navigation follow-up — 21 October 2026

UI UX Pro Max is installed locally and was used for this keyboard-navigation
audit. The native mobile disclosure stayed open after Escape, and neither
navigation layout identified the current page. It now closes on Escape with
focus restored, closes on Tab departure, outside pointer and route selection,
and uses an underlined `aria-current="page"` link. Native HTML navigation still
works without JavaScript; no ARIA menu role or focus trap was introduced.

Real browser testing also reproduced a resize race after page navigation:
the browser can blur a hidden mobile control before its media-change listener
runs. Both event paths now restore focus to the current desktop link. The
regression journeys cover open and closed disclosure focus, the 800/801 px
boundary, selecting the current page, focusable and non-focusable outside
targets, and navigation without JavaScript. Screenshots are in
`artifacts/acceptance/navigation-mobile-open.png` and `navigation-mobile-closed.png`.

Node 24.19.0 lint, TypeScript, all 28 boundary tests, the isolated production
build and full Chromium acceptance passed locally on this change. Dependency
audit reported zero vulnerabilities. Independent source review found no
remaining concrete defect after the resize correction. Documentation/link
and diff checks are part of the pre-push gate; exact revision and hosted results
are recorded on draft PR #14. This public-navigation check does not establish
live Auth, profile persistence or operational database acceptance.

| Finding | Correction | Verification |
| --- | --- | --- |
| First-visit loader felt like a large reversing word wall and vanished at unpredictable points | Quiet repeated IDEALAB marks sit behind a maker card with an animated cube, circuit trace and indeterminate progress. Readiness waits for fonts and a paint; a 560 ms brand reveal exits with a 190 ms fade, while slow loads exit as soon as ready. Content becomes inert before its controls are parsed, the watchdog always releases it, and reduced motion skips the reveal. | Current-source browser run checks moving marks, pre-hydration Tab isolation, keyboard restoration after the normal exit and no-hydration watchdog, fast/slow readiness, fade, reload/navigation, reduced motion, jet-black theme and 320 px layout. See `artifacts/acceptance/wordmark-loading.png` and `wordmark-loading-dark-mobile.png`. |
| Theme picker required a menu | One 44 px light/dark toggle; initial browser preference fallback | Persistence, cross-tab, blocked-storage and OS fallback checks |
| Auth overflowed on shorter viewports | Compact forms and short-screen rules; omit decorative story on phones | Both routes fit 1366×768, 1440×900, 390×844 and 375×667 at normal zoom; zoom/keyboard scrolling remains possible |
| Typography lacked hierarchy | Modern Space Grotesk headings/DM Sans body; local Press Start 2P labels and MEC badge | Local font/build and screenshot inspection |
| Notebook texture too strong | Paper `#fcfbf7`, seven-percent grid ink; jet-black dark canvas preserved | Contrast, responsive and dark-canvas checks |
| Only three facility photographs | All eleven supplied equipment/software PNGs saved locally unchanged | Asset provenance and image-load assertions |
| Script sources were not restricted, and production session cookies lacked explicit protections | Proxy adds a per-request nonce CSP; Supabase session cookies use HttpOnly, Secure in production and SameSite=Lax. Style attributes are separately allowed for Next/Image layout while executable scripts stay nonce-gated. | Fresh nonce, inline-script nonce, protected-route policy and no-browser-CSP-violation checks in real production Chromium acceptance; live auth cookie issuance is unverified |
| Typing a second reference URL lost the textarea's trailing newline | Preserve raw text while editing and normalize the URL list only for validation, review and save | Production Chromium types URL → Enter → URL, checks both review links, then verifies both links survive automatic and manual draft restore |

The foundational UI and preview-guard audit was verified on PR snapshot `85b4ab2f5a17486542e82f0133231eedf7e80167`: ESLint, TypeScript, production build, 26 boundary tests, real Playwright browser acceptance and documentation validation (15 files/70 links) passed. Exact-head [Website CI and required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39517845382) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39517845380) passed. An independent source review confirmed the loader watchdog releases page interaction and the pre-hydration keyboard lock starts before app scripts arrive; a separate security review found and verified the fix for multiline dotenv parsing in the preview flag guard. Browser checks show moving marks, the controlled exit, keyboard/inert handoff, no-hydration recovery, a slow-load exit, reduced-motion fast exit, no repeated loader, and a fitted jet-black 320×568 view. The prior 375×667 auth overflow and hydration race in the old test helper remain corrected. No-JavaScript content, scroll/card animation, live reduced-motion cancellation, five responsive widths, both themes, local images, sample draft behavior, protected routes, fresh CSP nonces and no CSP errors are also covered. Preview drafts use page memory only, clear when leaving request-preview routes, and do not enter local or session storage. Later sign-in navigation uses a standard route skeleton. These checks use no live member identity and do not establish live auth or operational backend acceptance.

The 21 October follow-up fixed multiline reference entry without changing the draft schema. The production-browser test now types two URLs with the keyboard and checks review, automatic restore and manual replacement of unsaved text. Local lint, typecheck, all 23 boundary tests, dependency audit (zero findings), production build, Chromium acceptance, and documentation validation (15 files and 70 local links) passed on this follow-up source. On application commit `2e103d9292c5892841d82a6d4b46075fd0cf1cd6`, exact-head [Website CI and required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39507554000) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39507553977) passed. Live account success, recovery and OAuth; real-member draft behavior; scoped permissions; and operational backend workflows remain unverified.

The email-verification gate follow-up checks Supabase's server-returned
`email_confirmed_at` before loading the member's profile and displays a distinct
confirmation-required state. Node 24.19.0 lint, typecheck, 26 boundary tests,
`npm audit --audit-level=high` (zero findings), optimized production build,
real Chromium acceptance and documentation validation (15 files/70 local
links) passed on the current source. The independent security review found no
material defect in this scoped change. Browser acceptance still uses no live
member identity; Google/email account success, six-field onboarding persistence,
profile privacy, staff scope and operational workflows remain unverified. Keep
member activation disabled.

Application/test source commit `4141923468daa1d790645157497923f3e2664c0d`
adds responsive noindex recovery and reset-password pages, direct light/dark
toggles, focused feedback, and show/hide controls for both new-password fields.
The email-request response does not reveal whether an account exists. Source
uses a PKCE exchange against the fixed site callback and ignores caller-provided
return paths; browser acceptance exercised rejected callback paths while
password change requires a server-side authenticated user. The production
Chromium suite passed 320, 375, 768 and 1440 px checks in both themes and
verified no horizontal overflow. Exact-head [Website CI and required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39540469694)
and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39540469704)
passed on PR head `3c20ad3dff8e98918613134d2b9ff887062a4b2c`, which adds a
documentation-only update after the application source. The acceptance server
uses an `.invalid` Supabase URL; no live email or Auth request was made.
Successful recovery, email delivery and password update remain unverified.
Keep member activation disabled until the shared Auth/schema/security gate
passes.

The earlier email-verification gate revision `d2a310edf80d176bd10768e04dd31cde030b389e` passed hosted
[Website CI and the required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39510291937)
and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39510291938).

## MEC pilot preview — 21 October 2026

The opt-in onboarding preview now reflects the owner-approved MEC-only pilot
for both clients: six required values with read-only Model Engineering College
and five editable fields. Phone feedback requires a leading country code; the
registration preview accepts the supplied MDL/LMDL prefixes plus an alphanumeric
suffix without inventing course codes or exact lateral-entry suffix lengths.
Neither check establishes ownership, eligibility, availability or reachability.

Independent source review identified the earlier exact-suffix assumption; it
was removed and the reviewer confirmed the correction. Node 24.19.0 lint,
typecheck, 28 boundary tests, dependency audit (zero vulnerabilities), isolated
production build and the full Chromium acceptance passed locally. Browser
checks cover the canonical read-only college, five missing-field errors,
invalid phone/number feedback, linked summary focus, both prefixes, responsive
320/375/768/1440 px screenshots, memory-only values, no-JavaScript non-submission
and disabled-preview 404. Desktop dark and phone light artifacts were visually
inspected; screenshots finish finite theme transitions before capture.

These are preview/public-boundary results. Production signup, admission,
shared profile persistence, Google, account recovery and staff operations
remain unverified. First-claim ownership and the actual shared contract remain
gated; no live schema, account or permission was changed.

## Authentication evidence and blocker

Read-only inspection of the reconnected `grow-idealab` project on 21 October 2026 succeeds, including `select 1`, schema, policies, grants, triggers, migration ledger, branches and security advisors. The ledger contains only `20260503073726 create_initial_schema` and `20260503073744 add_rls_policies`; no development branch exists. Live `public.users` has a `role` field and `is_active`, while the canonical Grow SQL defines `base_role`/`system_role`, and Flutter auth/profile consumers read and write `role`. These are materially different contracts. No schema/data write or test identity was created.

The prior dashboard inspection reported Google/email providers and signups enabled with email autoconfirm enabled. The currently connected Supabase tool can read database schema and security metadata but cannot re-read Auth provider settings, so those settings are unverified now. This does not establish a successful account journey. OAuth and member activation flags remain disabled in the website.

Website Google OAuth initiation and PKCE callback use a configured canonical origin, fixed `/app` destination, private/no-store responses and no reflected provider errors. Both member and Google activation flags remain default-off. `AUTH_SITE_URL` must match the allowed callback origin. Tests cover gates and unsafe origin rejection; real successful Google/existing-account journeys remain unverified.

**Activation blocker:** live `users_read_all` grants every authenticated account a row-level `USING (true)` read across `public.users`; it does not apply to anonymous visitors. Own-row INSERT and UPDATE policies and broad table grants do not protect `role`, `is_active`, XP, reputation or other fields from a signed-in client changing its own row. No user provisioning trigger exists on `auth.users`. The same live metadata reports broad table privileges for `anon` and `authenticated`; RLS does not itself restrict `TRUNCATE`, although this audit did not establish a usable direct REST truncation path. No exploit was attempted. Flutter signup and Google sign-in also insert missing user rows from client code, while profile setup updates `role`; a trigger or column-policy change must coordinate those clients rather than strand existing accounts.

A fresh metadata-only check on 21 October confirmed the `users_read_all` predicate is still `true`, `public.users` still has no institution/department/current-year fields, and the Auth user table has no profile-provisioning trigger. The role table grant view lists DELETE, INSERT, SELECT, TRIGGER, TRUNCATE and UPDATE for both `anon` and `authenticated` on `users`, `user_profiles`, and `user_education` (plus REFERENCES). This is an additional least-privilege concern; no direct API or exploit test was performed. The same metadata shows `user_profiles` visible when `is_public=true` or to its owner, while `user_education` has owner-only row policies.

The mobile review found active cross-user name joins in `lib/features/projects/data/project_repository.dart` (project team chips) and `lib/features/admin/data/admin_repository.dart` (pending booking rows). This conflicts with the confirmed private-by-default policy for required onboarding fields. Preserve privacy with an optional minimal project-roster identity and a booking query restricted to Super Admin or the assigned machine/room head; show a generic member label when the person has not opted into roster display. Do not treat the current global `users_read_all` rule as the only route that needs compatibility work.

Supabase security advisors additionally report a mutable search path on `public.get_user_role()` and `public.set_updated_at()`, public execution of `get_user_role()` by `anon` and `authenticated`, and disabled leaked-password protection. The inspected `get_user_role()` body returns only the role for `auth.uid()`; the advisor warning still merits a reviewed grant/search-path decision. `btree_gist` in `public` is a separate configuration warning. No function or user rows were changed/read beyond schema and function metadata.

Before activation: reconcile the live `role`-based schema and two-entry ledger with the canonical `base_role`/`system_role` migrations; update the canonical schema and Flutter contract together; independently review a migration that restricts profile reads and makes authority server-controlled; verify ordinary profile edits, email signup, Google provisioning and denied role/status changes against a safe validation environment. There is no existing Supabase development branch. Creating one requires a cost check; no branch or paid resource was created. Applying a specific reviewed schema change to the shared project still requires the user's explicit authorization. No schema/permission change, data write, signup or exploit was performed. Frontend flags do not repair risks for existing Flutter clients.

References: [Supabase Google auth](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Tracked remediation: [backend activation gate #15](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/15).

The 21 October manual preview check found that the existing port-3015 `next start` process was serving a previous build manifest: its CSS and JavaScript chunk URLs returned HTTP 500 and the page rendered as unstyled HTML. Restarting the local server against the current production build restored the styles; this was a stale preview process, not a source stylesheet failure. The same audit found sign-in overflowed a compact 320×568 viewport by 79 px. The short-height auth layout now fits while retaining 44 px fields/actions, and its support/join links share a compact footer line. The browser acceptance suite now asserts themed styles are applied and that both sign-in and sign-up fit 320×568 with no page scroll; these checks passed with the full Chromium acceptance run. The source still keeps real account/provider entry disabled pending backend compatibility and live auth verification.

## Student V1, onboarding and staff wireframe audit — 21 October 2026

The student preview now exposes nine no-data destinations: Home, Lab, Profile,
Projects, Events, Requests, Notifications, Visits and Borrowing. The separate
MEC onboarding preview shows the confirmed six-value profile and self-declared
pilot without implying roster verification or data submission. The staff preview
maps Machine/Room, Operations, Events and Super Admin scopes without assigning
roles or enabling records/actions. MagicPath project `463330845164449792` now
includes onboarding desktop/mobile and staff workspace desktop/mobile frames in
addition to the homepage and student workspace. The account-access wireframe is
documented in `experience.md`; MagicPath's API quota was exhausted before its
extra frame could be created.

Independent read-only wireframe review found no remaining P1/P2 UX, accessibility
or responsive issue in the student workspace preview. The intentional notebook
cross-grid remains the Impeccable detector's only advisory. A system-theme edge
case was corrected: Home notes, Profile summary and privacy panels now remain
near-black with readable text on a first visit when the OS is dark and no theme
choice is stored. The production-browser journey emulates OS dark and light on
Home and OS dark on Profile, verifies the `system` setting and theme-toggle
state, and checks near-black surfaces and text contrast. The theme helper waits
for finite CSS transitions before measuring contrast, avoiding false failures
mid-transition.

Current local web source passed Node 24.19.0 `npm run lint`, `npm run typecheck`,
all 28 `npm run test:boundaries` checks, dependency audit (zero vulnerabilities),
`npm run build:acceptance`, full `npm run test:acceptance`, documentation validation
(18 Markdown files/112 local links) and `git diff --check`. Chromium covers
320–1440 px layout widths, the 761–980 px tablet card behavior, mobile safe-area
clearance, navigation semantics, both explicit themes, system theme fallback,
reduced motion and no-data/API isolation. The independent reviewer inspected the
page map and current source; the rendered mobile Home and dark Profile previews
were also inspected manually. These results validate local layout previews, not
live member data, authentication, database persistence, staff authorization or
operational V1 workflows; the member feature flag remains off.

The public sign-in and sign-up pages now state that account access is unavailable in this release and direct students to the lab team, replacing the old “being connected” notice. Both routes remain gated until the shared database, Auth and coordinated-client checks pass.

## Shared member navigation and responsive-shell follow-up — 21 October 2026

The public homepage now uses the supplied editorial event-list and poster
references as inspiration: factual learning-activity rows, notebook-grid
surfaces, bold framed type and a tilted, captioned Snapmaker object-study
collage. The user-provided artwork was not copied. A production Chromium
capture of the rendered hero and complete homepage was visually inspected.

The real member layout and the explicitly data-free student design preview now
share a workspace shell. Desktop navigation collapses to an icon rail, Settings
stays anchored at the lower left, Notifications sits at the upper right, and
the phone layout uses four primary bottom-navigation anchors with a keyboard-
operable More popover for secondary destinations. Visits, Borrowing and Settings
have protected routes and clear unavailable states; they do not manufacture
account settings, visit history or inventory.

Current Node 24.19.0 ESLint, TypeScript, 28 boundary tests, 18-document/113-link
validation and `git diff --check` passed. The optimized Next.js production build
and full local Chromium acceptance passed. That run checks five viewport widths,
light/dark themes, preview navigation and browser Back, menu keyboard behavior,
reduced motion, no-data isolation, preview-disabled 404s, recovery boundaries and
security headers. Inspected captures include the homepage, the student Home
layout and the open More menu. An independent source review confirmed the
desktop Settings presentation, route-aware More menu closure, Machine and
Operations request wording and current mobile capture.

This confirms the public pages and non-operational design previews only. Live
account creation, OAuth, real member sessions, shared profile/data persistence,
scoped staff permissions and operational request, visit or borrowing workflows
remain unverified; the member feature flag remains off.

The final mobile shell review corrected left/right safe-area padding and raised
the theme and Notifications controls to 48 px with an 8 px gap, including the
older narrow-phone preview overrides. Chromium asserts their rendered size and
the full responsive acceptance run passed again. The UI detector's notebook-grid
advisory and split-pane accent-border warnings are intentional: the owner
explicitly requested notebook-cross surfaces and supplied split-panel auth
references. The bundled detector ran; its separate `audit` verb is not supported
by this installed executable, so technical verification used the browser suite,
the detector output and independent source review.
