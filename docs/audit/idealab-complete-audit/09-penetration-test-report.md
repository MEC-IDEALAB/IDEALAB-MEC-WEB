# MASTER AUDIT DELIVERABLE 09 — PENETRATION TEST REPORT

> **Assessment Title:** Authorized Web Application & Shared Database Security Assessment\\
> **Target:** IDEALAB MEC Platform (`https://idealab-mec-web.vercel.app`, Local Origin `http://127.0.0.1:3015`, Supabase `huftzhfqnnslvnfzvbex`)\\
> **Standard:** OWASP Web Security Testing Guide (WSTG v4.2) / OWASP ASVS v4.0.3\\
> **Mode:** Read-Only, Source-Based, Non-Destructive Authorized Assessment\\
> **Classification:** DRAFT — PENDING RUNTIME EVIDENCE ATTACHMENT\\

> [!CAUTION]
> **This report contains locally identified findings only.** Severity identifiers (SEC-01 through SEC-08) are internal to this audit. None carry assigned CVE numbers. CVSS scores listed here are estimates based on source-code analysis alone — they have not been validated against live runtime evidence, real attacker access, or independent security review. Scores must be justified independently before citing them as authoritative.

---

## 1. Assessment Overview & Methodology

A source-code and telemetric assessment of the IDEALAB MEC platform was conducted to surface potential vulnerabilities across the Next.js 16 Edge proxy, Node.js server actions, PostgREST endpoints, and the shared PostgreSQL 17.6 database. All findings are based on static analysis and read-only database telemetry; no data was mutated, no live exploit was executed, and no session was created for attack testing.

**Limitations:** Source inspection cannot prove exploitation, establish precise CVSS scores without confirmed attack paths, or rule out mitigations outside the reviewed file set. Each finding below requires a reproducible runtime test, a build/commit identifier, and a sanitized actual output before it can be treated as confirmed.

### 1.1 Scope Boundaries
- **Production Vercel Endpoint:** `https://idealab-mec-web.vercel.app` (commit `ef6c5bdb51b9e372cd6402e0314ad5a6e275da5d`)
- **Local Application Origin:** `http://127.0.0.1:3015` (branch `codex/member-platform-readiness-20261103`)
- **Production Supabase Instance:** `huftzhfqnnslvnfzvbex` (AWS ap-south-1, PostgreSQL 17.6)
- **Validation Supabase Instance:** `gvvqlfachzbufstzoiwi` (PostgreSQL 17.11)

---

## 2. Locally-Identified Finding Summary Matrix

| Finding ID | Title | Category | Estimated Severity | Confirmed Runtime Evidence? |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Hosted Backend Activation Intentionally Restricted | Release Gate | Informational (misclassified in draft) | N/A — by design |
| **SEC-02** | Grow Mobile Legacy Direct-Table Writers Remain | Compatibility Concern | Medium (needs build/runtime evidence) | No — legacy code paths present but gating mechanism requires verification |
| **SEC-03** | Shared-Device Draft Persistence in Account-Keyed Storage | Privacy Concern | Low–Medium | No — behavior and risk scope depend on deployment context |
| **SEC-04** | Production Password Recovery Not Yet Activated | Unfinished Feature | Informational | No — intentionally disabled in source |
| **SEC-05** | Legal Name in Candidate Lab Presence Query | Candidate Privacy Gap | Low (candidate only, uninstalled) | No — candidate SQL, not in production |
| **SEC-06** | Validation FK Indexes Target Validation Only | Migration Targeting Error | Medium (advisory mismatch) | Partial — advisor output cited but FK list differs from migration targets |
| **SEC-07** | Mutable Search Path & Legacy Grant Warnings | Configuration Advisory | Low | Telemetry confirmed — partial |
| **SEC-08** | Private Schema Tables Lack Explicit RLS Allow Policies | Configuration Advisory | Low | Telemetry confirmed — partial |

---

## 3. Detailed Finding Reports

### SEC-01: Hosted Backend Activation (Intentionally Restricted — Reclassified)

> [!WARNING]
> **Previous Draft Error:** An earlier draft of this report classified this as a "Critical Confirmed Exploit" and a Denial of Service. That classification was incorrect and has been removed.

- **Reclassification:** Informational / Release Gate (not a vulnerability)
- **Location:** `src/lib/config.ts:28–47`
- **Accurate Description:**\\
  The function `backendConfig()` restricts backend activation to explicitly approved targets. It is not keyed to `NODE_ENV === 'development'` alone. It evaluates `ENABLE_MEMBER_PLATFORM`, `ACCOUNT_ENVIRONMENT`, the exact project ref, and that the runtime is not Vercel/Render. Lines 36–38 contain an explicit comment: *"Production requires a deliberate source change after real acceptance; no environment variable can currently turn hosted member access on."*\\
  The 307 redirect to `/sign-in?notice=configuration` observed on `https://idealab-mec-web.vercel.app/app` is the expected behavior of this gate, not attacker-induced denial of service.\\
  Additionally, the previous draft cited `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the credential variable; the actual variable name in `config.ts:18` is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **What it does establish:** Hosted member access is not yet activated. This is a known, intended release gate tracked separately.
- **Required before changing anything:** The acceptance tests described in the commit comments and delivery plan must pass and be recorded before the gate is widened.

---

### SEC-02: Grow Mobile Legacy Direct-Table Writers (Compatibility Concern — Evidence Needed)

> [!WARNING]
> **Previous Draft Error:** The draft claimed `Grow/lib/features/auth/data/datasources/auth_remote_data_source.dart` contained legacy writes. That file does not exist. The claim of a "Current Deployed Outage" was unsupported.

- **Category:** Legacy Path Compatibility Concern
- **What source actually shows:**\\
  `Grow/lib/features/auth/data/shared_account_gateway.dart:180,214` calls `save_own_profile_v1` and `claim_mec_registration_v1` via RPC — the reviewed API surface.\\
  `Grow/lib/features/auth/domain/shared_account_config.dart:51–66` explicitly prevents shared-target builds from falling back to legacy profile-table access when `ENABLE_SHARED_ACCOUNT_FLOW` is not set.\\
  The file `auth_remote_data_source.dart` does not exist in the current checkout.
- **What is not established:** Whether legacy writers exist in `auth_repository.dart` or other paths, whether the current deployed production APK was built with `ENABLE_SHARED_ACCOUNT_FLOW`, and whether any user has actually received PG 42501 at runtime.
- **Required evidence to confirm a live outage:**
  - The deployed Flutter build's compile-time defines for `ENABLE_SHARED_ACCOUNT_FLOW`, `ENABLE_SHARED_PROFILE_WRITER`, `ENABLE_SHARED_REGISTRATION_CLAIM`.
  - A sanitized runtime log or Supabase PostgREST access log showing the actual HTTP 403 from a production request.
  - The commit hash of the production APK and the build date relative to migration `20261102130200`.
- **Maintenance context:** `docs/quality/shared-profile-installation-2026-11-02.md` records that the installation was approved for execution with legacy mobile clients offline. Restoring broad `UPDATE` grants on `public.users` to satisfy this finding would undo the approved account boundary.

---

### SEC-03: Shared-Device Draft Persistence (Privacy Concern — Scope Needs Clarifying)

- **Category:** Shared-device privacy concern
- **Location:** `src/features/requests/draft-storage.ts:80–120` (not `request-storage.ts`, which does not exist)
- **What source shows:**\\
  `draft-storage.ts` implements account-keyed `localStorage` storage via `draftStorageKey(accountId)`. `request-draft.tsx` explicitly warns: *"Local drafts and pending submissions stay in this browser after sign-out."* `docs/requirements.md` specifies account-keyed localStorage as the intended retention mechanism for submission recovery purposes.\\
  The `signOut` server action (`src/app/auth/actions.ts:105–114`) operates server-side and cannot access or clear the client's browser localStorage.
- **Genuine concern:** A draft belonging to Account A remains readable by Account B on the same browser if Account B knows or guesses Account A's UUID (the storage key). The account-keyed design limits this, but does not eliminate cross-account visibility.
- **What is not established:** Whether the actual key format makes cross-account guessing feasible in practice, and whether the submission-recovery use case would be broken by clearing.
- **Path forward:** A browser-side session-end cleanup hook (not a server action) is the correct approach. Requires explicit policy on what to preserve for pending submissions before specifying implementation.

---

### SEC-04: Production Password Recovery Not Yet Activated (Informational — Reclassified)

> [!WARNING]
> **Previous Draft Error:** The draft claimed production recovery reaches `consume_recovery_session_v1`, fails, and redirects users. That flow is unreachable in production.

- **Reclassification:** Informational / Unfinished Feature (not an exploitable path)
- **What source actually shows:**\\
  `src/lib/auth-config.ts:19–25` limits `passwordRecoveryConfig()` to `validationFeatureEnabled('passwordRecovery')`, which requires `ACCOUNT_ENVIRONMENT === 'validation'` and `backendConfig() !== null`. Both are false in hosted production.\\
  `src/app/auth/actions.ts:58–59,72` checks `passwordRecoveryConfig()` and redirects to `/forgot-password?notice=configuration` if `null` — before any RPC is ever called.\\
  `docs/quality/recovery-integration-2026-11-05.md:3–4,32–34` records that the recovery RPC is installed on the isolated validation project (`gvvqlfachzbufstzoiwi`, migration `20261105172121_mec_recovery_consumption_v1_validation`). Shared production recovery remains disabled by design.
- **What it establishes:** Password recovery is not available to production users yet. This is a known gap, not a live exploit.

---

### SEC-05: Legal Name in Candidate Lab Presence Query (Candidate-Only Gap)

- **Category:** Privacy gap in uninstalled candidate SQL
- **Location:** `supabase/validation/mec_lab_presence_candidate.sql` — uninstalled in production
- **What source shows:** The candidate query joins `public.users` and selects `u.name`. The candidate is not installed in `huftzhfqnnslvnfzvbex`.
- **Genuine concern:** If this candidate is installed without modification, the presence list will expose legal names rather than display names.
- **Status:** Requires a correction to the candidate SQL before it is reviewed for production installation. Governance of what name is shown to signed-in members is an open approval question (see `07-authentication-authorization-audit.md`) and not a confirmed noncompliance.

---

### SEC-06: FK Index Migration Targets Validation, Not Shared Production

- **Category:** Migration targeting error in Batch 1 recommendation
- **What source actually shows:**\\
  `supabase/validation/20261023081307_validation_fk_indexes_v1.sql:1–32` requires tables that exist only in the isolated validation environment (`idealab_private.lab_opening_changes_v1`, `idealab_private.own_visit_commands_v1`, `idealab_private.project_events_v1`, `idealab_private.work_request_events_v1`). Its preflight check at line 14–17 rejects any database where those tables are absent.\\
  Additionally, the indexes it creates (`lab_opening_changes_v1_actor_v1`, `own_visit_commands_v1_result_visit_v1`, etc.) differ from the shared FK warnings reported by the Supabase performance advisor for `huftzhfqnnslvnfzvbex`.\\
  The remediation roadmap's Batch 1 recommendation to deploy this file to production is incorrect and would fail the preflight check.
- **What is needed:** A fresh, sanitized advisor output for `huftzhfqnnslvnfzvbex` and a separately authored, reviewed migration targeting the actual unindexed shared production FKs.

---

### SEC-07 & SEC-08: Supabase Advisor Warnings (Configuration)

- **Category:** Supabase security/performance advisor notices
- **Source:** `grow-prod:get_advisors` telemetry (read-only)
- **What is established (partial):**
  - `get_own_profile_v1` and `get_user_role` are callable by `authenticated`. Whether this is a misconfiguration or an intentional design decision requires reviewing the function grants against the approved security contract.
  - Three `idealab_private` tables have RLS enabled but no explicit allow policies. This generates advisor warnings; it is not confirmed to cause an exploitable access path without knowing whether functions act as the access channel.
- **Not established:** Whether any authenticated call to these functions produces unauthorized data access in practice. The advisor warnings should be reviewed against the security contract, not treated as confirmed vulnerabilities.

---

## 4. Defense-in-Depth Observations (Source-Verified)

The following controls were verified by source inspection. They represent genuine architectural strengths — but source inspection alone does not constitute penetration testing.

1. **Dynamic CSP nonces** per request at `src/proxy.ts`.
2. **Strict framing and referrer protections** (`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`) on all auth routes.
3. **Parameterized PostgREST filters** — no string interpolation into SQL was observed in reviewed files.
4. **Optimistic concurrency tokens** (`p_expected_revision`) on profile writes.
5. **Account-bound form tokens** (`matchesFormAccount`) on sign-out and profile actions.

> [!CAUTION]
> The previous draft asserted "Zero SQL Injection Vectors" as a blanket conclusion. Source inspection of reviewed files found no dynamic SQL, but that claim cannot extend to unreviewed code paths, library internals, or future changes without bounded, tested route coverage with actual payloads and verified outputs.
