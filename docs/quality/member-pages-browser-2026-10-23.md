# Authenticated member pages and backend check — 23 October 2026

## Scope and handling

Read-only acceptance against the local website at `http://127.0.0.1:3015` using
the already signed-in validation-project browser session. No account fields,
emails, phone numbers, registration numbers, credentials, request titles or
session values were copied into this record. No database writes or setting
changes were made.

The latest website source baseline is commit
`0504b41a1427640bd8fcbdeda48423f5ea24c05a`, with the existing dirty worktree
and all prior implementation preserved. The running local member site is a
production build from that checkout. This evidence only covers the current
isolated validation account, not production Grow or a second admitted student.

Key current-source SHA-256 fingerprints:

- Home page: `4c862850580511455d35f86e39b42e97be77621cc344e227f62d21ff1d961a61`
- Lab page: `ba21271662bfdce6ed69ad384fd8ea1bc5a329fa59285b56eef1f5434ff8f8cf`
- Profile page: `41f54c0e5740ad78ef0a2c5098bdf102543856039bd75b78d58fde0b3fe7155c`
- Member shell styles: `89e075d53528ee72d359d111cf9d2b687ec100a0f5e717d37d92d664ed9c673c`
- Acceptance suite: `f38ef3b0534512462541ab7e1d235ef1320b68db69eec5493a87f43a34f09cf1`

## Browser checks

| Page | Widths checked | Evidence |
| --- | --- | --- |
| Home | 320, 390, 768, 1366 px | Rendered Home heading and four main sections; navigation and 14 main links present; no horizontal overflow. |
| Lab | 320, 390, 768, 1366 px | Rendered Lab overview, current open/closed state, visits and page sections; no horizontal overflow. |
| Profile | 320, 390, 768, 1366 px | Rendered the six saved private-field labels; one-column layout at 320/390 and two-column layout at 768/1366; no horizontal overflow. Values were deliberately not recorded. |

The Home/Lab/Profile hierarchy follows the Grow app's identity-first Home,
visit-focused Lab and account-first Profile pattern while retaining the
approved website top navigation. The browser console had zero errors during
the current Home view. These were layout/read checks: no request, visit,
opening-duty, profile-save or account action was submitted.

The real-browser public/auth acceptance suite also passed on this source build:
public route and security-header checks, five-width light/dark responsive
coverage, loading motion and one-time behavior, reduced-motion handling,
keyboard navigation, sign-in/sign-up/recovery layouts, form boundaries,
recovery rejection and configured callback guards. Its fixture uses a reserved
`.invalid` Supabase origin with member activation disabled. It does not prove
live email delivery, password signup/login/recovery, or Google OAuth; the
separate genuine Google sign-in remains the only confirmed provider journey.

## Code checks

Node 24 ran the following checks against the current website checkout:

- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- `node --test` over all 17 project boundary-test files — 100 passed, 0 failed.
- `node node_modules/eslint/bin/eslint.js .` — passed after excluding `.local/**`
  generated build copies from the source lint set.
- `node node_modules/next/dist/bin/next build` — optimized production build passed.
- `node scripts/acceptance.mjs` — public/auth browser suite passed; live account
  creation, delivery and member writes remained explicitly unverified.

## Validation-project database review

Read-only Supabase metadata checks on `idealab-mec-validation` reported an
active, healthy PostgreSQL 17.11 project and nine installed validation
migrations. No table contents or Auth records were queried.

The security advisor reports 18 `RLS enabled, no policy` notices across the
RPC-only private journal tables and several public-schema tables, plus a
warning that leaked-password protection is disabled. A metadata privilege
query confirmed `anon`, `authenticated` and `service_role` have no direct
SELECT/INSERT/UPDATE/DELETE grants on `public.users`, `lab_sessions`, `projects`,
`project_members` or `events`; the website reads and writes through explicitly
granted authenticated RPC wrappers. All 15 `idealab_private` tables likewise
have zero direct SELECT/INSERT/UPDATE/DELETE grants to those roles. Therefore,
the no-policy notices do not
mean those roles can read those tables, but the Auth password-protection warning
remains a security follow-up. The validation organization is on Supabase Free;
the current [password security documentation](https://supabase.com/docs/guides/auth/password-security)
lists leaked-password protection as Pro and above, so it cannot be enabled in
this project without a plan change. No upgrade or Auth setting was changed.

Performance advisories report ten unindexed foreign keys and one unused index.
They were left unchanged: the validation project is small, unused-index removal
needs workload evidence, and schema changes require a reviewed migration rather
than an opportunistic production-like edit. Production `grow-idealab` was not
queried or modified in this check.

## Remaining release gates

Email/password confirmation and recovery still need a genuine private test
journey and an approved SMTP sender. Work-request online persistence/cancel,
Events interaction, second-student privacy/concurrency, Flutter/shared-schema
compatibility, staff review and operational workflows remain incomplete or
unverified. Production migration, rollout, push, deployment and release approval
are not established by this local acceptance.
