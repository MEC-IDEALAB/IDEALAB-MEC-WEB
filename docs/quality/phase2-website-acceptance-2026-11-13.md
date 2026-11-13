# Website acceptance checkpoint — 13 November 2026

The student setup wizard now checks the MEC registration prefix on its
registration card, using the same format validator as the declaration.
Students can correct the entry before saving the six private details.
The account save and registration claim remain separate server operations.
The existing profile edit flow keeps its previous field rules.

The design preview includes a step-by-step version of the actual form at
`/design/onboarding?layout=wizard`, available through the existing preview
switch. It uses a synthetic profile and checks the form payload without
saving any fields. Chromium exercised Next, invalid-prefix feedback and focus,
Back with retained study details, and review and submit with sample data.
The build and member preview suite passed with 54 layouts and 12 accessibility
snapshots. The Google callback also preserves the deployed expired-attempt
notice when the provider returns no code. Its regression check verifies the
fixed redirect, no raw provider text and no session operation.
Independent review found no blocking issues in either change. The final
typecheck, lint, 205 boundary tests and documentation checks passed
(105 files and 492 local links).

The isolated validation catalog returned the expected signatures for
`get_own_profile_v1()`, `save_own_profile_v1(jsonb,text)` and
`claim_mec_registration_v1(text,text,boolean)` at 15:57:49 UTC.
Live signup, confirmation, password recovery and a complete new-member journey
still require provider and browser evidence.

## Shared schema reconciliation

The captured public catalog covers 19 public tables, 187 columns, 71 constraints
and 60 policies. The structural capture records digests for index definitions,
defaults and triggers. Digests can verify a reconstruction when definitions
are available. The public table inventory and default ACLs alone cannot
reconstruct a faithful backup of the 19 public and three private tables.
Existing local results cover the narrower account baseline, synthetic restore
and eight-index rehearsal. [Phase 1 evidence](phase1-database-validation-2026-11-06.md)

Both shared catalog requests on 13 November returned PostgreSQL
`28P01` from the Supabase connector. The isolated validation request succeeded.
The next reconciliation step needs schema-only shared metadata access with
definitions for indexes, defaults, triggers, per-object and column ACLs,
policy permissiveness, private tables and extension dependencies.
Legacy migrations 003–008 remain outside the restore procedure.
[Existing account rehearsal](account-baseline-rehearsal-2026-11-04.md)

## Staff and Lab candidates

The following fresh disposable PostgreSQL 17.6 runs exited zero and removed
their scratch clusters. Exact outputs are under the local
`artifacts/database-runtime/` directory.

| Mode | Local result | Evidence file |
| --- | --- | --- |
| `--staff-scope` | Two-head capacity, concurrent assignment and approval, and rollback passed | `runtime-1794585405281-e1ddbb08.json` |
| `--staff-scope-shared` | Staff scope on the synthetic shared profile baseline passed and rolled back | `runtime-1794585584718-8b747b0f.json` |
| `--lab-opening` | Concurrent opens, closure and check-in serialization, checkout timestamp and retry passed | `runtime-1794585627150-c4265afb.json` |

The trusted roster maintainer and backup, appointment and revocation audit,
and real authorized staff/member journeys remain required before activation.

## Grow release evidence

The organization repository returned no published releases. The original
Grow repository exposes `v1.0.0-rc2-stable`, published on 9 May 2026 with
`app-release.apk`. The tag resolves to
`433f2844b0aaaf71daf30967605a1cbb73937d41`. Its complete Git tree does not
contain the shared account config or gateway. The published release cannot
serve as evidence of shared client acceptance. The APK that members actually
have installed and its build provenance remain unverified.
[Published Grow release](https://github.com/NAVANEETHVVINOD/Grow-by-IL/releases/tag/v1.0.0-rc2-stable)

An approved shared build needs the exact shared Supabase URL and public
client key plus `ENABLE_SHARED_ACCOUNT_FLOW=true`,
`ENABLE_SHARED_PROFILE_READER=true`, `ENABLE_SHARED_PROFILE_WRITER=true`,
`ENABLE_SHARED_REGISTRATION_CLAIM=true`, and
`ENABLE_VALIDATION_ACCOUNT_FLOW=false`. Record the source revision,
build flags, signed artifact digest and version. Verify profile save and
registration claim across both clients before release.
[Flag and legacy write path evidence](phase1-database-validation-2026-11-06.md)

PR #67 was open and draft at `755b0d02f29c0b0bd34bdd42ce15e0be0b62a779`.
Its hosted checks apply to that revision. The current checkout includes
unpublished changes and requires the remaining provider and cross-client
checks before the member release.
GitHub reports a conflict with current `main`. A local merge-tree check
identified `scripts/acceptance.mjs` and
`src/components/auth-experience.tsx` as the conflicting files.
[PR #67](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/pull/67)

## Local PR reconciliation

Both conflicts are resolved in local merge commit
`7783464de88b984140afc1a3cec6a75fd5756042` on
`codex/pr67-reconcile-20261113`. It combines the published PR head and
`main` at `ef6c5bd`. The isolated checkout preserves the unpublished
implementation and staged Projects fix in the original checkout.
The merge keeps the account continuation and hosted access checks, the
animated auth background, the expired-attempt notice and its browser test.
Independent review, typecheck, lint, 181 boundary tests, the acceptance build
and documentation checks passed on the merge commit.

The first Chromium run sampled a static corner of the pixel field. Local
follow-up commit `0f7440dbfbd01120c52a10579872c57ffaf891f4` samples the
visible side strip and verifies that it moves and pauses. The full public
Chromium suite passed with that change. The log is
`artifacts/pr67-merge-browser-rerun.log` in the isolated checkout.

The original working copy separately passed the full public Chromium suite
with the expired-attempt notice visible while sign-in remains disabled.
The merge commit represents the published branch reconciliation. Unpublished
implementation still needs to be integrated and verified on the resulting
revision. Shared schema access returned `28P01` again on a read-only probe.
