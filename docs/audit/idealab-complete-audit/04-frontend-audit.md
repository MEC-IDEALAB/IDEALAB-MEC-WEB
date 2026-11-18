# 04 — Frontend and Codebase Audit

**Audit Date:** 2026-11-06\\
**Auditor:** Senior Full-Stack Next.js Engineer & Frontend Performance Architect\\
**Framework:** Next.js `16.4.2` (Turbopack) | React `19.3.1` | TypeScript `5.9.3`\\
**Quality Checks:** `npm run lint` (0 errors), `npm run typecheck` (0 errors), `npm run test:boundaries` (204/204 passing)

---

## 1. Component Architecture & Rendering Boundaries

### 1.1 Server vs. Client Component Boundaries
The application properly leverages Next.js App Router server-side execution:
- **Server Component Dominance:** Top-level layouts and pages (`src/app/**/page.tsx`, `src/app/**/layout.tsx`) are Server Components. They handle data loading, authentication gates, and header/cookie reads without shipping React client-side runtime overhead.
- **Client Leaf Boundaries:** Interactive components (`RequestDraft`, `MecDeclarationForm`, `ProfileSetupForm`, `HomeMotion`, `AutomaticMotionControl`, `ThemePicker`) are explicitly marked with `'use client';` at the top of their files.
- **Data Fetching Placement:** Data fetching occurs server-side via `serverClient()` and direct Supabase RPCs. Client components receive read-only serializable props or invoke Server Actions for mutations.

### 1.2 State Management Patterns
1. **URL State as Truth:** Tab navigation, pagination cursors, and filters (`/app/make-and-borrow?section=make`, `/app/projects?view=mine`, `/app/events?status=upcoming`) are stored directly in search parameters, ensuring browser history, Back/Forward navigation, and deep linking work predictably.
2. **Offline Draft State (LocalStorage & IndexedDB):**
   - Unauthenticated / Preview Drafts: Stored in page memory (`useState`) and cleared upon route exit.
   - Member Work Request Drafts: Stored in `localStorage` under an account-scoped key (`draft_v1_${accountId}`) in `draft-storage.ts`.
   - Creation Journals (Projects & Events): Stored in `IndexedDB` (`pending-submission.ts` and `project-create-intent.ts`) to provide cross-tab deduplication and recover from network dropouts.
3. **Form State:** Managed via standard React 19 form actions and `useActionState` (e.g. `saveRequiredProfile`, `claimMecRegistration`), returning explicit status unions (`{ status: 'idle' | 'saved' | 'error' | ... }`).

---

## 2. Code Quality & TypeScript Rigor

### 2.1 Type Safety & Strictness
- **Zero Use of `any` in Core Logic:** Domain models and contracts (`OwnProfile`, `EventSaved`, `ProjectCommand`, `IntakeState`) utilize strictly typed `Readonly<{ ... }>` interfaces and exhaustive union discriminations.
- **Runtime Validation:** JSON responses from Supabase RPCs are not blindly cast with `as`. Instead, dedicated validation functions (e.g., `parseRow` in `member-profile.ts`, `parseRegistrationClaimResponse` in `registration-claim.ts`) inspect object prototypes, check property enumerable descriptors, and validate string formats via regex before returning typed records.
- **Typecheck Verification:** Running `npm run typecheck` against the entire codebase passes with zero errors.

### 2.2 Memory Management & Lifecycle Cleanup
- **Canvas & WebGL Cleanup:** In `src/components/home-motion.tsx` and `src/components/auth-pixel-background.tsx`, canvas animations and WebGL contexts clean up requestAnimationFrames, detach window resize listeners, and dispose Three.js scene geometry inside `useEffect` cleanup returns:
  ```tsx
  useEffect(() => {
    // ... scene initialization ...
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);
  ```
- **Timer Cleanup:** Active session reminders in `src/components/active-session-reminder.tsx` cleanly clear interval timers upon unmount.

---

## 3. Styling & CSS Architecture

### 3.1 Styling System
- The codebase uses standard CSS files organized per feature (`home-neo.css`, `member-shell.css`, `workspace-arcade.css`, `auth-arcade.css`, `public-profile.css`).
- CSS variables (`--color-primary`, `--color-accent-pink`, `--color-bg`, `--border-width`) defined on `:root` and `[data-theme='dark']` enforce consistent design tokens across themes.

### 3.2 Styling Defects & Risks
1. **Lack of CSS Modules / CSS Scoping:**
   Styles are loaded globally via `<link rel="stylesheet">` or component imports without CSS Module hashing (`.module.css`). Classes like `.workspace-card`, `.button`, `.eyebrow`, and `.status-badge` are declared across multiple CSS files (`home-refinements.css`, `workspace-arcade.css`, `member-shell.css`). This creates specificity collisions and fragile cascade overrides.
2. **Duplicate CSS Rules:**
   Rules for `.workspace-pixel-label` and `.lab-status-badge` appear in both `workspace-arcade.css` and `member-shell.css` with slight font-size discrepancies (11px vs 12px).
3. **Large Cumulative CSS Overhead:**
   Total uncompressed CSS across all sheets exceeds 180 KB. While manageable, lack of tree-shaking means every route loads CSS for inactive features.

---

## 4. Frontend Defects & Architectural Findings

| Finding ID | Severity | File / Component | Issue Description | Recommended Remediation |
|---|---|---|---|---|
| **FE-001** | **P1** | `src/features/profile/public-profile-config.ts` | `publicProfileEnabled()` is hardcoded to `return false;`. Disables public maker profile functionality completely. | Wire `publicProfileEnabled()` to environment configuration (`process.env.ENABLE_PUBLIC_PROFILE_V1 === 'true'`) once the database candidate is applied. |
| **FE-002** | **P2** | `src/app/app/projects/page.tsx` | View defaults to `'discover'` instead of `'mine'`, forcing users to switch tabs to see their own work. | Change `const view = params.view === 'discover' ? 'discover' : 'mine';` so My Projects loads by default. |
| **FE-003** | **P2** | `src/components/featured-activities-carousel.tsx` | Carousel track calculation leaves empty white space at the end of the scroll container on viewports between 1024px and 1280px. | Adjust CSS flex basis and scroll-snap margins to ensure the last card aligns with the viewport right padding. |
| **FE-004** | **P2** | `src/app/auth-arcade.css` & `src/app/workspace-arcade.css` | Global namespace collisions on `.workspace-card` and button utility classes due to lack of CSS scoping. | Migrate component styles to CSS Modules (`[name].module.css`) or prefix class names with distinct BEM namespaces (`.ws-card`, `.auth-card`). |
| **FE-005** | **P3** | `src/components/editorial-posters.tsx` | Missing `sizes` attribute on responsive Next.js `<Image />` tags, causing the browser to download larger image assets than necessary. | Add explicit `sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"` to all editorial image components. |
