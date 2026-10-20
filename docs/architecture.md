# Web and shared backend architecture

Status: website foundation implemented locally; operational backend contracts proposed, not deployed. Updated 20 October 2026.

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
  features/requests/      Account-scoped browser draft composer
  lib/                    Product configuration, session client and member guard
  proxy.ts                Session refresh and signed-out route protection
public/brand/             Official IDEA Lab and MEC logo files
docs/                     Requirements, flows, wireframes, architecture and evidence
```

Use TypeScript, Next.js App Router, React, semantic HTML and CSS tokens. Supabase Auth/Postgres remains the shared identity/data authority. Local fonts avoid third-party font requests. Node 24 is the initial tested runtime; dependencies and npm lockfile are pinned. Vercel is the chosen hosting target, not an existing deployment.

## Trust boundaries

Next.js validates the session on the server. `/app` refreshes cookies and is not publicly cached. Member profile reads select only the authenticated account's minimum fields. Missing/inactive profiles do not open the member workspace. The web app does not create a parallel user database or confer authority from client metadata.

Only a publishable/legacy anon key belongs in the public web configuration. Privileged keys are rejected. No privileged server key is required for the foundation. Backend error text and tokens must never appear in UI or logs. Server Actions use the user's session, not a service-role bypass.

The owner prioritized UI and GitHub setup before backend work. Shared-account activation is off by default (`ENABLE_MEMBER_PLATFORM=false`), independently of public key configuration. Existing email/password source is present but its live acceptance is unverified. Signup, recovery, browser Google OAuth and onboarding need provider/schema acceptance before enablement. Auth success, profile reads and permission behavior against the shared service remain unverified without a designated acceptance session.

## Shared business API proposal

One Postgres authority serves Next.js and Flutter. Each business mutation should use a transactional RPC, with actor derived from `auth.uid()`, ownership/scoped position checks, row locks where needed, idempotent retries and atomic history/audit/notification updates. These are proposed contracts, not callable API claims:

| Domain | Required atomic behavior |
| --- | --- |
| Work requests | Submit, claim/review, propose/approve changes, direct cancel, request/decide cancellation; resolve head-claim versus cancel race. |
| Scheduling | Preferred time is provisional; head confirms. The requester must explicitly accept a changed proposed time, per owner decision. Conflict/rescheduling side effects still need a precise contract. |
| Projects | Create with creator membership; join code creates a pending request; creator approves/denies; prevent last-lead removal. |
| Events | Lock capacity during confirmation; pending paid verification holds no seat; unique registration; Events Head cancellation/refund authority. |
| Positions | Super Admin manages audited scope/validity/revocation; current DB assignments checked for sensitive actions. Owner requires machine/room-specific assignments. Exact roster, delegation and action matrix still need confirmation. |
| Inventory/payments | Verified catalog, stock movements, return verification and manual payment decisions; no inferred balances, prices or automatic refunds. |

Work Requests, Manufacturing Tasks, Machine Queue, inventory and payments remain separate records and lifecycles. Cancelling a request must not silently refund, consume/release stock or stop an executing task.

## Compatibility gate

Repository schema sources conflict: `users.role` versus `base_role/system_role`, project `lead` versus `owner`, event status vocabularies, and RSVP uniqueness/status assumptions. Existing Flutter event and project writes are multiple calls rather than one transaction. Do not copy these races into the website.

Before persistence: inspect the live migration ledger/schema/grants/RLS/functions, reconcile with canonical migrations, approve the resulting architecture and compatibility plan, then implement reviewed migrations with rollback and negative authorization tests. Shared/production DB writes require specific authorization; the website request itself does not authorize an ad-hoc live migration. The first schema inspection timed out; no live schema was established. The Supabase connector subsequently became unavailable in this session.

## Current UI boundary

The public homepage is curated. Individual project/event records require sign-in, per owner decision. Member operational pages clearly state that their service is not connected. The request composer saves only a browser draft under an account-derived key; it never submits, reserves capacity or notifies staff. Drafts persist after sign-out and should not contain sensitive data on shared devices.

Staff workspace and administrator wireframes are in [experience.md](experience.md). No privileged controls are enabled until backend authority is verified.
