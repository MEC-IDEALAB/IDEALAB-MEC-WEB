# MASTER AUDIT DELIVERABLE 07 — AUTHENTICATION & AUTHORIZATION AUDIT

> **Audit Target:** IDEALAB MEC Platform (`idealab-mec-web` & `Grow` Flutter Mobile)\\
> **Environment Baseline:** Live Supabase `huftzhfqnnslvnfzvbex` (AWS Mumbai, PG 17.6) & Local Next.js 16.0.7\\
> **Status:** DRAFT — Corrections applied after owner review 2026-11-06\\
> **Classification:** TECHNICAL SECURITY ASSESSMENT (Source-Based)\\

> [!CAUTION]
> This document reflects source-code analysis and read-only database telemetry. Findings that require runtime evidence are marked accordingly. No session was created, no live exploit was executed, and no data was mutated during this assessment.

---

## 1. Executive Summary

The IDEALAB MEC platform implements a layered, defense-in-depth authorization architecture across the Next.js 16 web client and the shared Supabase database. The core web implementation is methodical: server-side RPC boundaries, optimistic concurrency tokens, account-bound form tokens, and explicit session exit flows.

**Key characterization of the current state:**
- Hosted member access is intentionally restricted by a source-level release gate pending cross-client acceptance tests.
- Password recovery is intentionally isolated to a pinned validation environment; it is not available in hosted production.
- The Grow Flutter mobile codebase has been partially updated to use the shared RPC contract, but several open questions about build configuration, deployed build identity, and remaining legacy paths require runtime evidence to resolve.
- The operational staff authority model (staff scopes, machine heads, event heads) exists as reviewed candidates but is not installed in shared production.

---

## 2. Authentication Architecture & Lifecycle

### 2.1 Supported Auth Providers & Flows

| Flow | Mechanism | Implementation Path | Hosted Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Google OAuth** | Supabase Auth PKCE | `src/app/auth/actions.ts:21`<br>`src/app/auth/callback/route.ts:7` | Restricted (release gate) | `ENABLE_GOOGLE_SIGN_IN=false` in `.env.example`. |
| **Email + Password Sign-In** | Password grant, SSR cookie exchange | `src/app/auth/actions.ts:38` | Restricted (release gate) | Account enumeration errors sanitized. |
| **Email Signup** | Self-service registration + email confirmation | `src/app/auth/actions.ts:135` | Restricted (release gate) | Never inserts profile from client. Session cleared immediately post-signup. |
| **Password Recovery** | 2-phase token exchange & consumption RPC | `src/app/auth/actions.ts:56,71`<br>`src/lib/auth-config.ts:19–25` | **Not available in production** | Isolated to validation (`gvvqlfachzbufstzoiwi`). `passwordRecoveryConfig()` returns `null` in hosted production — recovery RPCs are never called. |
| **Sign Out** | Local session exit with account-bound CSRF token | `src/app/auth/actions.ts:105` | Available when backend is active | Requires `matchesFormAccount`. |

### 2.2 Backend Activation Gate

`backendConfig()` in `src/lib/config.ts:13–57` controls all backend availability. It is not a simple `NODE_ENV` check. The logic requires:
- `ENABLE_MEMBER_PLATFORM === 'true'`
- Valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- An `ACCOUNT_ENVIRONMENT` matching one of three explicitly listed strategies (`validation`, `shared-local`, `test`), each with its own additional preconditions
- For `shared-local`: also `ENABLE_SHARED_ACCOUNT_CONTRACT_V1 === 'true'` and not Vercel/Render

Lines 36–38 contain an explicit authorial comment: *"Production requires a deliberate source change after real acceptance; no environment variable can currently turn hosted member access on."*

The 307 redirect on hosted `/app` is the intended behavior of this gate, not a misconfiguration.

---

## 3. The 6 Private MEC Institutional Fields

The six private fields are:

1. `name` — Legal full name (max 120 chars), stored in `public.users`
2. `phone` — Contact number (E.164 format)
3. `college_roll` — College registration number (max 64 chars)
4. `institution` — Institutional affiliation (enforced as `'Model Engineering College'`)
5. `department` — Academic department (max 120 chars)
6. `study_year` — Year of study (integer 1–8)

These are returned only by `get_own_profile_v1()` (SECURITY DEFINER, to the row owner only). They must not appear in public profile responses. The public profile field allowlist is specified in `src/features/profile/public-profile-read.ts`.

**Admission verification model:** The approved pilot uses verified email plus a normalized registration claim plus self-declaration. There is no independent college-roster verification step in V1. `07-authentication-authorization-audit.md` must not describe MEC affiliation as independently verified by the institution; it is user-attested and self-declared.

---

## 4. Roles vs. Operational Positions

### 4.1 Account Roles (`public.users.role`)
- `student`, `lab_admin`, `super_admin`
- Assigned in the database; cannot be self-escalated (table-level `UPDATE` on `public.users` is revoked from `authenticated`)

### 4.2 Operational Positions (candidate: `idealab_private.staff_scopes_v1`)
- Machine Head, Event Head, Web Head, etc.
- Student Ambassador designation: `idealab_private.student_ambassadors_v1`
- These exist as reviewed, tested candidates in `supabase/validation/mec_staff_scope_candidate.sql`. They are **not installed in shared production** as of this assessment.
- Machine head limit invariant (max 2 per machine) is enforced by trigger `guard_staff_scope_assignment_limit_v1` in the candidate.

### 4.3 Authorization Matrix

| Actor | Public Web | Member Workspace (`/app`) | Onboarding | Submit Work Request | Lab Check-In | Event RSVP | Project Lead | Staff Scope Actions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Anonymous | Read-only | Denied | Denied | Denied | Denied | Denied | Denied | Denied |
| Unconfirmed | Read-only | Restricted | Denied | Denied | Denied | Denied | Denied | Denied |
| Admitted Student | Read-only | Full | Edit own | Submit (validation env) | Own check-in/out | RSVP | Create/lead own | Denied |
| Lab Admin | Read-only | Full | Edit own | Review (candidate) | Open/close (candidate) | Mark attendance (candidate) | Lead own | Lab admin (candidate) |
| Super Admin | Read-only | Full | Edit own | Review (candidate) | Open/close (candidate) | Mark attendance (candidate) | Lead own | System admin (candidate) |
| Machine Head | Column depends on scope | Full | Edit own | Submit | Own check-in/out | RSVP | Lead own | Machine scope (candidate) |

*All "candidate" entries require installation of `mec_staff_scope_candidate.sql` in the target environment.*

---

## 5. Grow Flutter Mobile — Current Assessment

### 5.1 Source-Level Evidence (Verified)

`Grow/lib/features/auth/data/shared_account_gateway.dart:180,214` calls `save_own_profile_v1` and `claim_mec_registration_v1` via authenticated RPC — the correct shared API surface.

`Grow/lib/features/auth/domain/shared_account_config.dart:51–66` explicitly prevents shared-target builds from falling back to legacy profile-table access when the URL matches `huftzhfqnnslvnfzvbex.supabase.co`. The `enabled` getter requires `readerEnabled && writerEnabled && claimEnabled` (compile-time defines).

The file `auth_remote_data_source.dart` **does not exist** in the current Grow checkout. The previous audit draft cited it incorrectly.

`auth_repository.dart` exists and was not fully audited. Whether it contains legacy writes that could be exercised in certain build configurations requires further source review.

### 5.2 Open Questions Requiring Runtime Evidence

The following cannot be determined from source analysis alone:

1. **Deployed build defines:** Was the production Grow APK compiled with `ENABLE_SHARED_ACCOUNT_FLOW=true` and the three independently gated operations enabled? Without the build manifest or compile-time constants from the production binary, the effective runtime path is unknown.
2. **Legacy code reachability:** Are there paths in `auth_repository.dart` or other files that could reach legacy `from('users').update()` calls in a production build?
3. **Live PG 42501 occurrences:** Has any Supabase PostgREST access log recorded a 403 from an authenticated Grow profile operation since `20261102130200` was applied?

**Maintenance context note:** Installation of migration `20261102130200` was approved with legacy mobile clients offline (`docs/quality/shared-profile-installation-2026-11-02.md`). Reverting the privilege revocation to satisfy this finding would undo the approved account boundary and must not be done based on this audit alone.

---

## 6. Open Questions for Owner Decision

The following items require an owner decision before they can be closed or implemented:

1. **What name is shown to signed-in members in the lab presence list?** The approved plan notes this is subject to MEC approval and privacy notice. It is not yet a confirmed policy violation.
2. **College email domain restriction:** Does V1 restrict signup to `@mec.ac.in`, or does it rely solely on self-declaration plus roll-number normalization?
3. **Staff scope activation timeline:** When will `mec_staff_scope_candidate.sql` be reviewed for production installation?
4. **Grow deployed build identity:** What commit hash and compile-time defines does the current production APK use?
