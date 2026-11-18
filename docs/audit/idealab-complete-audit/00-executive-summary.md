# MASTER AUDIT DELIVERABLE 00 — EXECUTIVE SUMMARY & AUDIT VERDICT

> **Project:** IDEALAB MEC Platform (`IDEALAB-MEC-WEB` & `Grow` Mobile Ecosystem)\\
> **Institution:** Model Engineering College (MEC), Kerala, India (IDEA Lab & Fab Lab)\\
> **Audit Period:** October – November 2026\\
> **Updated:** 2026-11-18 (post-owner-review corrections and current checkpoint)\\
> **Mode:** Read-Only Source Analysis & Database Telemetry. No code, database, or remote state was changed.\\

> [!IMPORTANT]
> **This document was revised after owner review on 2026-11-06.** The previous version contained several incorrect classifications. Specifically: the hosted login restriction is an intentional release gate, not an exploit; password recovery is correctly absent from production; the Flutter audit cited a non-existent file; "8 CVEs" and "100% verified" were unsupported claims; and the roadmap incorrectly described itself as approved. These have all been corrected. See individual audit documents for details.

---

## Current checkpoint — 18 November 2026

The Projects navigation mismatch identified below is corrected in the current
PR source (`cb086fdb34bab9c9ee9f8dbb033c6c114e9efd3d`): My projects is the
default and Discover uses `?view=discover`. Current local TypeScript, lint and
218 boundary tests pass; this does not establish an authenticated hosted
journey, PR merge or deployment.

Fresh read-only shared database telemetry now reports 8 advisor FK findings
and 9 strict catalog coverage gaps, because `tool_bookings(tool_id)` has only
partial indexes. The ledger query returned four migrations. A nine-index
candidate/rollback passed a disposable PostgreSQL 17.6 rehearsal; it remains
uninstalled and shared production was not changed. See [database telemetry](../../research/shared-fk-telemetry-2026-11-18.json),
the [execution record](../../quality/phase1-database-validation-2026-11-18.md),
and the [current delivery plan](../../delivery-plan.md). Older decision lists
below are historical; confirmed owner decisions in the current delivery plan
take precedence.

---

## 1. Overall Characterization

The IDEALAB MEC codebase is well-engineered. The Next.js 16 web application passes TypeScript strict checking, ESLint, and 204+ automated tests. Its authorization architecture is methodical: server-side RPC boundaries, optimistic concurrency tokens, account-bound form tokens, and explicit session-exit flows. The neo-brutalist visual identity is distinctive and consistently applied.

**The platform is not yet activated for hosted member access.** This is an intentional, source-enforced state pending cross-client acceptance tests. It is not a configuration error. Several important operational workflows also remain as local candidates not yet installed in the shared production database — this is expected at this pre-release stage.

The audit's value is in surfacing the gaps between local candidates and shared production, confirming which features are connected vs. still in development, and identifying the prerequisites that need to pass before hosted access can be safely widened.

---

## 2. Dimensional Readiness Assessment

| Dimension | Assessment | Key Evidence |
| :--- | :---: | :--- |
| **Frontend code quality** | Strong | 0 TS errors, 0 lint warnings, 204+ tests passing |
| **UI/UX & design consistency** | Good with gaps | Projects tab defaulting to wrong view; minor contrast findings |
| **Authorization architecture** | Well-designed | RPC-only writes, row-level locks, account-bound tokens; staff scopes designed but not installed |
| **Database (installed)** | Partial | 4 migrations in production ledger; shared profile contract installed; operational candidates not yet installed |
| **Database (candidates)** | Ready for review | Staff scopes, lab opening, presence, work requests all authored with tests |
| **Cross-client parity (Grow)** | Partially verified | Shared gateway calls correct RPCs in source; deployed build configuration unknown |
| **Hosted member access** | Intentionally inactive | Release gate requires cross-client acceptance to pass first |

> [!CAUTION]
> The previous draft assigned an overall percentage readiness score ("38%") without a defined measurement methodology. That figure has been removed. Percentage readiness scores require an agreed measurement framework before they carry meaning.

---

## 3. Confirmed Finding: Projects Navigation Mismatch

**This was the only finding from the original audit with sufficient evidence to implement immediately.**

- **Location:** `src/app/app/projects/page.tsx:11,20`
- **What was confirmed:** At audit time, line 11 defaulted `view` to `'discover'`, and line 20 linked the base URL to Discover. The product specification requires My projects first.
- **Current state:** The current PR source implements the correction and preserves view state in search, pagination and invalid-link recovery. See roadmap `Fix P-01` and the current checkpoint above.

---

## 4. Release Gate Items (Require Acceptance Before Activation)

These items are correctly gated in source and must not be unblocked without the stated prerequisites:

| Item | Gate Status | Required Before Widening |
| :--- | :--- | :--- |
| **Hosted member access** | Intentional source gate | Cross-client provider and acceptance tests recorded |
| **Public profiles** | Hardcoded `false` pending migration | Shared profile migration + both-client privacy acceptance |
| **Password recovery in production** | Isolated to validation | Real provider/session acceptance, rollout review |
| **Staff operational scopes** | Candidates authored, not installed | Rehearsal + owner sign-off |
| **Lab opening and presence** | Candidates authored, not installed | Rehearsal + owner sign-off + privacy decision on name display |

---

## 5. Database Reconciliation Prerequisites

Before proposing any shared production database migrations:

1. The 18 November advisor/catalog and four-row ledger outputs are available in the evidence register and telemetry file; they must be refreshed again before any later production operation.
2. Independently review the nine-index candidate/rollback and rehearse on a full disposable copy of the relevant shared schema; the current synthetic rehearsal is not a full restore.
3. Reconcile migration provenance and continue the ecosystem parity work under `docs/research/`. Never replay legacy Grow migrations 003–008.

---

## 6. Open Owner Decisions

These decisions must come from the owner or institutional authority before proceeding:

1. **Grow deployed build identity:** What commit and compile-time defines does the current production APK use? (Needed to close the mobile compatibility question.)
2. **Presence name display:** What name is shown to signed-in members in the lab presence list? (Subject to MEC approval and privacy notice, per the approved plan.)
3. **College email domain restriction:** Does V1 restrict signup to `@mec.ac.in`, or rely on self-declaration plus roll-number normalization?
4. **Consumables billing:** Institution subsidy or payment integration before machine bookings open?
5. **Attendance self-correction window:** 7-day self-service rule — approved by Fab Lab director or requires sign-off?

---

## 7. What This Audit Does and Does Not Establish

**Does establish:**
- The release gate on hosted access is working correctly and is intentional.
- Projects navigation was wrong in the original audit; the correction is present in the current PR source but is not merged/deployed.
- Operational candidates (staff scopes, lab opening, etc.) are not installed in shared production.
- The validation FK index migration cannot be applied to shared production.
- The Grow shared account gateway in source calls the correct RPCs.
- Draft persistence behavior is specified, not accidental.

**Does not establish:**
- That any of the locally identified findings are exploitable without runtime evidence.
- The correct CVSS score for any finding — estimates require independent validation.
- The deployed Grow APK's effective runtime behavior.
- Complete schema parity between source migrations and the live database.
- That 38% (or any other percentage) accurately describes pilot readiness.
- Any policy on presence names, college email restrictions, or billing — those are owner decisions.
