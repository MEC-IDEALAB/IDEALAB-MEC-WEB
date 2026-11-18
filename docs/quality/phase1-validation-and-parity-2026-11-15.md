# Phase 1 validation and parity checkpoint - 15 November 2026

## Current addendum — 18 November 2026

This addendum supersedes the historical Task 2 and current-status statements
below where they describe the freshness of shared FK telemetry. The 15 November
checkpoint remains as a record of the earlier blocked connection attempts.

### Auth/recovery/session test rerun

The four requested commands were rerun individually from the current website
worktree on 18 November. All are deterministic local SDK-fixture tests; they do
not connect to the validation Supabase project. Setting
`ACCOUNT_ENVIRONMENT=validation` does not change that. The separate live
validation-project acceptance remains unverified.

| Command | Result on 18 November |
| --- | ---: |
| `node scripts/auth-entry.test.mjs` | 11 passed, 0 failed |
| `node scripts/recovery-authority.test.mjs` | 8 passed, 0 failed |
| `node scripts/recovery-update.test.mjs` | 7 passed, 0 failed |
| `node scripts/active-session.test.mjs` | 3 passed, 0 failed |
| `npm run test:boundaries` | 218 passed, 0 failed |

Combined individual suites: 29 passed, 0 failed. Node emitted the
`MODULE_TYPELESS_PACKAGE_JSON` and experimental type-stripping warnings; these
did not fail the commands.

### Shared FK telemetry and candidate

Fresh read-only telemetry on 18 November reported 8 advisor findings and 9
strict catalog coverage gaps. The extra `tool_bookings(tool_id)` FK is served
only by status-filtered partial indexes. The migration ledger query returned
four entries. A nine-index candidate/rollback passed the disposable PostgreSQL
17.6 rehearsal; details and the raw output are in the [database validation
record](phase1-database-validation-2026-11-18.md). No shared production writes
were made. The exact deployed advisor implementation/version and full schema
provenance remain unverified.

### Grow direct-write scan — read-only, 18 November

The inspected Grow repository root is
`F:/kannan/projects/IDEALAB/Grow`; that checkout is dirty and was not modified.
Current repository-wide source search under `lib/` found four direct
`public.users` write statements below (paths are relative to that root). It
found no direct `insert` or `delete`, and no additional `from("users")` writes.

| Source path and line | Direct write | Observed route/call path |
| --- | --- | --- |
| `lib/features/auth/data/auth_repository.dart:151` | `upsert` | `ensureUserProfileExists`; called by signup (`:88`), email sign-in (`:111`), Google sign-in (`:125`), and the missing-row `getCurrentUser` fallback (`:241`), also reached by splash (`lib/features/auth/presentation/screens/splash_screen.dart:56-57`). |
| `lib/features/auth/data/auth_repository.dart:293` | `update` | `updateProfile`; called by avatar saving (`lib/features/profile/presentation/screens/profile_screen.dart:52-54`) and basic-profile editing (`lib/features/profile/presentation/screens/edit_subpages/rc5_edit_basic_profile_screen.dart:73-76`). |
| `lib/features/auth/presentation/screens/rc5_onboarding_screen.dart:143` | `update` | Writes `profile_completed`; routed from `/profile-setup` (`lib/core/router/app_router.dart:228-230`) and opened by splash for incomplete profiles (`lib/features/auth/presentation/screens/splash_screen.dart:89-90`). |
| `lib/features/auth/presentation/screens/profile_setup_screen.dart:45` | `update` | Direct write exists; current source search found no route or other instantiation of `ProfileSetupScreen`. |

The current source still defines `save_own_profile_v1` in
`lib/features/auth/data/shared_account_gateway.dart:180` and
`claim_mec_registration_v1` at `:214`. `lib/features/auth/domain/shared_account_config.dart:28-36`
reads the compile-time `bool.fromEnvironment` values
`ENABLE_SHARED_ACCOUNT_FLOW`, `ENABLE_SHARED_PROFILE_READER`,
`ENABLE_SHARED_PROFILE_WRITER`, `ENABLE_SHARED_REGISTRATION_CLAIM`, and
`ENABLE_VALIDATION_ACCOUNT_FLOW`. Its `enabled` gate requires the shared flow,
reader, writer and claim flags, the exact shared target, a public client key,
and validation mode off. The three write-path flags are flow, writer and
registration claim; the reader is additionally required by the overall gate.

These flags route guarded operations through the shared gateway but do not
remove the direct-write statements from the current source tree. Cross-client
build routing and deployed runtime behavior remain unverified. No Grow files or
build flags were changed.

This checkpoint records execution of the remaining local Phase 1 tasks. It is
not a production release or a shared database migration approval.

## Task 1 - Projects navigation

`src/app/app/projects/page.tsx` defaults to `mine`; `/app/projects` opens My
projects and `/app/projects?view=discover` opens Discover. Search, pagination,
and invalid-link recovery preserve the selected view. The current source passes
TypeScript, lint, the Projects contract tests in the 208-test boundary suite,
and the full local browser acceptance suite. No authenticated live member
journey was performed.

## Task 2 - Shared-project foreign-key telemetry

The target was confirmed by reference as `huftzhfqnnslvnfzvbex`. The Supabase
project listing and a project-detail read reported it as `ACTIVE_HEALTHY` on
PostgreSQL 17.6.1.166. The performance-advisor request failed twice with the
Supabase MCP response that internal project `29957206` was hibernated and would
wake on a supported request. A separate read-only `pg_catalog` query returned
`28P01` password-authentication failure for the PostgreSQL user. Neither route
returned FK telemetry. The CLI fallback is unavailable (`supabase` is not
installed).

The earlier 6 November captured advisor and catalog output records eight
unindexed foreign keys and reconciles the original discrepancy between audit
documents 06 and 13; see [the dated telemetry record](../research/shared-fk-telemetry-2026-11-06.json).
The 15 November read-only attempts could not refresh that list, so this
checkpoint does not establish whether those findings remain current. No new
shared-production candidate or rollback was authored: guessing refreshed
constraint state would be unsafe. The validation-only index candidate was not
applied to production. No shared-production schema, index, RPC, role, or row
was changed. Refresh live advisor and catalog output before any installation
decision.

## Task 3 - Requested auth/recovery/session tests

The four named commands were run individually in the local website checkout:

| Command | Result |
| --- | ---: |
| `node scripts/auth-entry.test.mjs` | 11 passed, 0 failed |
| `node scripts/recovery-authority.test.mjs` | 8 passed, 0 failed |
| `node scripts/recovery-update.test.mjs` | 7 passed, 0 failed |
| `node scripts/active-session.test.mjs` | 3 passed, 0 failed |

Combined: 29 passed, 0 failed. These are deterministic local regression tests
using SDK fixtures/stubs. `scripts/phase1-validation.mjs` explicitly describes
them as using no network or database. Setting `ACCOUNT_ENVIRONMENT=validation`
does not turn these test files into validation-project acceptance tests. No
validation database session, account, recovery link, or row was exercised; the
requested live validation acceptance remains open.

Observed fixture behaviors:

| Suite | Verified behavior in local fixtures |
| --- | --- |
| Auth entry | Only the server-verified account ID is accepted. Network/provider failures and malformed identities fail closed. A definite signed-out result is required before login/signup/recovery actions. Provider callback copy and destinations are not reflected; callbacks do not clear an existing or uncertain session. |
| Recovery authority | Recovery requires fresh verified claims bound to the same account and session, with the recovery method. Ordinary login/OAuth, editable metadata, stale/future claims, identity/session switches and verification errors do not grant authority. |
| Recovery update | Disabled or invalid attempts do not read an account or update a password. The password update follows an explicit successful consumption receipt. Lost/uncertain outcomes require a fresh link. Cleanup failure does not report that the browser signed out. |
| Active session | Elapsed time derives from the saved check-in timestamp, never goes negative or wraps after 24 hours, and the in-app reminder threshold is two hours. This is timer logic only, not OS notification delivery. |

## Task 4 - Grow Flutter profile-write parity

The separate Grow checkout contains extensive dirty user work and was not
modified. Read-only source inspection found four direct `public.users` write
statements in `F:/kannan/projects/IDEALAB/Grow/grow`:

| Source | Write | Reachability |
| --- | --- | --- |
| `lib/features/auth/data/auth_repository.dart:151-156` | `upsert` | `ensureUserProfileExists`; called from email signup (`:88`), email sign-in (`:111`), Google sign-in (`:125`), and a missing-row `getCurrentUser` fallback (`:241`). Splash invokes `getCurrentUser` (`lib/features/auth/presentation/screens/splash_screen.dart:56-57`). |
| `lib/features/auth/data/auth_repository.dart:278-294` | `update` | `updateProfile`; called by avatar saving (`lib/features/profile/presentation/screens/profile_screen.dart:52-54`) and basic-profile editing (`lib/features/profile/presentation/screens/edit_subpages/rc5_edit_basic_profile_screen.dart:73-76`). |
| `lib/features/auth/presentation/screens/rc5_onboarding_screen.dart:143-145` | `update` | Writes `profile_completed`; `/profile-setup` routes to `RC5OnboardingScreen` (`lib/core/router/app_router.dart:228-230`), and splash navigates there for incomplete profiles (`:87-90`). |
| `lib/features/auth/presentation/screens/profile_setup_screen.dart:45-48` | `update` | Direct write exists, but source search found no route or other instantiation of `ProfileSetupScreen`; it is not the routed `/profile-setup` screen. |

Global source search found no direct insert/delete call and no additional
`from('users')` writes. This is a source-level call-site inventory; it does not
prove which branch a deployed build executes or whether the live database
accepts the calls.

`lib/features/auth/domain/shared_account_config.dart:24-36` reads these compile-
time Dart defines, all false by default:

- `ENABLE_SHARED_ACCOUNT_FLOW=true`
- `ENABLE_SHARED_PROFILE_READER=true`
- `ENABLE_SHARED_PROFILE_WRITER=true`
- `ENABLE_SHARED_REGISTRATION_CLAIM=true`
- Keep `ENABLE_VALIDATION_ACCOUNT_FLOW=false` for the shared target.

The shared target URL must match the configured exact IDEALAB project and the
client key must be public. The enabled gate at `shared_account_config.dart:59-66`
requires the requested shared flow, target, reader, writer and claim gates, and
rejects validation mode. `shared_account_gateway.dart:172-185` sends profile
saves to `save_own_profile_v1`.

These defines enable the guarded shared gateway; they do not erase every legacy
`AuthRepository` or profile-screen table write from the source tree. Shared
build routing and runtime behavior remain unverified. Flutter and database
owners must review/disable the remaining direct-write paths before claiming
cross-client parity. No Grow file, build flag, environment value, or database
was changed or inspected for secrets.

## Current status

- Complete locally: Projects navigation correction and the four local fixture
  suites.
- Blocked: a current shared-project advisor/catalog refresh; prior dated
  telemetry exists, but its freshness could not be confirmed because neither
  15 November read path returned FK data. No new shared-FK candidate was
  authored from the blocked reads.
- Unverified: tests against `gvvqlfachzbufstzoiwi`; no production or validation
  database mutation was performed in this checkpoint.
- Complete source audit only: Grow direct-write call sites and the shared-flow
  compile-time flags are documented. Cross-client build/runtime acceptance and
  removal or safe gating of every legacy write remain open.
