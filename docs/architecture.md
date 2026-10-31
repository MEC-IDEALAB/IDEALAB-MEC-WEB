# Web and shared backend architecture

Current implementation evidence: [account delivery status](account-readiness.md).
The [Events programme/detail read contract](events-contract.md) is implemented
and installed only in isolated validation, with no retained programme fixtures.
Its read/denial and paging checks passed; actual member browser rendering is
unverified while browser access is disabled. Registration/capacity/payment and
trusted staff publishing remain incomplete. See [Events evidence](quality/events-read-2026-10-23.md).
The [student request intake contract](work-request-intake-contract.md) has local
submit/list/detail/cancel source and private-table SQL installed only in isolated
validation. Retention is resolved as anonymized lab history; scoped SQL checks
passed. Genuine browser submission acceptance remains blocked by browser access.
See [current evidence](quality/work-request-intake-2026-10-23.md). Existing browser
drafts remain available. This does not establish receiving-head, scheduling,
billing or manufacturing behavior, or authorize shared production activation.
The Projects core contract is installed only in the isolated validation project.
It retains Grow's project columns and stage/role vocabulary while guarding writes
through transactional functions. Creator approval is required for membership;
codes create requests. See [project contract](projects-contract.md) and
[current acceptance](quality/projects-core-2026-10-22.md). Shared rollout is not cleared.
The latest isolated operational slice adds [guarded own visit writes](visit-writes-contract.md)
with [real browser and database evidence](quality/own-visit-writes-2026-10-22.md).
Check-in requires current core Open status; exact-owner checkout remains possible
after closure. No direct client attendance writers or production changes exist.
Core-controlled availability is now installed only in the isolated project;
see [opening contract](lab-opening-contract.md) and
[actual verification](quality/core-lab-opening-2026-10-22.md). Opening duty is a
private explicit capability separate from account role or individual attendance.
The newest operational read slice is the [own-visits contract](own-visits-contract.md):
Grow-compatible table/read API installed only in the isolated project, no writers
or production policy changes. See [actual checks](quality/own-visits-read-2026-10-22.md).
Genuine isolated Google login/provisioning, the profile card and the owner's
declaration-to-workspace journey have passed their scoped checks. Production,
email/password, second-account and concurrency acceptance remain open.

Latest isolated account-test state (22 October 2026): the reviewed identity,
profile/provisioning, admission, save and claim candidates are now installed
**only in idealab-mec-validation** after independent review, an in-transaction
zero-Auth guard and same-transaction preflights. Twenty-eight post-installation
SQL assertions pass; direct anonymous profile/table/RPC access is denied and the
private schema is unexposed. See [installation evidence](research/isolated-account-baseline-2026-10-22.json).
Earlier "uninstalled" entries describe the preceding rollback-only snapshots.
This is an isolated test baseline, not a production schema change or activation
approval. Real verified-account, email/provider, Flutter and concurrency acceptance
remain outstanding; member/Google flags stay off by default.


Historical GitHub recheck (22 October 2026): [PR #14](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/pull/14)
was merged by the owner on 21 October 2026 at 12:51:22 UTC, producing
`0504b41a1427640bd8fcbdeda48423f5ea24c05a`. Its head
`7219815bcb3f1216264ec8a85ea46ec4be2bb6df` passed Documentation gate,
Public foundation acceptance and Required gate. GitHub reports no formal PR
reviews. The current `codex/modern-brutalist-home` working changes are local;
those earlier CI results do not validate the current source or live accounts.
Earlier statements below about keeping PR #14 draft are historical and superseded.
No new push, merge or deployment was performed in this recheck.

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

The maker-spirit eyebrow, hero service-availability footnote and first-card boilerplate were removed at the owner’s request. Factual unavailable messages remain on account/service routes. Sign-in, signup and recovery use Supabase server actions in the isolated validation configuration; `/account-access` provides the protected multi-step profile and MEC-declaration flow. Google sign-in and the owner's isolated onboarding journey passed. Email/password confirmation, login and recovery delivery remain unverified, and production member activation remains off. The auth story panels use the current shared palette and theme controls. The loading skeleton remains scoped to sign-in to preserve ordinary not-found HTTP status behavior. See [current account status](account-readiness.md).

MagicPath project `463330845164449792` was updated with hierarchy/wireframe annotations and earlier accent panels. It is a planning reference, not the high-fidelity source of the implemented interface. No Figma/Penpot/Canva or generated-media artifact is claimed.

On 21 October 2026, application source `29d512bd6a968c477692921c033fc47488752841` and browser-acceptance harness `830ac6d00dd8518f8110e2048f2de344bc3b7e7e` passed Node 24.19.0 lint, TypeScript, all 26 boundary tests, dependency audit (zero findings), production build and real production-browser acceptance. Documentation validation passed for 15 files and 70 local links. Exact-head [Website CI, browser acceptance and required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39517845382) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39517845380) passed on the documentation-only PR snapshot `85b4ab2f5a17486542e82f0133231eedf7e80167`. The draft slice covers validated reference links, account-local member draft behavior, page-memory-only preview drafts with route-exit cleanup, accessibility/focus and responsive states. Browser coverage is public/sample only; live member journeys, full V1 and deployment remain unverified. The manual Vercel preview workflow is present on the draft PR branch and has not been dispatched.

## Trust boundaries

Next.js validates the session on the server. `/app` refreshes cookies and is not publicly cached. Member profile reads select only the authenticated account's minimum fields. Missing/inactive profiles do not open the member workspace. The web app does not create a parallel user database or confer authority from client metadata.

Only a publishable/legacy anon key belongs in the public web configuration. Privileged keys are rejected. No privileged server key is required for the foundation. Backend error text and tokens must never appear in UI or logs. Server Actions use the user's session, not a service-role bypass.

## Response security and rendering

The Next.js Proxy generates a fresh 128-bit nonce for each matched page request and sends a nonce-based Content Security Policy both to the renderer and in the response. The root layout attaches that nonce to its two fixed bootstrap scripts; Next.js attaches it to framework scripts. Production `script-src` has no `unsafe-inline` or `unsafe-eval`. `style-src-attr 'unsafe-inline'` is scoped to CSS attributes because the production browser acceptance run showed Next/Image layout styles are blocked by a style-element nonce alone; CSS style elements remain nonce-restricted. Other directives restrict default sources, frames, forms, objects and base URLs. Supabase auth cookies are `HttpOnly`, keep `SameSite=Lax`, and receive `Secure` in production. This repository currently uses only server-side Supabase clients; if browser-side Supabase auth is introduced, revisit `HttpOnly`, since [Supabase's SSR guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide) says browser clients need access to refresh tokens.

Nonce-based CSP makes matched pages dynamically rendered. The 21 October production build confirms the homepage and user-facing pages are on-demand routes; static asset paths and prefetch requests are excluded from Proxy. This trades static-page/CDN caching for per-response script nonces. No hosted latency or traffic cost measurement has been performed. See the [security review](security-review.md) for test evidence and remaining live-auth limits. Cookie flags were verified in code and boundary tests, but no real Supabase `Set-Cookie` response was generated because member activation remains disabled.

The owner prioritized public UI delivery before production backend activation. Shared-account activation is off by default. Local validation can only target the approved `idealab-mec-validation` project. Production account integration is now rejected in website source even if old environment flags and the Grow project URL are supplied: the inspected shared `public.users` grants/policies still expose other members' sensitive fields and allow authority-column updates. Re-enable only after a reviewed shared migration, current Flutter compatibility, real cross-client acceptance and an explicit source review. Genuine isolated Google login, profile save and MEC declaration passed; email/password confirmation and recovery remain unverified.

The server-side account loader checks the current `auth.getUser()` identity's
nonblank email, `is_anonymous=false` and confirmation timestamp before calling
`get_own_profile_v1`. Its exact thirteen-field, owner-bound projection contains
the twelve allowed account fields, decimal-text revision and a database-computed
`mec_admitted` boolean. The parser rejects malformed/older responses, mismatched
owners, unsupported contract versions and unsafe revision values. There is no
fallback to the former active-only table read.

`requireMember` returns only ready accounts; other states redirect to the private
`/account-access` route outside the operational layout. Each existing workspace
page uses that guard before its own account/data access. Version-0/incomplete
Students cannot enter; complete Students also need backend admission. Trusted
staff retain a separate active-account path. Inactive, unverified and unavailable
states stay distinct. The status page wires six-field profile save and MEC
declaration/claim writes. Reviewed identity, read, save, admission and claim
functions are installed only in the isolated validation project. The existing
account's verified Google, profile and declaration journey passed there. Keep
production activation off pending a reconciled shared migration, Data API and
both-client acceptance.

The password-recovery slice uses the same gated server-side Supabase client.
Email requests return generic feedback to avoid account enumeration; callback
exchange uses the configured canonical origin and fixed
`/auth/recovery/callback` path; password updates require a session confirmed
with `auth.getUser()`, and the local session is cleared afterward. These routes
are noindex and remain disabled while `ENABLE_MEMBER_PLATFORM` is false. Local
configuration and browser fixtures do not verify provider redirect allowlists,
email delivery, a real PKCE exchange or password change; see the [deployment
requirements](deployment.md#environment-boundary).

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

## MEC student pilot and shared identity

The owner restricted the initial student platform to Model Engineering College
students in **both Next.js and Flutter**. The [admission contract](mec-pilot-admission.md)
supersedes unrestricted student admission. Use a canonical MEC institution and
one claim per normalized MEC registration number, ignoring case and repeated/
surrounding spaces while preserving display text. `MDL24CS219` and lateral-entry
`LMDL` are supplied examples, not an exhaustive official format directory or proof
that a claimant owns the number. The owner approved self-declared MEC eligibility
for the pilot: a student attests to current MEC attendance and that the number is
theirs, then makes one unique claim. No roster, document or email-domain check is
part of this pilot. Uniqueness cannot stop another person from making the first
claim; that assurance limit is accepted for the pilot, not an independent
verification result.

Keep email verification, account role/active status, six-field profile completion
and the self-declared pilot admission state separate in database/API and both route gates. A
complete Student profile cannot grant admission without the explicit declaration and unique claim. Required phone entry includes
`+country-code`; year remains selected current study year 1–8. Preserve existing
identities, staff roles/access paths and inactive states. No new verification badge
or role/eligibility authority is inferred from a number or email domain.

Production remains **one shared Supabase Auth/database authority**. A free isolated
validation project is for non-production migration/Auth/Data API and both-client
acceptance only; it is not a second production identity store or a production-data
copy. The owner approved coordinated Flutter updates before activation. The web
and mobile clients must consume the reviewed versioned contract together, rather
than preserving unsafe old direct authority writes.

## Compatibility gate

Repository schema sources conflict: `users.role` versus `base_role/system_role`, project `lead` versus `owner`, event status vocabularies, and RSVP uniqueness/status assumptions. Existing Flutter event and project writes are multiple calls rather than one transaction. Do not copy these races into the website.

Read-only reconciliation on 21 October 2026 now succeeds for project `grow-idealab` (`huftzhfqnnslvnfzvbex`). The live migration ledger reports only `20260503073726 create_initial_schema` and `20260503073744 add_rls_policies`; no development branch exists. Live `public.users` uses `role` and `is_active`, while the canonical repository migration defines `base_role`/`system_role`; Flutter reads/writes `role`. The live authenticated `users_read_all` policy is unconditional, own-row INSERT/UPDATE are permitted, and the grant view lists broad DML/TRUNCATE/trigger privileges for both API roles across the profile tables. No `auth.users` provisioning trigger is present. A previous dashboard read reported Google/email signup and email autoconfirm enabled, but the current connector cannot re-read Auth provider settings; treat them as unverified. Security advisors also flag mutable function search paths, public execution of a SECURITY DEFINER role helper, and disabled leaked-password protection; the helper body returns only the caller's own role. No schema/data write, user-row read, test signup or exploit was performed.

Before persistence: reconcile the live contract and short migration ledger with canonical Grow migrations and Flutter auth/profile consumers, approve the architecture and compatibility plan, independently review a migration and rollback, then verify profile privacy, authority-field denial, email signup, Google provisioning and ordinary profile edits in a safe validation environment. The specific shared-project change requires the user's explicit authorization. No Supabase branch was created. The confirmed Free organization received a branch quote of $0.01344/hour, but branching also requires Pro. A separate project quote returned $0 monthly; the owner then explicitly approved the fresh isolated Free project `idealab-mec-validation` (`gvvqlfachzbufstzoiwi`) in Mumbai (`ap-south-1`), now `ACTIVE_HEALTHY`. Its [metadata baseline](research/isolated-supabase-baseline-2026-10-21.json) records PostgreSQL 17.11, UTF8, `en_US.UTF-8`, zero public tables and zero migrations; management metadata reports build `17.11.0.003`. This is an empty non-production validation environment, not a production clone or acceptance pass. No paid upgrade, production-data copy, account, application migration or Auth-setting change was made; production and the old paused validation project remain unchanged. Do not claim backend activation, full V1 or a production-ready authenticated workflow based on UI tests or metadata.

The scoped cross-client checklist, actor/operation acceptance matrix and current evidence are recorded in [backend readiness](backend-readiness.md). It is a review plan, not approved SQL or authorization to create a billable branch or change the shared project.

The next review candidate is the [shared profile contract proposal](shared-profile-contract-proposal.md).
It specifies the six-field mapping on the existing account row, completion states,
an intended own-profile API/privilege boundary, resumable saves, compatible client
rollout and actual database/Auth acceptance. Proposed API names are not deployed.
Case/space comparison, country-code phone entry, self-declared MEC eligibility and
coordinated Flutter update are owner-confirmed. Exhaustive registration formats,
technical attestation/claim/validation/save-limit design and actual migration/account
tests remain open.
The isolated environment is now available, but does not clear the architecture/
migration or shared-project change gate.
A [native PostgreSQL 16.1 runtime smoke check](database-validation.md) passed with
Node 24.19.0 on a fresh UTF8/C cluster only. It did not test app SQL, Auth, RLS or
migrations and does not establish PostgreSQL 17.6/en_US.UTF8 parity.

## Current UI boundary

The public homepage is curated. Individual project/event records require sign-in, per owner decision. In `idealab-mec-validation` only, guarded Supabase routines support event reads, project-core transitions, own visit check-in/out, core-controlled lab availability, and student request submission/history/pre-review cancellation. These isolated features do not establish compatibility with Grow production or a complete staff workflow; head notifications, scheduling, inventory, borrowing, event registration/payment and broader administration remain unavailable. The request composer also keeps a separate account-keyed browser draft, which is not a submitted request and may persist after sign-out; members should avoid saving private information on shared devices.

`/design/onboarding` is a separate opt-in preview guarded by `ENABLE_DESIGN_PREVIEW=true`. It renders the confirmed fields and local validation only; it keeps values in memory, never calls Supabase, is marked `noindex`, and returns 404 when preview is off. The real `/account-access` route reads and writes the admitted user's profile through guarded routines only in the isolated validation configuration. Keep production member activation disabled until the shared schema/provisioning path is approved and tested.

Staff workspace and administrator wireframes are in [experience.md](experience.md). The isolated project has one explicitly granted core lab-opening test capability; this does not establish the production staff-role contract. Broader privileged controls remain disabled until backend authority is verified.

## Theme and homepage implementation

The requested homepage, dark mode and polished neo-brutalist identity are implemented in this foundation slice. Existing request-hub work is preserved. A single Light/Dark toggle follows the operating-system preference until a mode is chosen; that choice persists across reloads and tabs, with an in-memory fallback when storage is blocked. Semantic theme colors retain 2 px borders, hard shadows, readable availability text and literal artwork plates. `src/components/theme-picker.tsx` owns the accessible toggle; `src/app/theme.css` supplies semantic palettes, responsive treatments and reduced-motion behavior. The root document initializes the selected mode before paint. Blocked persistence still applies the requested theme to the current page.

Current validation is recorded in the visual-standard interface pass above; previous homepage checks are superseded by the current-source local gate.

Design evidence: private [MagicPath project](https://www.magicpath.ai/files/463330845164449792) holds the homepage and student workspace desktop/mobile wireframes. No Figma, Penpot, Canva or generated-media artifact is established. MobileMockup was inspected but its image-only mobile-app concept workflow did not fit this website task. Firebase was not selected; no additional backend stack was introduced.

## Browser request-workspace boundary

`/app/requests` retains `requireMember`; `/design/requests` shares the workspace only when `ENABLE_DESIGN_PREVIEW=true` and keeps its sample draft in page memory. Signed-in drafts default to account-keyed local storage and are explicitly warned as browser-local. Both routes share one v1 parser/writer, restore legacy drafts without `references`, record a device-clock timestamp, and validate up to five HTTP(S) links (2,048 characters each, no embedded credentials). Unsafe or malformed stored records remain until explicit replacement/deletion. In the isolated validation project, a distinct guarded backend path supports online request submission, owner-only history and pre-review cancellation. Preview memory clears on refresh or leaving the app and never writes to local/session storage; this is sample behavior only. Real browser submit/reload/cancel, overlapping commands and shared Grow production compatibility remain unverified. Current evidence is recorded in [request intake](quality/work-request-intake-2026-10-23.md), [draft behavior](quality/request-draft-copy-2026-10-23.md) and the [delivery plan](delivery-plan.md#verification-and-evidence-checklist).

## Branded loading state

The first visit in a tab shows repeated IDEALAB marks behind an open maker scene with a drawn prototype, staggered wordmark, geometric star and an indeterminate rail. The three title chunks reveal in sequence; the scene waits for fonts/high-priority images or a bounded 1.1 seconds, and fast loads hold the complete reveal for at least 1.18 seconds. A 320 ms fade keeps content inert until the hand-off completes. Reduced-motion users skip the reveal and exit immediately. Hydrated pages have a 3.6-second watchdog; an inline no-hydration fallback releases the overlay after 4.4 seconds. Blocked session storage skips the loader, and reloads/client navigation do not repeat it. The ordinary root 404 status remains intact; route and sign-in skeletons stay separate from the first-visit splash. Current browser evidence is in [the loader timing record](quality/loader-motion-2026-10-31.md).
