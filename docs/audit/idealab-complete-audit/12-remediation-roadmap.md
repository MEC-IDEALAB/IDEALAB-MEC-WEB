# MASTER AUDIT DELIVERABLE 12 — REMEDIATION ROADMAP

> **Target:** IDEALAB MEC Platform (`idealab-mec-web` & `Grow`)\\
> **Status:** PROPOSED — Pending owner authorization. Items marked [PROPOSED] have not been approved for execution.\\
> **Updated:** 2026-11-18 (post-owner-review corrections and fresh database evidence)\\

> [!IMPORTANT]
> This roadmap is a proposed remediation order based on audit findings. It is not an approved action plan. No item in this document authorizes a database migration, configuration change, code deployment, or Grow mobile update without an explicit, separate owner decision. The roadmap header "APPROVED ACTION PLAN READY FOR EXECUTION" in the previous draft was incorrect and has been removed.

> [!CAUTION]
> **Batch 1 from the original draft has been revised.** Several proposed quick-fixes were incorrect as written:
> - The hosted-login "fix" would bypass an intentional release gate. Do not change `src/lib/config.ts` until the acceptance gates it protects have passed.
> - The FK index migration (`20261023081307_validation_fk_indexes_v1.sql`) targets the validation environment only and would fail preflight on shared production. Do not deploy it to `huftzhfqnnslvnfzvbex`.
> - The recovery RPC (`mec_recovery_consumption_candidate.sql`) is already installed on validation. Production installation requires separate acceptance testing.
> - The localStorage fix referenced `request-storage.ts`, which does not exist. The correct file is `draft-storage.ts`. Unconditional deletion also conflicts with the submission-recovery contract.
> - The **Projects navigation fix** was the only original quick fix safe to execute immediately. It is implemented in the current PR source; live member acceptance and deployment are not established.

---

## Current execution checkpoint — 18 November 2026

Fresh read-only shared-project telemetry is recorded in the [18 November
capture](../../research/shared-fk-telemetry-2026-11-18.json). The advisor
reported 8 unindexed-FK findings; the strict catalog check found 9 uncovered
FKs because `tool_bookings(tool_id)` has only status-filtered partial indexes.
The four-row migration ledger was captured in the same read-only pass. A
nine-index candidate and rollback passed a disposable synthetic PostgreSQL
17.6 rehearsal, recorded in the [execution log](../../quality/phase1-database-validation-2026-11-18.md).
Shared production remains unchanged. The candidate still requires independent
SQL/security review and a broader schema/provenance reconciliation before any
separately authorized installation.

---

## 1. Guiding Constraints

1. **Hosted member access** must remain restricted until its own acceptance gate passes. No environment variable alone may enable it.
2. **Grow mobile compatibility** changes require runtime evidence of the actual deployed build's configuration before modifying any database privilege grants.
3. **Database migrations** must target the correct environment, pass a disposable rehearsal, and have a reviewed rollback before being applied to `huftzhfqnnslvnfzvbex`.
4. **Legacy Grow migration replay** (003–008) must not be used to fill ledger gaps. The ecosystem-parity comparison (`docs/research/profile-ecosystem-parity-2026-11-04.md`) shows that source-003 SELECT policies are broader than the captured live policies; replaying it could widen disclosure.
5. **Operational candidates** (`mec_staff_scope_candidate.sql`, `mec_lab_opening_candidate.sql`, etc.) require owner sign-off and rehearsal before production installation.
6. **Neo-Brutalist visual identity** must be preserved in any UI changes.

---

## 2. Immediately Executable Fix: Projects Navigation

**Confirmed mismatch. Safe to implement now.**

### Fix P-01: Correct Projects Default View & Navigation Consistency

Execution checkpoint, 18 November: the current PR source at
`cb086fdb34bab9c9ee9f8dbb033c6c114e9efd3d` defaults to My projects and uses
consistent My projects/Discover URLs. Current local TypeScript, lint and
218-test boundary checks pass. The PR remains draft; no authenticated live
member journey or deployment is established. See the [Phase 1 record](../../quality/phase1-validation-and-parity-2026-11-15.md).

- **Historical finding:** The original audit found the default view and tab URLs mismatched.
- **Implemented behavior:** The current source defaults to `'mine'`; `/app/projects` opens My projects and `/app/projects?view=discover` opens Discover. Search, pagination, error recovery and `aria-current` use the selected view.
- **Remaining verification:** Run an authenticated live member journey after the shared account gate is eligible; do not infer hosted readiness from the local source checks.

---

## 3. Prerequisite Before Any Further Database Work

### Pre-DB-01: Reconcile and Review Shared FK Coverage for `huftzhfqnnslvnfzvbex`

Fresh advisor, strict catalog, and ledger output are now captured for 18
November. The dedicated nine-index candidate and rollback have only been
rehearsed against a synthetic disposable PostgreSQL cluster, not a full restored
copy of the shared schema. Before any shared-production install:
1. Independently review the captured FK list, candidate, rollback, lock behavior,
   and the advisor-versus-strict-catalog discrepancy.
2. Reconcile the checked-in migration ledger with live schema provenance; do
   not replay legacy Grow migrations 003–008.
3. Rehearse against a disposable copy of the relevant shared schema and verify
   rollback and privilege/RLS invariants.
4. Obtain separate owner and maintenance approval before any production DDL.
5. Recheck the target and index state immediately before an approved operation.

---

## 4. Phase 1 (Requiring Acceptance Gates First)

These items cannot proceed until their respective acceptance conditions are met. They are listed for planning, not for immediate execution.

| Item | Acceptance Gate Required | Description |
| :--- | :--- | :--- |
| **Enable hosted member access** | Cross-client acceptance tests pass and are recorded | Widen `backendConfig()` gate in `src/lib/config.ts` |
| **Grow mobile compatibility validation** | Build identifiers + runtime evidence of actual deployed behavior | Determine whether legacy paths in `auth_repository.dart` are reachable in production build |
| **Shared production FK indexes** | Fresh advisor/catalog evidence + full-schema disposable rehearsal + independent SQL/security review + separate owner approval | Review the existing nine-index candidate and reconcile schema provenance; install only after a separately approved maintenance operation |
| **Enable public profiles** | Shared public-profile migration reviewed and installed + both-client acceptance | Switch `publicProfileEnabled()` to read from env flag |
| **Enable production password recovery** | Real provider/session acceptance and rollout review | Follow `docs/quality/recovery-integration-2026-11-05.md` checklist |

---

## 5. Phase 2 (After Phase 1 Gates)

| Item | Description |
| :--- | :--- |
| **Install staff scopes** | Review, rehearse, and apply `mec_staff_scope_candidate.sql` |
| **Install lab opening** | Review, rehearse, and apply `mec_lab_opening_candidate.sql` |
| **Fix lab presence candidate** | Correct candidate SQL to use display name instead of legal name before it is reviewed for installation |
| **Shared device draft cleanup** | Define browser-side cleanup policy that preserves pending submissions; implement as a client-side session-end hook |

---

## 6. Phase 3 (Operational Features — Existing Release Stages Apply)

| Item | Description |
| :--- | :--- |
| **Machine Bookings** | Separate from Work Requests; build slot calendar after staff scopes are installed |
| **Event RSVP & waitlist** | Complete UI after event-drafts candidate is installed and accepted |
| **Tool borrowing catalog** | Connect `public.inventory_items` to UI after borrowing workflow is specified |
| **Work request intake** | Complete production path after validation acceptance is complete |

---

## 7. GitHub Issue Mapping

| GitHub Issue | Phase | Notes |
| :--- | :--- | :--- |
| #3 UX | Phase 2–3 | Color contrast + Projects tab (P-01 immediately) |
| #4 Database | Pre-DB-01 + Phase 1 | FK indexes (requires fresh advisor run) |
| #5 Auth/Onboarding | Phase 1 (gated) | Hosted access, recovery, onboarding wizard |
| #6 Staff Authority | Phase 2 | Staff scope installation |
| #7 Requests | Phase 3 | Work requests, borrowing, booking separation |
| #8 Projects | **Immediately** | P-01: Default view + tab navigation |
| #9 Events | Phase 3 | RSVP, waitlist, My Registrations |
| #10 Attendance | Phase 2 | Lab opening, presence |
| #11 Queue | Phase 3 | Machine booking |
| #12 Billing | Future | Post-pilot payments |
| #13 Release | Phase 1 | CI, documentation |
| #15 Activation | Phase 1 (gated) | Hosted member access |
