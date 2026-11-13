# Phase 1 — database reconciliation and isolated checks, 6 November 2026

This is a scoped local execution record, not shared-production migration approval
or production authentication acceptance. Branch:
`codex/member-platform-readiness-20261103`; base HEAD:
`755b0d02f29c0b0bd34bdd42ce15e0be0b62a779`, with pre-existing dirty work preserved.
Only the already-completed two-line Projects fix is staged. No commit, push,
merge, deployment, shared DDL, shared data write, role assignment or release-gate
change was made. Grow was inspected read-only.

## Task and evidence ledger

| Task | Owner | Dependencies | State | Evidence / QA | Next action |
| --- | --- | --- | --- | --- | --- |
| Projects navigation | Main | Existing confirmed fix | Staged | Default My projects; explicit Discover; search, paging and recovery retain view; pre-checks passed | Keep isolated from unrelated work |
| Pre-DB-01 telemetry | Main / Supabase MCP | Read-only shared access | Completed | Eight advisor warnings matched catalog FK columns and references | Refresh before any future installation |
| Shared FK candidate | Main / independent SQL reviewer | Confirmed telemetry | Rehearsed locally | Forward, repeat apply, guarded rollback and negative cases on PG17.6; review requested locking before metadata checks and this was incorporated | Separate full-baseline and maintenance review before production |
| Named auth/session suites | Main | Current source | Passed, 28/28 | SDK-fixture regression tests; actual validation SQL denial separately recorded | Real provider/email/browser acceptance remains open |
| Flutter parity | Read-only explorer / main | Current sibling source | Source inspection complete | Legacy call sites and required compile-time gates cataloged below | Verify the actual deployed APK and real cross-client journey |

## Shared telemetry and exact proposed indexes

Shared target: `huftzhfqnnslvnfzvbex`. Performance advisor findings were observed
at `2026-11-06T11:45:03.541Z`; separate read-only catalog inspection confirmed
the definitions. Server clock/version check: `2026-11-06 11:50:05.530989+00`,
PostgreSQL 17.6. No member rows were read.

Full sanitized output and metadata: [telemetry JSON](../research/shared-fk-telemetry-2026-11-06.json).

| Table | FK | Indexed column |
| --- | --- | --- |
| events | events_club_id_fkey | club_id |
| events | events_created_by_fkey | created_by |
| knowledge_articles | knowledge_articles_author_id_fkey | author_id |
| project_members | project_members_user_id_fkey | user_id |
| projects | projects_club_id_fkey | club_id |
| tool_bookings | fk_bookings_project | project_id |
| tool_bookings | tool_bookings_approved_by_fkey | approved_by |
| users | fk_users_club | club_id |

The previous evidence-register list naming event_registrations,
inventory_transactions and work_requests was incorrect for this target.
These are performance advisories, not proven exploits or measured lock incidents.
See [Supabase's unindexed-FK advisory](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

- [Dedicated candidate SQL](../../supabase/validation/shared_fk_indexes_v1_candidate.sql)
- [Ownership-checked rollback](../../supabase/validation/shared_fk_indexes_v1_rollback.sql)
- [Rehearsal implementation](../../scripts/shared-fk-index-rehearsal.mjs)
- [Durable rehearsal output](../research/shared-fk-rehearsal-2026-11-06.json)

These are uninstalled candidate artifacts, not entries in a migration ledger.
No legacy Grow migrations were replayed. The October validation-only FK file
was not used. Preflight requires explicit reviewed-target intent, PostgreSQL 17,
the expected UUID FK/reference topology and valid exact owned index definitions.
It rejects stale covering-index telemetry and naming collisions.
Both directions acquire SHARE locks before inspecting FK metadata.

Regular transactional CREATE INDEX blocks writes while its SHARE locks are held.
The two-second lock timeout and thirty-second statement timeout fail the
transaction rather than wait indefinitely. An eventual production installer
must independently verify the actual project and maintenance window; the
custom setting is only an intent marker, not server identity or authorization.
Candidate and rollback preserve unrelated indexes and abort on changed/unowned
objects.

Reproduction (PowerShell, from the website root):

```powershell
$env:IDEALAB_PG_BIN = (Resolve-Path '.local/tools/postgresql-17.6-1/pgsql/bin').Path
node scripts/db-runtime.mjs --shared-fk-indexes
node scripts/db-runtime.mjs --recovery-consumption
node scripts/phase1-validation.mjs
```

The harness accepts no external database URL. It creates its own private
loopback cluster, verifies its directory/port identity, and stops/removes it.
The rehearsal proves eight-index creation, repeat apply, repeat rollback,
missing target marker, wrong late FK with atomic rollback, name collision,
stale external coverage, changed rollback ownership with atomic rollback,
unrelated-index retention and unchanged fixture ACL/RLS/constraints/rows.
Expected negative preflights exit 1; the overall rehearsal exits 0.
It is a minimal synthetic topology, not a full shared-schema restoration,
query-plan comparison, production-size timing result or installation approval.

## Validation tests and observed behavior

Configured environment for the regression runner: `ACCOUNT_ENVIRONMENT=validation`;
intended isolated project: `gvvqlfachzbufstzoiwi`. The four named scripts inject
SDK/Next fixtures and do not connect to that project. Passing them is local
behavioral evidence, not live Supabase acceptance.

Exact commands, stdout/stderr, exit codes and source SHA-256 fingerprints:
[test log](../research/phase1-validation-2026-11-06.json).

| Command | Tests | Result | Observed scope |
| --- | --- | --- | --- |
| node scripts/auth-entry.test.mjs | 10 | Passed | Verified account-ID projection; missing session vs unavailable; callbacks preserve existing/uncertain sessions; exchanges only after confirmed signed-out entry |
| node scripts/recovery-authority.test.mjs | 8 | Passed | Fresh verified recovery only; expired/malformed/ordinary login rejected; account/session switch and provider failure fail closed |
| node scripts/recovery-update.test.mjs | 7 | Passed | Exact account/session binding; only true consumption permits update; deterministic sanitised notice redirects; update then local sign-out/cleanup |
| node scripts/active-session.test.mjs | 3 | Passed | Saved-timestamp timer, nonnegative elapsed time, long sessions and two-hour in-app reminder |

Provider errors, lost responses and unexpected identity produce the generic
`unconfirmed` notice and require a fresh link; raw provider messages are not
used as the redirect. Confirmed password update with failed cookie cleanup uses
`password-updated-cleanup`, and does not falsely claim browser sign-out.
These outcomes were observed through fixtures. They do not prove real cookies
or provider sessions were cleared.

Additional isolated validation metadata check at
`2026-11-06 11:58:23.14018+00`: PostgreSQL 17.11 and recovery RPC present.
A real validation SQL transaction used `SET LOCAL ROLE authenticated` with
empty claims; unbound recovery returned false, and anon EXECUTE privilege was
absent. The transaction was READ ONLY and rolled back:
[exact validation denial query and output](../research/phase1-validation-sql-denial-2026-11-06.json).
This is a database-role denial check, not a PostgREST/JWT or real-email journey.

The existing recovery SQL fixture also passed on disposable PostgreSQL 17.6:
private-schema/owner permission preflights, single-winner consumption,
expiry while blocked, rollback before use and preservation of consumed receipts.
[Recovery SQL result](../research/phase1-recovery-sql-2026-11-06.json).
No real account, password or provider session was modified.

## Grow direct-write catalogue and routing

Inspected sibling base HEAD:
`a88ce7eb357faa37e0b7b447b8ff43b4050092bc` plus its current working files.
Paths below are relative to the sibling Grow root; that app was not edited.

| Writer | Callers / payload | Source reachability |
| --- | --- | --- |
| lib/features/auth/data/auth_repository.dart:151 | ensureUserProfileExists upsert; signup:88, email sign-in:111, Google:125, missing-profile read:241; splash_screen.dart:57 calls getCurrentUser | Legacy repository path |
| Same file:293 | updateProfile; allowlisted name, phone, avatar_url via profile_update_policy.dart:8–12; profile_screen.dart:52 and rc5_edit_basic_profile_screen.dart:73 call it | Legacy profile edit path |
| lib/features/auth/presentation/screens/profile_setup_screen.dart:45 | Direct update of selected role and profile_completed | Legacy profile-setup screen; client role selection is never database authority |
| lib/features/auth/presentation/screens/rc5_onboarding_screen.dart:143 | Direct update of profile_completed | Legacy onboarding screen |

The shared gateway has no direct users-table writer:
`lib/features/auth/data/shared_account_gateway.dart:149,180,214` calls
`get_own_profile_v1`, `save_own_profile_v1` and `claim_mec_registration_v1`.

The three requested flags alone are insufficient. Source configuration requires:

```text
SUPABASE_URL=https://huftzhfqnnslvnfzvbex.supabase.co
SUPABASE_ANON_KEY=<public publishable key or anon JWT; never a secret key>
ENABLE_SHARED_ACCOUNT_FLOW=true
ENABLE_SHARED_PROFILE_READER=true
ENABLE_SHARED_PROFILE_WRITER=true
ENABLE_SHARED_REGISTRATION_CLAIM=true
ENABLE_VALIDATION_ACCOUNT_FLOW=false
```

Supply these as Flutter `--dart-define=NAME=value` build arguments when the
separate app release is approved; this record does not activate an app build.
`shared_account_config.dart:24–36,59–66` reads/enforces them. Exact target
and public-key checks occur at :69–99. The shared URL automatically requests
the guarded flow even if the explicit account-flow flag is omitted (:51–57),
so a missing operation flag fails closed rather than selecting legacy writes.

Router `lib/core/router/app_router.dart:89–112` applies shared routing before
legacy providers. Login/register shared branches use Auth-only calls and return
before legacy provisioning. Signed-in shared accounts route exclusively to
`/shared-account` (config :112–128), whose screen selects the shared controller.
The gateway validates agreement with configured URL/key and pins the three RPCs
(:84–92,269–307).

Legacy repository methods themselves lack a shared-target guard. Current safety
therefore depends on router/provider reachability plus server grants/RLS, not
the flags alone. The actual deployed APK's source, defines and real behavior
remain unverified. Do not restore broad direct users-table writes.

## Acceptance limits and next steps

Hosted member access remains disabled. Public-profile noindex, self-declaration
and payment after completion are preserved. Current local checks and independent
review are recorded with their executed revision below; older CI does not cover
this dirty worktree.

Remaining release work: full captured-baseline reconciliation/restore, real
email signup/recovery and Google onboarding, actual deployed Flutter parity,
and the approved staff/privacy/operational gates. None is satisfied merely by
this eight-index rehearsal or the local regression suite.

## Final review and current-source checks

Independent SQL review accepted the isolated candidate scope after the
lock-before-metadata correction. The corrected candidate hashes and rerun output
are in the rehearsal JSON above. Production installation remains separately gated.

Before this change batch, typecheck, lint and all 204 boundary tests passed.
After the change batch, typecheck, lint, all 204 boundary tests and documentation
link validation passed again. The four explicitly requested scripts also passed
28 tests with no failures or skips. Expected rejection cases in the SQL rehearsal
are assertions of denial, not failed acceptance tests.

[Exact final native-check outputs and source fingerprints](../research/phase1-final-checks-2026-11-06.json)
record the tested current files. Node emitted module-type/experimental warnings;
these did not cause test failures. No optimized build, member browser E2E,
deployed APK test or hosted CI was run in this scoped task.
