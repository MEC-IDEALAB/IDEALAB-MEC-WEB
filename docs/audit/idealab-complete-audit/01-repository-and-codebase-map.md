# 01 — Repository and Codebase Map

**Audit Date:** 2026-11-06\\
**Auditor:** Principal Software Architect & Application Security Engineer\\
**Target Repository:** `F:\kannan\projects\IDEALAB\idealab-mec-web`\\
**Sibling Mobile Workspace:** `F:\kannan\projects\IDEALAB\Grow`\\
**Git Branch:** `codex/member-platform-readiness-20261103`\\
**Git Commit (HEAD):** `755b0d02f29c0b0bd34bdd42ce15e0be0b62a779`\\
**Remote main / Deployed SHA:** `ef6c5bdb51b9e372cd6402e0314ad5a6e275da5d` (PR #69 merge)\\
**Draft PR #67 SHA:** `755b0d02f29c0b0bd34bdd42ce15e0be0b62a779`

---

## 1. Environment & Stack Baseline

| Component | Verified Version / Technology | Provenance / Configuration |
|---|---|---|
| **Runtime** | Node.js `v24.19.0` | Verified on Windows host via `node -v` |
| **Package Manager** | npm `11.1.0` | Pinned with `package-lock.json` |
| **Framework** | Next.js `16.4.2` (Turbopack) | Uses Next.js 16 App Router conventions |
| **UI Library** | React `19.3.1`, React DOM `19.3.1` | Concurrent rendering, Server Actions |
| **Language** | TypeScript `5.9.3` | Strict type checking (`npm run typecheck` passed) |
| **Database Authority** | Supabase (PostgreSQL `17.6.1.166` on AWS Mumbai) | Project `huftzhfqnnslvnfzvbex` |
| **Validation DB** | Supabase PostgreSQL `17.11` | Project `gvvqlfachzbufstzoiwi` |
| **Local DB Tooling** | Portable PostgreSQL `17.11-5` / `17.6-1` | Located in `.local/tools/` |
| **E2E & Testing** | Playwright `1.64.1`, `@axe-core/playwright` `4.14.0` | Native Node `--test` test runner |
| **Graphics & QR** | Three.js `0.187.0`, `qrcode` `1.5.4` | Canvas ASCII/pixel shaders & QR generation |
| **Hosting** | Vercel (Edge network + Node.js serverless functions) | Public deployment: `idealab-mec-web.vercel.app` |

---

## 2. Directory Structure Map

```text
F:\kannan\projects\IDEALAB\
├── Grow\                               # Sibling Flutter application (Grow / IDEALAB MEC mobile)
│   ├── lib\                            # Flutter client codebase (shared auth & legacy repositories)
│   ├── supabase\migrations\            # Historical and shared SQL migrations
│   └── docs\                           # Grow architectural and database contracts
│
└── idealab-mec-web\                    # Dedicated Web Platform (Next.js 16)
    ├── .github\workflows\ci.yml        # CI workflows (Website CI, Documentation CI, staff-authority-sql)
    ├── .local\tools\                   # Isolated portable PostgreSQL 17 & Supabase CLI binaries
    ├── docs\                           # Canonical specifications, release contracts & quality audit logs
    │   ├── audit\                      # Master audit reports directory
    │   ├── quality\                    # Specialized test run evidence & SQL rehearsal logs
    │   └── research\                   # Database dumps, catalog fingerprints & ACL scans
    ├── public\                         # Static assets (brand icons, editorial SVGs, intro textures)
    ├── scripts\                        # Node.js boundary test runner, browser acceptance & verification scripts
    ├── src\
    │   ├── app\                        # Next.js App Router (Routes, Layouts, Server Actions)
    │   │   ├── account-access\         # Onboarding & MEC declaration status & actions
    │   │   ├── app\                    # Protected member workspace (/app, /app/lab, /app/profile, etc.)
    │   │   ├── auth\                   # Auth callbacks & server actions (sign-in, sign-up, recovery)
    │   │   ├── design\                 # Isolated memory-only design & component preview pages
    │   │   ├── people\[id]\            # Public maker profile route (opaque UUID)
    │   │   ├── sign-in\                # Accessible sign-in page
    │   │   ├── sign-up\                # Accessible sign-up page
    │   │   ├── layout.tsx              # Root HTML layout with CSP nonce injection & theme bootstrap
    │   │   └── page.tsx                # Public landing & editorial discovery homepage
    │   ├── components\                 # Shared UI primitives (Carousels, Themes, Tickers, Navbars)
    │   ├── content\                    # Hardcoded editorial content (past events, facilities)
    │   ├── features\                   # Domain feature modules
    │   │   ├── events\                 # Event contract, carousel, studio editor & readers
    │   │   ├── profile\                # Maker profile, QR card, public editor & claim models
    │   │   ├── projects\               # Project cards, creation intent, join codes & queries
    │   │   └── requests\               # Work request draft composer, quote amounts & catalog
    │   ├── lib\                        # Core cross-cutting platform libraries
    │   │   ├── auth-config.ts          # Auth URL & provider validation gates
    │   │   ├── config.ts               # Environment detection & backend connection gates
    │   │   ├── member-access.ts        # Verified email & user session validators
    │   │   ├── member-profile.ts       # 13-field own-profile projection parser
    │   │   ├── member.ts               # requireMember() and loadMemberAccount() guards
    │   │   ├── security-headers.ts     # Dynamic CSP nonce generator & cookie security flags
    │   │   ├── supabase.ts             # Server-side Supabase SSR client
    │   │   └── visit-command.ts        # Visit check-in/out payload builders
    │   └── proxy.ts                    # Next.js 16 Proxy (Edge middleware replacing middleware.ts)
    └── supabase\                       # Database candidates, tests, fixtures and inspection scripts
        ├── tests\database\             # PostgreSQL pgTAP-style integration test fixtures
        └── validation\                 # Validation candidate SQL scripts for operational modules
```

---

## 3. Source-of-Truth & Ecosystem Mapping

| Area | Canonical Document | Relevant Source Paths | Implementation Status | Uncertainty & Architectural Gaps |
|---|---|---|---|---|
| **Identity & Admission** | `docs/mec-pilot-admission.md`, `docs/onboarding-requirements.md` | `src/lib/member-profile.ts`, `src/components/mec-declaration-form.tsx`, `src/app/account-access/` | **VALIDATION VERIFIED / LOCAL** | Shared database has `public.users` schema updated via `20261102130200`, but production onboarding is gated (`ENABLE_MEMBER_PLATFORM=false`). Does not verify student against live college database (self-declaration only). |
| **Authentication Lifecycle** | `docs/account-readiness.md`, `docs/recovery-session-contract.md` | `src/app/auth/actions.ts`, `src/lib/auth-config.ts`, `src/proxy.ts` | **PARTIAL / LOCAL IMPLEMENTATION** | Google OAuth callback works locally; production login blocked by source (`backendConfig()` returns null). Password recovery consume API (`20261105172121`) installed ONLY in validation DB `gvvqlfachzbufstzoiwi`, NOT in shared project. |
| **Public Profiles** | `docs/shared-public-profile-proposal.md` | `src/features/profile/public-profile-config.ts`, `src/app/people/[id]/page.tsx`, `src/features/profile/public-profile-editor.tsx` | **PREVIEW ONLY / SOURCE DISABLED** | `publicProfileEnabled()` is hardcoded to `return false;`. `shared_public_profile_v1.sql` is an unapplied candidate in Grow. Visiting `/people/[id]` unconditionally returns 404. |
| **Lab Presence & Opening** | `docs/lab-opening-contract.md`, `docs/own-visits-contract.md` | `src/app/app/lab/`, `src/components/lab-session-panel.tsx`, `src/components/lab-presence.tsx` | **VALIDATION ONLY / UNINSTALLED IN SHARED** | Functions `get_lab_opening_v1`, `set_lab_opening_v1`, `get_lab_presence_v1` exist ONLY in validation candidate SQL. `validationFeatureEnabled('labOpening')` hardcoded to reject non-validation environments. Wi-Fi/electricity status is completely hardcoded text. |
| **Work Requests** | `docs/work-request-intake-contract.md` | `src/features/requests/request-draft.tsx`, `src/app/app/requests/actions.ts` | **LOCAL BROWSER DRAFT ONLY** | Form saves to `localStorage`. `submit_work_request_v1` does not exist on shared Supabase. Non-students cannot submit requests (`role !== 'student'` rejection). |
| **Machine Bookings** | Part 1.4 Requirements & `docs/requirements.md` | `src/app/app/make-and-borrow/page.tsx` ("Book" tab) | **UI-ONLY PLACEHOLDER** | No rolling 14-day booking calendar, no operator slot selection, no conflict detection. Merely redirects to `/app/requests/new?from=book`. |
| **Manufacturing Queue** | `docs/requirements.md` (WEB-011) | None | **PLANNED / NOT IMPLEMENTED** | No data model, tables, RPCs, or UI for manufacturing task assignment, rework, or manual FIFO queue. |
| **Inventory & Borrowing** | `docs/requirements.md` (WEB-012) | `src/app/app/make-and-borrow/page.tsx` ("Borrow" tab) | **UI-ONLY PLACEHOLDER** | Displays "Shared tools. Inventory, availability and return records are not connected yet." No consumable allocation, no verified return flow. |
| **Events & RSVP** | `docs/events-contract.md`, `docs/event-draft-delivery.md` | `src/app/app/events/page.tsx`, `src/features/events/management-data.ts`, `src/app/app/events/manage/actions.ts` | **PARTIAL (Read-only + Validation Draft Studio)** | Events listing reads from legacy `public.events`. Event Head Studio (`/app/events/manage`) works only in validation. RSVP / Waitlist promotion is completely unconnected to UI and lacks shared DB RPCs. No "My Registrations" tab. |
| **Projects & Teams** | `docs/projects-contract.md` | `src/app/app/projects/page.tsx`, `src/features/projects/project-data.ts` | **VALIDATION-GATED / PARTIAL READS** | Discover and My projects read legacy `public.projects`. Create/Join actions call `mutate_project_v1` which is uninstalled on shared DB. Discovers before My Projects (contrary to requirement). |
| **Payments & Quotes** | `docs/project-resource-estimates.md` | `src/features/requests/quote-amounts.ts` | **LOGIC CANDIDATE ONLY** | Integer minor unit (paise) math verified in `quote-amounts.ts`. UPI payment submission, receipt upload, and head verification are disabled by owner decision. |
| **Staff Authority & Roles** | `docs/staff-authority-contract.md` | `supabase/validation/mec_staff_scope_candidate.sql` | **LOCAL CANDIDATE ONLY** | Candidate SQL introduces dual Machine Head enforcement and `student_ambassadors_v1`, but is not applied to shared DB. Lacks appointment/revocation audit trail for Student Ambassador and Lab Core. |
| **Grow Mobile Parity** | `Grow/docs/03_Database/ROLE_AND_POSITION_CONTRACT.md` | `Grow/lib/features/auth/` | **UNVERIFIED / BREAKING REGRESSION** | Shared profile migration `20261102130200` revoked direct `INSERT` and `UPDATE` on `public.users`. Legacy Grow codebase relies on direct table DML and fails with permission denied! |

---

## 4. Dead, Disconnected & Preview-Only Code Candidates

During code inspection, several files and routes were identified as disconnected from operational execution:

1. **`src/features/profile/public-profile-config.ts`**:
   `publicProfileEnabled()` hardcoded to `return false;`. Disconnects `public-profile-editor.tsx`, `public-profile-panel.tsx`, `public-profile-actions.ts`, and makes `/people/[id]` return 404.
2. **`src/app/design/*`**:
   Entire directory of mock pages (`/design/member-space`, `/design/onboarding`, `/design/requests`, `/design/student`, `/design/workspace`, `/design/event-manager`, `/design/event-carousel-test`, `/design/member-profile-edit`, `/design/project-create`). These routes operate completely in-memory with fake or sample catalogs (`sample-catalog.ts`).
3. **`src/components/workspace-arcade.tsx` -> `LabUtilityStatus`**:
   Hardcoded HTML with static Lucide icons for Wi-Fi and Electricity showing "Status unknown". Not connected to any data source.
4. **`src/content/past-events.ts`**:
   Static editorial file containing 3 hardcoded historical events. Kept as editorial fallback.
5. **`supabase/migrations/` in `idealab-mec-web`**:
   Completely empty directory! All actual migrations reside in `Grow/supabase/migrations/` or local `supabase/validation/`.
6. **`public/editorial/profile-maker-avatar.svg`**:
   Untracked avatar asset added to local worktree, not yet integrated into production image loaders.
