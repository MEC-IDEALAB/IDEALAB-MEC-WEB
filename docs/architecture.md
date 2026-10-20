# Web and shared backend architecture

Status: local homepage/theme correction prioritized; basic browser request workspace integrated; operational backend contracts proposed, not deployed. Updated 20 October 2026.

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
  lib/                    Product configuration, session client and member guard
  proxy.ts                Session refresh and signed-out route protection
public/brand/             Official IDEA Lab and MEC logo files
docs/                     Requirements, flows, wireframes, architecture and evidence
```

Use TypeScript, Next.js App Router, React, semantic HTML and CSS tokens. Supabase Auth/Postgres remains the shared identity/data authority. Local fonts avoid third-party font requests. Node 24 is the initial tested runtime; dependencies and npm lockfile are pinned. Vercel is the chosen hosting target, not an existing deployment.

## Visual-standard interface layer

Current owner direction uses notebook cross-grid paper and the original yellow `#ffe029`/pink `#ff3994` anchors, coordinated blue `#a8c6ff`, purple `#c4b5f5`, red `#f39488` and green `#a6d9b5`, with cobalt actions and existing apricot/cream/jet-black. See [visual standard](design-system.md). Homepage content now includes Epilog, Snapmaker and Ultimaker facility photos, three broad activity themes and AICTE/CogniCor institutional context. The 11-entry `/lab` directory is published institutional content rather than live inventory; `/explore` uses officially supported March 2022 selection history. See [content provenance](content-sources.md) for verification limits. Individual event records remain signed-in only. Original local SVG artwork and HomeMotion retain progressive enhancement and reduced-motion behavior.

The maker-spirit eyebrow, hero service-availability footnote and first-card boilerplate were removed at the owner’s request. Factual unavailable messages remain on account/service routes. Sign-in retains its semantic form and password show/hide control, disabled while account activation is unavailable. The auth story panels use the current shared palette and theme controls. `/sign-up` remains information/contact only, with no registration writes or OAuth. The loading skeleton remains scoped to sign-in to preserve ordinary not-found HTTP status behavior.

MagicPath project `463330845164449792` was updated with hierarchy/wireframe annotations and earlier accent panels. It is a planning reference, not the high-fidelity source of the implemented interface. No Figma/Penpot/Canva or generated-media artifact is claimed.

Notebook/content validation passed (session 11250, exit 0): lint, production build and real browser coverage of five homepage widths and all three facility photos; the full 11-entry `/lab` directory at 320/768/1440 px in both themes; `/explore` history and public event-theme boundaries; prior contrast, motion, no-JavaScript, draft and guard journeys. Jet-black dark-mode validation subsequently passed in session 7536, including the body and neutral section strip. Backend availability, full V1 and deployment remain unverified.

## Trust boundaries

Next.js validates the session on the server. `/app` refreshes cookies and is not publicly cached. Member profile reads select only the authenticated account's minimum fields. Missing/inactive profiles do not open the member workspace. The web app does not create a parallel user database or confer authority from client metadata.

Only a publishable/legacy anon key belongs in the public web configuration. Privileged keys are rejected. No privileged server key is required for the foundation. Backend error text and tokens must never appear in UI or logs. Server Actions use the user's session, not a service-role bypass.

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

Before persistence: inspect the live migration ledger/schema/grants/RLS/functions, reconcile with canonical migrations, approve the resulting architecture and compatibility plan, then implement reviewed migrations with rollback and negative authorization tests. Shared/production DB writes require specific authorization; the website request itself does not authorize an ad-hoc live migration. Supabase remains installed and connected. Project metadata identified `grow-idealab` (`huftzhfqnnslvnfzvbex`) as `ACTIVE_HEALTHY` on 20 October 2026, while public table/migration/minimal SQL calls and three subsequent database health checks timed out. Attempts to open/access the Chrome SQL dashboard tab also hit CDP timeouts. No live schema or SQL result is established; this is a database/dashboard-access issue, not an uninstalled tool. No restart or compute change was authorized or performed. The [official timeout guide](https://supabase.com/docs/guides/troubleshooting/failed-to-run-sql-query-connection-terminated-due-to-connection-timeout) recommends inspecting project health.

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

The initial page boot and sign-in loading boundary use repeated IDEALAB.MEC wordmarks with alternating row motion, inspired by the existing official-site loader. The overlay clears on hydration without a minimum display duration; a five-second fail-open watchdog prevents a stuck screen if scripts fail. JavaScript-disabled browsers do not show the boot overlay. Reduced motion leaves rows static. The root route has no loading boundary, preserving ordinary 404 HTTP responses. Loader visual and dismissal checks are part of browser acceptance; live backend readiness is unchanged.
