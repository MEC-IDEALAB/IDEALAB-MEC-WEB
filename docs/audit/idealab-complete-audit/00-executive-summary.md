# MASTER AUDIT DELIVERABLE 00 — EXECUTIVE SUMMARY & AUDIT VERDICT

> **Project:** IDEALAB MEC Platform (`IDEALAB-MEC-WEB` & `Grow` Mobile Ecosystem)\\
> **Institution:** Model Engineering College (MEC), Kerala, India (IDEA Lab & Fab Lab)\\
> **Audit Period:** October – November 2026\\
> **Updated:** 2026-11-06 (post-owner-review corrections)\\
> **Mode:** Read-Only Source Analysis & Database Telemetry. No code, database, or remote state was changed.\\

> [!IMPORTANT]
> **This document was revised after owner review on 2026-11-06.** The previous version contained several incorrect classifications. Specifically: the hosted login restriction is an intentional release gate, not an exploit; password recovery is correctly absent from production; the Flutter audit cited a non-existent file; "8 CVEs" and "100% verified" were unsupported claims; and the roadmap incorrectly described itself as approved. These have all been corrected. See individual audit documents for details.

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

**This is the only finding from this audit with sufficient evidence to implement immediately.**

- **Location:** `src/app/app/projects/page.tsx:11,20`
- **What is confirmed:** Line 11 defaults `view` to `'discover'` when no query param is present. Line 20 makes `/app/projects` the Discover tab link, so the default and the Discover tab are identical URLs. The product specification requires "My Projects" first.
- **Required change:** Default to `'mine'`; swap tab link URLs (`/app/projects` = My Projects; `/app/projects?view=discover` = Discover); verify pagination, search, and `aria-current` consistency.
- **See:** Roadmap `Fix P-01`.

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

1. Re-run `grow-prod:get_advisors(type: "performance")` and record the full output with a timestamp — the FK list in the evidence register and database audit were inconsistent.
2. Obtain the sanitized advisor output and author a new index migration targeting only confirmed shared production FKs (the existing validation file cannot be applied to shared production).
3. Continue the ecosystem parity reconciliation under `docs/research/` before proposing replay of any legacy Grow migrations.

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
- Projects navigation defaults to the wrong view.
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
