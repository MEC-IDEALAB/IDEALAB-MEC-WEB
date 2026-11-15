# MASTER AUDIT DELIVERABLE 12 — REMEDIATION ROADMAP

> **Target:** IDEALAB MEC Platform (`idealab-mec-web` & `Grow`)\\
> **Status:** PROPOSED — Pending owner authorization. Items marked [PROPOSED] have not been approved for execution.\\
> **Updated:** 2026-11-06 (post-owner-review corrections)\\

> [!IMPORTANT]
> This roadmap is a proposed remediation order based on audit findings. It is not an approved action plan. No item in this document authorizes a database migration, configuration change, code deployment, or Grow mobile update without an explicit, separate owner decision. The roadmap header "APPROVED ACTION PLAN READY FOR EXECUTION" in the previous draft was incorrect and has been removed.

> [!CAUTION]
> **Batch 1 from the original draft has been revised.** Several proposed quick-fixes were incorrect as written:
> - The hosted-login "fix" would bypass an intentional release gate. Do not change `src/lib/config.ts` until the acceptance gates it protects have passed.
> - The FK index migration (`20261023081307_validation_fk_indexes_v1.sql`) targets the validation environment only and would fail preflight on shared production. Do not deploy it to `huftzhfqnnslvnfzvbex`.
> - The recovery RPC (`mec_recovery_consumption_candidate.sql`) is already installed on validation. Production installation requires separate acceptance testing.
> - The localStorage fix referenced `request-storage.ts`, which does not exist. The correct file is `draft-storage.ts`. Unconditional deletion also conflicts with the submission-recovery contract.
> - Only the **Projects navigation fix** remains safe to execute immediately. It was confirmed as a genuine mismatch.

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

Execution checkpoint, 6 November: the two-line source fix is implemented and
staged in isolation. Native checks pass; real member-browser acceptance and
deployment are not established by this source check. See the [Phase 1 record](../../quality/phase1-database-validation-2026-11-06.md).

- **Confirmed finding:** `src/app/app/projects/page.tsx:11` defaults the view to `'discover'` when no `view` param is present. Line 20 makes the base path `/app/projects` the Discover link, and `/app/projects?view=mine` the My Projects link. This means the default view and the Discover tab point to the same URL, while My Projects requires an explicit param.
- **Required change:** Default to `'mine'`. Swap the tab link URLs so `/app/projects` renders My Projects and `/app/projects?view=discover` renders Discover. Update search/pagination `next` link construction and the `view` hidden input in the search form to be consistent with the new mapping.
- **What to verify after:** Navigating to `/app/projects` shows the member's own projects. Clicking "Discover" navigates to `/app/projects?view=discover`. Pagination and search links pass the correct `view` param. The `aria-current` attributes on tabs remain correct.

---

## 3. Prerequisite Before Any Further Database Work

### Pre-DB-01: Obtain Fresh Sanitized Advisor Output for `huftzhfqnnslvnfzvbex`

Execution checkpoint, 6 November: fresh read-only advisor and catalog evidence
now resolves the FK discrepancy. The dedicated candidate and rollback passed
disposable PG17.6 rehearsal only. Shared production remains unchanged; this
does not approve installation. See [telemetry](../../research/shared-fk-telemetry-2026-11-06.json)
and [execution evidence](../../quality/phase1-database-validation-2026-11-06.md).

The evidence register's FK list differs from the database migration audit's FK list. Before proposing any shared-production index migration:
1. Run `grow-prod:get_advisors(type: "performance")` and record the full, sanitized output with a timestamp.
2. Identify the exact unindexed FK column names on shared production.
3. Author a new migration file targeting only the confirmed shared production FKs (not the validation tables).
4. Run the migration against a disposable copy of the shared schema.
5. Submit the migration for review before applying to `huftzhfqnnslvnfzvbex`.

---

## 4. Phase 1 (Requiring Acceptance Gates First)

These items cannot proceed until their respective acceptance conditions are met. They are listed for planning, not for immediate execution.

| Item | Acceptance Gate Required | Description |
| :--- | :--- | :--- |
| **Enable hosted member access** | Cross-client acceptance tests pass and are recorded | Widen `backendConfig()` gate in `src/lib/config.ts` |
| **Grow mobile compatibility validation** | Build identifiers + runtime evidence of actual deployed behavior | Determine whether legacy paths in `auth_repository.dart` are reachable in production build |
| **Shared production FK indexes** | Fresh advisor output + disposable rehearsal | Author new migration targeting actual shared production unindexed FKs |
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
