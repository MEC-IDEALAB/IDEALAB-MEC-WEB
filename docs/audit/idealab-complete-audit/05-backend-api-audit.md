# 05 — Backend and API Audit

**Audit Date:** 2026-11-06\\
**Auditor:** Principal Backend Architect & Application Security Engineer\\
**API Paradigm:** Next.js 16 Server Actions (`'use server'`) + Dedicated Auth Route Handlers (`route.ts`) + Supabase PostgREST RPC Layer\\
**Database Connection:** Scoped user-session SSR client via `@supabase/ssr`

---

## 1. Backend Architecture & API Paradigm

The backend architecture avoids standard REST API routes (`src/app/api/`) in favor of **Next.js Server Actions** and versioned **PostgreSQL RPCs**:
1. **Client-Server Boundary:** Forms and interactive components invoke Server Actions directly via React 19 action handlers or standard HTML form POSTs.
2. **Session Rehydration & Scope:** Actions obtain a server-side Supabase client using `serverClient({ writable: true })` in `src/lib/supabase.ts`. This client reads the current session tokens from cookies via `cookies().getAll()`, ensuring all downstream database queries carry the authenticated user's JWT.
3. **No Service-Role Key:** Server Actions run with the privileges of the signed-in user (`authenticated` role in PostgreSQL). They cannot bypass Row-Level Security policies unless executing explicitly granted `SECURITY DEFINER` functions.
4. **Input Normalization & Guard:** Handlers validate expected parameters using domain parsers (`auth-input.ts`, `visit-command.ts`, `work-request-command.ts`, `project-command.ts`) before invoking database RPCs.

---

## 2. API & Server Action Inventory

| Handler / Action File | Function Name | Auth Requirement | Target Database RPC | Input Validation | Transaction Safety | Status |
|---|---|---|---|---|---|---|
| `src/app/auth/actions.ts` | `signInWithGoogle` | Unauthenticated | Supabase Auth OAuth | Canonical origin allowlist | GoTrue managed | Connected / Verified |
| `src/app/auth/actions.ts` | `signIn` | Unauthenticated | `auth.signInWithPassword` | `readAuthCredentials` | GoTrue managed | Connected / Gated |
| `src/app/auth/actions.ts` | `signUp` | Unauthenticated | `auth.signUp` | `readAuthCredentials(form, true)` | Session cleared on all outcomes | Connected / Gated |
| `src/app/auth/actions.ts` | `signOut` | Authenticated | `auth.signOut({ scope: 'local' })` | Matches `expected_account` | Cookie cleared | Connected / Verified |
| `src/app/auth/actions.ts` | `requestPasswordReset`| Unauthenticated | `auth.resetPasswordForEmail` | `readAuthEmail` | Generic feedback (no enum) | Connected / Gated |
| `src/app/auth/actions.ts` | `updatePassword` | Recovery Session | `consume_recovery_session_v1` + `auth.updateUser` | Matches account & session ID | Two-phase consume before update | **Validation Only** (RPC missing in prod) |
| `src/app/account-access/actions.ts` | `saveRequiredProfile`| Authenticated (Incomplete) | `save_own_profile_v1` | `buildProfileSavePayload` | Owner row lock in DB | Connected in Shared DB |
| `src/app/account-access/actions.ts` | `claimMecRegistration`| Authenticated (Complete) | `claim_mec_registration_v1` | `buildRegistrationClaimPayload`| Unique claim transaction | Connected in Shared DB |
| `src/app/app/visits/actions.ts` | `changeOwnVisit` | `requireMember()` | `check_in_lab_v1` / `check_out_lab_v1` | `buildVisitCommand` | Serialized with lab state lock | **Blocked in Shared DB** (Validation gated) |
| `src/app/app/lab/actions.ts` | `changeLabOpening` | `requireMember()` (Core) | `set_lab_opening_v1` | `buildLabOpeningCommand` | Singleton row lock | **Blocked in Shared DB** (Validation gated) |
| `src/app/app/requests/actions.ts` | `changeWorkRequest` | `requireMember()` (Student)| `submit_work_request_v1` / `cancel_work_request_v1` | `buildIntakeCommand` | Command receipt ID | **Blocked in Shared DB** (Validation gated) |
| `src/app/app/projects/actions.ts` | `createProjectWithAccountIntent` | `requireMember()` | `mutate_project_for_account_v1` | `buildProjectCommand` | Intent journal lock | **Blocked in Shared DB** (Validation gated) |
| `src/app/app/projects/actions.ts` | `changeProject` | `requireMember()` | `mutate_project_v1` | `buildProjectCommand` | Scoped membership check | **Blocked in Shared DB** (Validation gated) |
| `src/app/app/events/manage/actions.ts` | `saveEventDraft` | `requireMember()` (Event Head) | `mutate_event_draft_v1` | `parseEventManagementCommand` | Event revision lock | **Blocked in Shared DB** (Validation gated) |
| `src/features/profile/public-profile-actions.ts` | `savePublicProfile` | `requireMember()` | `save_own_public_profile_v1` | `profilePayloadFromForm` | Revision check | **Blocked in Source** (`publicProfileEnabled() === false`) |

---

## 3. Workflow Tracing & Verification

### Workflow 1: Onboarding & MEC Self-Declaration
$$\text{UI Form} \longrightarrow \text{Action: } \texttt{saveRequiredProfile} \longrightarrow \text{Validation} \longrightarrow \texttt{save\_own\_profile\_v1} \longrightarrow \texttt{claimMecRegistration} \longrightarrow \texttt{claim\_mec\_registration\_v1}$$
- **Files Traced:** `src/app/account-access/page.tsx`, `src/app/account-access/actions.ts`, `src/features/profile/profile-save.ts`, `Grow/supabase/migrations/20261102130200_shared_profile_contract_v1.sql`.
- **Authorization & Locks:** Takes `SELECT ... FOR UPDATE` on `public.users` where `id = auth.uid()`. Checks revision numbers to reject stale optimistic saves.
- **Claim Enforcement:** Uses ICU non-deterministic collation `idealab_private.mec_registration_ci` to enforce case-insensitive, whitespace-collapsed unique claims on `college_roll`.
- **Status:** **Operational in Shared DB**, but hosted execution is gated by `ENABLE_MEMBER_PLATFORM=false`.

### Workflow 2: Work Request Submission
$$\text{UI Form: } \texttt{RequestDraft} \longrightarrow \text{Action: } \texttt{changeWorkRequest} \longrightarrow \text{RPC: } \texttt{submit\_work\_request\_v1} \longrightarrow \text{Table: } \texttt{idealab\_private.work\_requests\_v1}$$
- **Files Traced:** `src/features/requests/request-draft.tsx`, `src/app/app/requests/actions.ts`, `supabase/validation/mec_work_request_intake_candidate.sql`.
- **Failure Analysis:**
  1. `changeWorkRequest` line 21 enforces: `process.env.ACCOUNT_ENVIRONMENT !== 'validation' || process.env.ENABLE_WORK_REQUEST_INTAKE !== 'true'`. In staging/production, it immediately returns: `"Online request intake is not enabled for this environment or account."`
  2. The RPC `submit_work_request_v1` and its backing table `idealab_private.work_requests_v1` exist ONLY in local candidate SQL. They are NOT installed in the shared production database!
  3. Non-student accounts (Lab Admins, Super Admins) are rejected at line 20 (`account.profile.role !== 'student'`), preventing staff from testing or submitting work requests.
- **Status:** **Disconnected / UI Draft Only**.

### Workflow 3: Lab Check-In and Closure Race
$$\text{UI Form: } \texttt{OwnVisitControls} \longrightarrow \text{Action: } \texttt{changeOwnVisit} \longrightarrow \text{RPC: } \texttt{check\_in\_lab\_v1} \longrightarrow \text{Table: } \texttt{public.lab\_sessions}$$
- **Files Traced:** `src/components/own-visit-controls.tsx`, `src/app/app/visits/actions.ts`, `src/lib/visit-command.ts`, `supabase/validation/mec_own_visit_writes_candidate.sql`.
- **Concurrency & Invariants:**
  - `check_in_lab_v1` locks `idealab_private.lab_opening_state_v1` in `SHARE` mode and rejects check-in if `last_action <> 'open'`.
  - `set_lab_opening_v1(p_action => 'close')` locks the same row in `UPDATE` mode, automatically setting `checkout_time = v_time` for all active sessions.
  - This guarantees that a check-in racing with closure either commits before closure or is cleanly rejected with a closed-lab error.
- **Failure Analysis:** `changeOwnVisit` checks `validationFeatureEnabled('ownVisits')`. It cannot run on the shared database because neither `check_in_lab_v1` nor `set_lab_opening_v1` exists in `huftzhfqnnslvnfzvbex`.
- **Status:** **Validation-Gated / Uninstalled on Shared DB**.

---

## 4. Backend Vulnerability & Reliability Findings

| Finding ID | Severity | File / Object | Issue Description | Potential Impact | Recommended Fix |
|---|---|---|---|---|---|
| **API-001** | **P1** | `src/app/app/requests/actions.ts` | Role gating strictly limits requests to students (`role === 'student'`). | Staff members (Lab Admins, Super Admins) cannot submit work requests for lab maintenance or prototyping. | Change check to allow all authenticated, admitted members (`role IN ('student', 'lab_admin', 'super_admin')`). |
| **API-002** | **P1** | `src/app/app/requests/actions.ts` & `src/app/app/visits/actions.ts` | Handlers hardcode `process.env.ACCOUNT_ENVIRONMENT !== 'validation'`. | Core operational features completely fail if deployed to staging or production even if the SQL is applied. | Replace environment string checks with database capability checks or configurable feature flags. |
| **API-003** | **P1** | `src/app/auth/actions.ts` (lines 83-99) | Password update and recovery session consumption occur across two separate transactions (`consume_recovery_session_v1` followed by `auth.updateUser`). | If `auth.updateUser` fails after authority is consumed, the recovery token is invalidated and the user is locked out without an updated password. | Implement atomic recovery consumption or handle unconfirmed updates with explicit retry authority receipts. |
| **API-004** | **P2** | `src/app/app/events/manage/actions.ts` | Unbounded draft command size (allows raw JSON payload up to 65,000 characters without individual field size checks). | Memory pressure or payload injection with bloated descriptions. | Enforce strict schema validation on each event draft property (title $\le 120$, venue $\le 120$, description $\le 4000$). |
| **API-005** | **P2** | `src/proxy.ts` | Session refresh executes on every page route using `@supabase/ssr`. | Increases latency by 150-250ms on cold serverless boots due to network roundtrips to Supabase GoTrue. | Cache verified session JWT in edge cookie and only refresh when within 5 minutes of token expiration. |
