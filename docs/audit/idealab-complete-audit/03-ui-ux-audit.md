# 03 — UI and UX Audit

**Audit Date:** 2026-11-06\\
**Auditor:** Senior Product Designer, UX Researcher & Frontend Accessibility Specialist\\
**Aesthetic Baseline:** Retro Pixel Art + ASCII Art + Neo-Brutalism + Modern Maker Community\\
**Tested Viewports:** 320px (iPhone SE), 375px, 390px (iPhone 14), 768px (iPad Mini), 1024px (iPad Pro), 1440px (Desktop)\\
**Accessibility Target:** WCAG 2.2 Level AA

---

## 1. Route & Screen Inventory

| Route | Intended Audience | Auth Requirement | Layout Strategy | Loading / Empty / Error States | Operational Connectivity |
|---|---|---|---|---|---|
| `/` | Public visitors & prospective members | Anonymous / Public | Desktop grid + Mobile stacked; ASCII Canvas Intro | Static fallback if WebGL fails; dynamic SSR | **Fully Connected** (Curated editorial) |
| `/sign-in` | Members & Applicants | Unauthenticated only (redirects `/app` if logged in) | Centered neo-brutalist card with animated pixel background | Inline notices for expired/invalid sessions | **Live Public UI / Auth Gated** |
| `/sign-up` | New students | Unauthenticated only | Multi-step preview with Google & Password forms | Form validation messages, disabled CTA | **Gated Preview** (Disabled in production) |
| `/confirm-email` | Newly registered users | Unauthenticated / Pending | Centered card with resend trigger | Resend confirmation feedback | **UI Ready / Delivery Gated** |
| `/forgot-password` | Account recovery | Unauthenticated only | Minimal card with email input | Generic feedback to prevent enumeration | **UI Ready / Delivery Gated** |
| `/reset-password` | Account recovery callback | Recovery session bound | Password confirmation card | Session mismatch / expiration notice | **Validation Gated** |
| `/account-access` | Incomplete / unadmitted members | Authenticated (incomplete profile) | Single-column wizard card sequence | Step-by-step errors, preserves input | **Connected in Validation** |
| `/app` | Admitted members | `requireMember()` | Desktop top nav, Mobile bottom nav | Suspense skeletons (`MemberLoadingSkeleton`) | **Connected (Reads only)** |
| `/app/lab` | Admitted members | `requireMember()` | Two-column desktop grid / Mobile stack | Skeletons for session & presence | **Partial (Validation gated)** |
| `/app/profile` | Admitted members | `requireMember()` | Maker Card showcase + portfolio preview | Dynamic metadata fallback | **Partial (Public share disabled)** |
| `/app/profile/edit` | Admitted members | `requireMember()` | Multi-section navigation with anchor tags | Stubs for unintegrated sections | **Partial (Basic MEC fields editable)** |
| `/app/make-and-borrow` | Admitted members | `requireMember()` | 3-tab layout: Make / Book / Borrow | LocalStorage draft composer | **UI / Mock Only (Make is local draft)** |
| `/app/events` | Admitted members | `requireMember()` | Programme filters + responsive card grid | Skeletons & invalid param notices | **Connected for Reads** (RSVP missing) |
| `/app/events/manage` | Event Heads | `requireMember()` (Event Head scope) | Dual pane draft editor + scope switcher | Field errors, rupee/paise math | **Validation Gated** |
| `/app/projects` | Admitted members | `requireMember()` | Tabbed view (Discover / My projects) | Empty states for queries | **Partial (Create/Join gated)** |
| `/app/projects/new` | Admitted members | `requireMember()` | Creation wizard with intent journal | Account-bound retry journal | **Validation Gated** |
| `/app/projects/join` | Admitted members | `requireMember()` | Form for 8-character join code | Code validation & pending status | **Validation Gated** |
| `/people/[id]` | Public profile visitors | Public / Anonymous | Opaque card with tags & links | `notFound()` when disabled | **Disabled in Source** (404) |

---

## 2. Visual Design & Aesthetic Audit

### 2.1 Aesthetic Direction Adherence
The application successfully adheres to the approved **Retro Pixel Art + ASCII Art + Neo-Brutalism** identity:
- **Foundations:** Strict 2px solid black (`#000000`) and neutral borders with hard 4px offset box shadows (`box-shadow: 4px 4px 0px #000000`).
- **Color Tokens:** Anchored on high-voltage yellow (`#ffe029`), hot pink (`#ff3994`), electric cobalt (`#2864ff`), mint green (`#a6d9b5`), and lavender (`#c4b5f5`). Dark mode adheres to jet-black (`#0a0a0a`) with high-contrast borders (`#333333` / `#ffffff`).
- **Typography:** Display headings utilize `Press Start 2P` and `Space Grotesk Bold`, while long body copy utilizes readable `DM Sans` (avoiding pixel font fatigue for paragraphs).
- **Motion & Cinematic Intro:** The ASCII TV-to-hands intro (`src/components/home-motion.tsx`) and the flowing pastel pixel shader (`src/components/auth-pixel-background.tsx`) provide distinctive artistic character while maintaining a strict 30 fps cap and pause capabilities.

### 2.2 Inconsistencies & Visual Defects
1. **Carousel End Gaps:** On viewport widths between 1024px and 1280px, the `FeaturedActivitiesCarousel` displays an empty visual gap on the right margin when scrolled to the end of the slide track.
2. **Double Scrollbar on Desktop Lab Workspace:** In `/app/lab`, the outer viewport scrollbar and an inner card container (`.workspace-lab-overview`) trigger nested vertical scrollbars on Windows Chrome when screen height is under 800px.
3. **Contrast Warning on Pill Badges:** Badges with yellow background (`#ffe029`) using white text in dark mode produce a contrast ratio of 1.4:1 (severe WCAG failure). Yellow elements must strictly enforce black text (`#000000`) across all themes.

---

## 3. Responsive Layout & Viewport Inspection

### 3.1 Mobile Viewports (320px – 390px)
- **Bottom Navigation Bar:** Mobile navigation renders smoothly via a fixed bottom navigation bar (`.member-mobile-nav`) on screens $\le 850\text{px}$. The active tab is indicated with an inverted accent color.
- **Header Compression:** Header correctly compresses to show only the IDEALAB brand logo, the theme toggle, and notification bell.
- **Horizontal Overflow Check:** No horizontal scrolling observed on `/`, `/sign-in`, or `/app`. Content correctly wraps within `calc(100vw - 32px)`.
- **Keyboard Overlap on Auth:** On 320px screens (iPhone SE), when the software keyboard opens in `/sign-in`, the submit button is pushed below the fold, but the container remains scrollable. However, form error summaries lack `scroll-margin-top`, occasionally causing the error banner to hide behind sticky headers.

### 3.2 Tablet & Desktop Viewports (768px – 1440px)
- **Desktop Top Navigation:** Flips cleanly to top navigation with breadcrumb trail at $851\text{px}$.
- **Grid Balance:** The 2-column layout on `/app/lab` (Lab Session Panel on left, Presence & Bulletins on right) balances well on wide monitors without exceeding the maximum content width of 1280px.

---

## 4. Interaction & UX Journey Audit

### 4.1 False Success States & Disconnected Flows
1. **Work Request Draft vs Submission:**
   In `/app/requests/new`, clicking "Save draft" saves data exclusively to the browser's `localStorage`. The UI displays a green checkmark stating "Draft saved to this device." Users frequently mistake this for submission to the Lab team. When `onlineCommandId` is absent (which is true in standard shared environments), there is NO way to actually submit the request!
2. **Machine Booking Tab:**
   In `/app/make-and-borrow?section=book`, the user is greeted with "Propose a machine time" and a button "Prepare a machine request". Clicking this button merely redirects to `/app/requests/new?from=book`, opening the generic text form. There is no calendar, no slot picker, and no queue indication.
3. **Tool Borrowing Tab:**
   In `/app/make-and-borrow?section=borrow`, the page states "Shared tools. Inventory, availability and return records are not connected yet." Clicking "Prepare an Operations request" again dumps the user into the generic text draft.
4. **Edit Profile Stub Sections:**
   In `/app/profile/edit`, 7 out of 9 navigation sections (Social links, Profile settings, Activity, Work experience, Education, Volunteering, Interests) are dead-end stubs rendering `<NotReadySection />` with a "Not connected" badge.

### 4.2 Accessibility & WCAG 2.2 AA Audit
- **Keyboard Focus Management:** Focus order is generally logical (Tab moves down cards, Shift+Tab moves back). Focus rings use a distinctive 2px solid cobalt outline with 2px offset.
- **Escape Key Dismissal:** Dialogs and mobile navigation drawers correctly dismiss on `Escape` keypress and restore focus to the triggering element.
- **Screen Reader Announcements:** Form errors in `mec-declaration-form.tsx` utilize `role="alert"` and `aria-live="polite"`.
- **Reduced Motion Compliance:** All CSS animations and Three.js canvas shaders query `prefers-reduced-motion: reduce` and respect the manual `<AutomaticMotionControl />` toggle.
- **Axe-Core Automated Pass:** Automated Playwright axe audits (`npm run test:event-studio` and `npm run test:member-space`) report zero critical WCAG violations on rendered public components.

---

## 5. Prioritized UI/UX Recommendations

| Finding ID | Severity | Route / Component | Defect Description | Recommended Fix |
|---|---|---|---|---|
| **UX-001** | **P1** | `/app/projects` | Discover Projects is displayed before My Projects, violating project specification. | Change default tab view in `ProjectsPage` to `'mine'` and re-order tab links so My Projects appears first. |
| **UX-002** | **P1** | `/app/events` | Missing "My Registrations" tab/filter. Only `upcoming`, `ongoing`, `completed`, `cancelled`, and `all` exist. | Add `mine` filter to `event-contract.ts` and render "My Registrations" tab in `/app/events`. |
| **UX-003** | **P1** | `/app/requests/new` | User confusion between local draft save and server submission. | Add prominent persistent banner distinguishing "Local Browser Draft (Unsubmitted)" from "Submitted Request". |
| **UX-004** | **P2** | `/app/lab` | Hardcoded Wi-Fi & Electricity utility status showing "Status unknown". | Wire `LabUtilityStatus` to an operational database table (`lab_utilities_v1`) with timestamped core updates. |
| **UX-005** | **P2** | `/app/profile/edit` | 7 stub sections confuse users seeking to build maker portfolios. | Group deferred portfolio sections under an expandable "Future Roadmap" drawer rather than prominent tabs. |
| **UX-006** | **P3** | Global CSS | Contrast failure on yellow badges (`#ffe029`) in dark mode. | Enforce `color: #000000 !important;` on all elements bearing yellow background tokens. |
