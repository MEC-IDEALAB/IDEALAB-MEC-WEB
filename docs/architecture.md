# Web and shared backend architecture

Current UI/auth verification: see [UI audit](ui-audit.md). It supersedes earlier notes about three-option theme menus, repeated boot loading and database timeouts. Supabase read-only connectivity is restored; shared authorization/profile-provisioning defects still block account activation.

Status: public website and first-visit loader are locally implemented and browser-verified; request workspace remains a browser-only draft; V1 operational backend contracts are not deployed. Updated 21 October 2026.

## Structure and technology

The dedicated website lives in `apps/idealab-mec-web`. It can be exported as a standalone repository without copying Flutter source, secrets or build output.

```text
src/
  app/                    Next.js App Router pages, layouts and metadata
    auth/                 Server Actions for existing-account sign-in/sign-out
    app/                  Protected member routes
    sign-in/              Accessible sign-in and configuration states
    fonts/                Verified local fonts and their licenses
  components/             Brand, navigation and shared interface primitives
  features/requests/      Account-scoped browser draft composer and request hub
  lib/                    Product configuration, session client, security policy and member guard
  proxy.ts                Request CSP nonce, session refresh and signed-out route protection
public/brand/             Official IDEA Lab and MEC logo files
docs/                     Requirements, flows, wireframes, architecture and evidence
```

Use TypeScript, Next.js App Router, React, semantic HTML and CSS tokens. Supabase Auth/Postgres remains the shared identity/data authority. Local fonts avoid third-party font requests. Node 24 is the initial tested runtime; dependencies and npm lockfile are pinned. Vercel is the chosen hosting target, not an existing deployment.

## Visual-standard interface layer

Current owner direction uses notebook cross-grid paper and the original yellow `#ffe029`/pink `#ff3994` anchors, coordinated blue `#a8c6ff`, purple `#c4b5f5`, red `#f39488` and green `#a6d9b5`, with cobalt actions and existing apricot/cream/jet-black. See [visual standard](design-system.md). Homepage content now includes Epilog, Snapmaker and Ultimaker facility photos, three broad activity themes and AICTE/CogniCor institutional context. The 11-entry `/lab` directory is published institutional content rather than live inventory; `/explore` uses officially supported March 2022 selection history. See [content provenance](content-sources.md) for verification limits. Individual event records remain signed-in only. Original local SVG artwork and HomeMotion retain progressive enhancement and reduced-motion behavior.

The maker-spirit eyebrow, hero service-availability footnote and first-card boilerplate were removed at the owner’s request. Factual unavailable messages remain on account/service routes. Sign-in retains its semantic form and password show/hide control, disabled while account activation is unavailable. The auth story panels use the current shared palette and theme controls. `/sign-up` remains information/contact only, with no registration writes or OAuth. The loading skeleton remains scoped to sign-in to preserve ordinary not-found HTTP status behavior.

MagicPath project `463330845164449792` was updated with hierarchy/wireframe annotations and earlier accent panels. It is a planning reference, not the high-fidelity source of the implemented interface. No Figma/Penpot/Canva or generated-media artifact is claimed.

Notebook/content validation passed in earlier sessions. The current source passed ESLint, TypeScript, the production build, all 16 boundary tests and real browser E2E on 21 October 2026. Browser coverage includes five homepage widths, all eleven facility assets, both themes and contrast, auth viewport fit, no-JavaScript rendering, first-load animation lifecycle and reduced motion, protected-route denial, sample draft boundaries, page/card motion, 404, fresh CSP nonces on each response and no browser CSP violations on the public journey. This evidence is public/sample only; live member journeys, full V1 and deployment remain unverified.

## Trust boundaries

Next.js validates the session on the server. `/app` refreshes cookies and is not publicly cached. Member profile reads select only the authenticated account's minimum fields. Missing/inactive profiles do not open the member workspace. The web app does not create a parallel user database or confer authority from client metadata.

Only a publishable/legacy anon key belongs in the public web configuration. Privileged keys are rejected. No privileged server key is required for the foundation. Backend error text and tokens must never appear in UI or logs. Server Actions use the user's session, not a service-role bypass.

## Response security and rendering

The Next.js Proxy generates a fresh 128-bit nonce for each matched page request and sends a nonce-based Content Security Policy both to the renderer and in the response. The root layout attaches that nonce to its two fixed bootstrap scripts; Next.js attaches it to framework scripts. Production `script-src` has no `unsafe-inline` or `unsafe-eval`. `style-src-attr 'unsafe-inline'` is scoped to CSS attributes because the production browser acceptance run showed Next/Image layout styles are blocked by a style-element nonce alone; CSS style elements remain nonce-restricted. Other directives restrict default sources, frames, forms, objects and base URLs. Supabase auth cookies are `HttpOnly`, keep `SameSite=Lax`, and receive `Secure` in production. This repository currently uses only server-side Supabase clients; if browser-side Supabase auth is introduced, revisit `HttpOnly`, since [Supabase's SSR guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide) says browser clients need access to refresh tokens.

Nonce-based CSP makes matched pages dynamically rendered. The 21 October production build confirms the homepage and user-facing pages are on-demand routes; static asset paths and prefetch requests are excluded from Proxy. This trades static-page/CDN caching for per-response script nonces. No hosted latency or traffic cost measurement has been performed. See the [security review](security-review.md) for test evidence and remaining live-auth limits. Cookie flags were verified in code and boundary tests, but no real Supabase `Set-Cookie` response was generated because member activation remains disabled.

The owner prioritized UI and GitHub setup before backend work. Shared-account activation is off by default (`ENABLE_MEMBER_PLATFORM=false`), independently of public key configuration. Existing email/password source is present but its live acceptance is unverified. Signup, recovery, browser Google OAuth and onboarding need provider/schema acceptance before enablement. Auth success, profile reads and permission behavior against the shared service remain unverified without a designated acceptance session.

## Shared business API proposal

One Postgres authority serves Next.js and Flutter. Each business mutation should use a transactional RPC, with actor derived from `auth.uid()`, ownership/scoped position checks, row locks where needed, idempotent retries and atomic history/audit/notification updates. These are proposed contracts, not callable API claims:

| Domain | Required atomic behavior |
| --- | --- |
| Work requests | Submit, claim/review, propose/approve changes, direct cancel, request/decide cancellation; resolve head-claim versus cancel race. |
| Scheduling | Preferred time is provisional; head confirms. The requester must explicitly accept a changed proposed time. Declining keeps the request open for another proposal with no automatic expiry. Conflict/rescheduling side effects still need a precise contract. |
| Projects | Create with creator membership; join code creates a pending request; creator approves/denies; prevent last-lead removal. |
| Events | Lock capacity during confirmation; pending paid verification holds no seat; unique registration; Events Head cancellation/refund authority. |
| Positions | Only Super Admin assigns/revokes machine/room-scoped heads and manages active-work handover/reassignment; sensitive actions check current DB assignments. Exact roster, action matrix, handover mechanics and in-flight effects remain unresolved; no automatic reassignment rule is inferred. |
| Inventory/payments | Verified catalog, stock movements, return verification and manual payment decisions; no inferred balances, prices or automatic refunds. |

Work Requests, Manufacturing Tasks, Machine Queue, inventory and payments remain separate records and lifecycles. Cancelling a request must not silently refund, consume/release stock or stop an executing task.

## Compatibility gate

Repository schema sources conflict: `users.role` versus `base_role/system_role`, project `lead` versus `owner`, event status vocabularies, and RSVP uniqueness/status assumptions. Existing Flutter event and project writes are multiple calls rather than one transaction. Do not copy these races into the website.

Read-only reconciliation on 21 October 2026 now succeeds for project `grow-idealab` (`huftzhfqnnslvnfzvbex`). The live migration ledger reports only `20260503073726 create_initial_schema` and `20260503073744 add_rls_policies`; no development branch exists. Live `public.users` uses `role` and `is_active`, while the canonical repository migration defines `base_role`/`system_role`; Flutter reads/writes `role`. The live authenticated `users_read_all` policy is unconditional, own-row INSERT/UPDATE are permitted, broad table grants exist, and no `auth.users` provisioning trigger is present. Auth settings show Google and email enabled with signup/autoconfirm enabled, but successful account journeys remain untested. Security advisors also flag mutable function search paths, public execution of a SECURITY DEFINER role helper, and disabled leaked-password protection; the helper body returns only the caller's own role. No schema/data write, user-row read, test signup or exploit was performed.

Before persistence: reconcile the live contract and short migration ledger with canonical Grow migrations and Flutter auth/profile consumers, approve the architecture and compatibility plan, independently review a migration and rollback, then verify profile privacy, authority-field denial, email signup, Google provisioning and ordinary profile edits in a safe validation environment. The specific shared-project change requires the user's explicit authorization. A new Supabase branch was not created; cost must be checked and explicitly accepted first. Do not claim backend activation, full V1 or a production-ready authenticated workflow based on UI tests or metadata.

## Current UI boundary

The public homepage is curated. Individual project/event records require sign-in, per owner decision. Member operational pages clearly state that their service is not connected. The request composer saves only a browser draft under an account-derived key; it never submits, reserves capacity or notifies staff. Drafts persist after sign-out and should not contain sensitive data on shared devices.

Staff workspace and administrator wireframes are in [experience.md](experience.md). No privileged controls are enabled until backend authority is verified.

## Theme and homepage implementation

The owner’s current priority is correcting the homepage, adding dark mode and restoring the intended neo-brutalist identity before further request-workspace development. Existing request-hub work is preserved. Light, Dark and System themes are implemented locally with pre-paint initialization, OS preference handling, persisted/cross-tab choice and an in-memory fallback when storage is blocked. Semantic theme colors retain 2 px borders, hard shadows, readable availability text and literal artwork plates. `src/components/theme-picker.tsx` owns the accessible choice control; `src/app/theme.css` supplies semantic palettes, responsive treatments and reduced-motion behavior. The root document initializes the selected mode before paint. Blocked persistence still applies the requested theme to the current page; cross-tab updates and System mode remain supported.

Current validation is recorded in the visual-standard interface pass above; previous homepage checks are superseded by the current-source local gate.

Design evidence: private MagicPath project `463330845164449792` was created and opened; an actual canvas read verified 11 shapes across two desktop/mobile frames. No Figma, Penpot, Canva or generated-media artifact is established. MobileMockup was inspected but its image-only mobile-app concept workflow did not fit this website task. Firebase was not selected; no additional backend stack was introduced.

## Browser request-workspace boundary

`/app/requests` retains `requireMember`; `/design/requests` shares the workspace only when `ENABLE_DESIGN_PREVIEW=true` and uses isolated sample storage. Basic storage/composer integration supports one account-keyed draft, legacy v1 restoration, return/restore continuity and deletion. Enhanced reference validation remains unimplemented. The browser checks cover sample/local behavior, not authenticated success or live submission. The previous pushed revision `3ea9fd69d80b802a3ab30dd4f2f14994d02bcec9` passed both [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39459247881) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39459247807). Those hosted results do not cover the unpushed visual-standard pass.

## Branded loading state

The first visit in a tab shows smaller IDEALAB marks moving continuously across the notebook grid, behind a Neo-brutalist card with an animated circuit, cube, brand lockup and indeterminate progress. Dismissal waits for font readiness and a paint; the 560 ms brand reveal prevents a flash, but a slow load exits as soon as it is ready. A 190 ms fade keeps the content inert through the transition. Reduced-motion users see a static screen that exits without the reveal delay. A 4.8-second watchdog is the fail-open, blocked storage skips the loader, and repeat reloads/client navigation do not repeat it. The ordinary root 404 status remains intact; route and sign-in skeletons stay separate from the first-visit splash.
