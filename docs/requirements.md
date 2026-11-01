# IDEALAB MEC web requirements

Current implementation evidence: [account delivery status](account-readiness.md).
It supersedes older status claims below about absent/gated local account controls;
production requirements and release gates remain unchanged.

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

Planning baseline: 21 October 2026. This records confirmed direction and release criteria; it does not claim the website, backend workflows or deployment is complete.

Student account creation and profile completion follow the updated product-owner decisions in [onboarding requirements](onboarding-requirements.md). These decisions supersede older mobile notes that treated phone and college roll as optional; they do not clear the shared-backend activation gate.

## Confirmed direction and scope

22 October opening decision: lab availability follows actual authorized core
Open/Close declarations, not fixed visiting hours. Members see the actor and
opening/closing times, including multiple duty periods in one day. Broader staff
work is deferred. See [opening contract](lab-opening-contract.md). This supersedes
fixed-hours assumptions for student check-in, whose writer still requires atomic
integration with current opening state.

Latest admission decision: the initial student pilot is **MEC-only in both the
website and Grow app**, using MEC registration numbers with `MDL` and `LMDL`
prefixes. This supersedes open student admission and the free-text institution
flow for the pilot. The [MEC admission contract](mec-pilot-admission.md) uses an explicit self-declaration plus one claim per normalized registration number. The pilot does not verify ownership against college records. Email verification, privacy, staff authority and shared account IDs remain distinct requirements.

Build the website first using Next.js and TypeScript: a public curated homepage plus a responsive signed-in application, followed by a mobile app informed by the validated experience. Individual project/event records require sign-in. Use the existing backend and accounts. Website UI cannot be automatically treated as a completed native mobile application. Brand: **IDEALAB MEC**. Preserve and polish the existing bright ink-and-paper neo-brutalist identity. Use Vercel hosting and the private `IDEALAB-MEC-WEB` repository in `MEC-IDEALAB`.

Historical GitHub/project setup snapshot — 21 October 2026: the private [organization project](https://github.com/orgs/MEC-IDEALAB/projects/1) was linked to the repository, with 14 issues, PR #14 and four milestones recorded. See [setup result](github-setup.json) and the [delivery tracker](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/1). Merged PR [#14](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/pull/14) contains the earlier website foundation. At that snapshot, later refinements were local; they have since merged in PR #19, as recorded in the [current account status](account-readiness.md). The error-summary focus race found on `c56665ba890c236f868be9f727200cbc58f8cea3` was corrected in `ca08645bf6e129698d413270707389033abf38dd`; the corrected source passed [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39491072209) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39491072246). No deployment was established at that time.

The requested public homepage, dark mode and neo-brutalist visual refresh are implemented and covered by local responsive browser checks. Existing request-hub work is preserved. A single Light/Dark toggle follows the operating-system preference until the user chooses a mode; that choice persists across reloads and tabs, with an in-memory fallback when storage is blocked. Semantic theme colors retain 2 px borders, hard shadows, readable availability text and literal artwork plates. The remaining work is the documented V1, starting with resolving shared identity/schema/security contracts before enabling member access.

The owner selected “Continue UI and GitHub setup first.” Shared-account activation is disabled by default with `ENABLE_MEMBER_PLATFORM=false`, independently of whether public backend keys exist. The current frontend foundation phase covers public UI, sample drafts and access-denial states; live identity, permissions and operational journeys remain gated.

The documented V1 is the product destination. Delivery is incremental: a working foundation does not establish production readiness for every module. Temporary sample catalog data is authorized for design/demo use only, visibly labeled **Demo — not verified stock or prices**, isolated from operational data and unable to imply availability or enable real bookings/payments. This exception does not authorize fictional requests, prices presented as actual charges, queue estimates, testimonials, achievements or operational success states.

| ID | Requirement | Release acceptance |
| --- | --- | --- |
| WEB-001 | Curated public introduction, purpose, participation and clear account entry | Accurate editorial content; individual project/event records and details require sign-in. |
| WEB-002 | Shared account signup, verification, sign-in, recovery and onboarding | MEC-only student admission across both clients, verified email and the chosen registration-claim policy; ordinary Student role and six-field onboarding before student Home. Preserve shared IDs and trusted staff paths. No invented email domain or duplicate identity store. |
| WEB-003 | Home / Lab / Profile anchors with contextual module links | Stable navigation, direct links and predictable Back; Home shows real next actions. |
| WEB-004 | Minimum account profile | Required name, +country-code phone, MEC registration number, department, current study year selected from Year 1–8 and canonical MEC institution for the pilot. One claim per normalized MEC number; compare without case/repeated/surrounding-space differences and preserve display text. Self-edit remains subject to registration-claim integrity; details are private by default. Rich profile remains deferred. |
| WEB-005 | Public/private projects, signed-in discovery and join requests | Public projects discoverable to signed-in users; project code creates a request; creator approves membership; private records protected server-side. |
| WEB-006 | Free/paid events and participation | Eligibility and capacity enforced atomically; payment pending holds no seat; Events Head handles event cancellation/refund decisions. |
| WEB-007 | Manual lab check-in/out and visit history | Purpose and timestamps recorded; outside-hours policy enforced; check-in grants no machine authority. QR remains optional. |
| WEB-008 | Separate Machine and Operations requests | One Start a Work Request entry, approved service-specific questions, collaborators/links, review, material-edit approval and accountable history. |
| WEB-009 | Preferred time followed by head confirmation | Requested time provisional; requester explicitly accepts any changed proposed time before it becomes agreed/confirmed. Declining a proposed time keeps the request open for another proposal, with no automatic expiry. Authorized head decision and acceptance audited; no inferred capacity reservation. |
| WEB-010 | Request cancellation | Direct cancellation before head claim/review, atomically checked; afterward reasoned request requiring responsible head decision. |
| WEB-011 | Manufacturing tasks, queue, machine state/runtime/maintenance | Separate entities and permissioned staff controls; verified catalog and safe disclosure; no student operation of fabrication machines. |
| WEB-012 | Inventory, assets, consumables and borrowing | Distinct item classes, approved imports/stock, movement history, due dates and Operations-verified return. Fine rules require approval. |
| WEB-013 | Quotes and manual UPI verification | Official QR and transaction/proof workflow; no automatic verification; no invented deposit, charge or refund rules. |
| WEB-014 | Notifications, operational exports and audit | Real events and read states; approved report scope; actor/action/entity/time metadata for critical mutations. |
| WEB-015 | Administration and configurable master data | Only Super Admin assigns/revokes machine/room-scoped heads and manages active-work handover/reassignment. Audited trusted assignments, approved configuration and server-enforced scoped access. |
| WEB-016 | Responsive and accessible professional experience | Criteria in [experience](experience.md); keyboard, touch, text enlargement, status feedback and reduced motion work. |
| WEB-017 | Truthful persistence and failure handling | Missing backend shows unavailable; drafts explicitly local/unsubmitted; no simulated operational success. |
| WEB-018 | Shared-backend production gate | Reconcile schema/grants/RLS/functions/storage/migration ledger, approve contracts and verify negative authorization before enabling writes. |

## Roles and permission boundaries

Payment setup checkpoint, 23 October 2026: the owner confirms IDEALAB has its own
GPay/UPI account but does not currently have its approved payee/UPI details.
Keep payment submission disabled; do not substitute a personal account or dummy QR.

These are required product responsibilities, not proof of deployed permission grants. Preserve compatibility account roles `student`, `lab_admin`, `super_admin`; positions are separately assigned trusted responsibilities.

| Actor | Intended controls | Required boundary |
| --- | --- | --- |
| Public visitor | Curated public editorial homepage | Individual project/event records require sign-in; no member data or anonymous ordering. |
| Signed-in member | Own profile/visits/requests, eligible events/borrowing, projects | Ownership/eligibility checks on server; cannot choose role/position or approve own payment. |
| Project creator | Project changes and membership decisions | Project-scoped authority; code never grants membership automatically. |
| Machine Head | Assigned machine requests, manufacturing tasks, queue and runtime | Machine/room-specific assignment required, plus training/machine policies and server transition authorization. |
| Operations Head | Operations requests, stock/prices, borrowing, billing and reports | Approved stock/pricing and financial rules; audited updates. |
| Events Head | Event publication, registration/payment decisions, attendance/refunds | Event-scoped authority, atomic capacity and payment transitions. |
| Super Admin | Exclusive head assignment/revocation and active-work handover/reassignment; master data, moderation and audit access | Trusted audited server path; no email-name inference or client-writable authority. Detailed action matrix and in-flight transaction effects still require decisions. |
| Other core positions | Web/Design and any approved responsibilities | No automatic operational powers; define roster/scope before granting controls. |

## Current evidence versus planned work

Current owner direction uses notebook cross-grid paper and the original yellow `#ffe029`/pink `#ff3994` anchors, coordinated blue `#a8c6ff`, purple `#c4b5f5`, red `#f39488` and green `#a6d9b5`, with cobalt actions and existing apricot/cream/jet-black. See [visual standard](design-system.md). Homepage content now includes Epilog, Snapmaker and Ultimaker facility photos, three broad activity themes and AICTE/CogniCor institutional context. The 11-entry `/lab` directory is published institutional content rather than live inventory; `/explore` uses officially supported March 2022 selection history. See [content provenance](content-sources.md) for verification limits. Individual event records remain signed-in only. Original local SVG artwork and HomeMotion retain progressive enhancement and reduced-motion behavior.

The maker-spirit eyebrow, hero service-availability footnote and first-card boilerplate were removed at the owner’s request. Factual unavailable messages remain on account/service routes. Sign-in retains its semantic form and password show/hide control, disabled while account activation is unavailable. The auth story panels use the current shared palette and theme controls. `/sign-up` shows a clearly labeled, disabled email/password registration preview and Google control, with no contact CTA or account-creation writes. The loading skeleton remains scoped to sign-in to preserve ordinary not-found HTTP status behavior.

The protected member route tree now uses Home / Lab / Profile top navigation across widths, shared with the no-data student wireframe. Lab groups Requests, Borrowing, Events, Visits and Projects; Profile groups account details and Settings. No member sidebar, bottom navigation or More menu remains. Existing direct module URLs and server guards are preserved. Notifications and theme stay top-right. The isolated profile save/declaration journey works; operational modules remain unavailable until their own backend acceptance. See [navigation evidence](research/workspace-topnav-2026-10-22.json).

Notebook/content validation passed (session 11250, exit 0): lint, production build and real browser coverage of five homepage widths and all three facility photos; the full 11-entry `/lab` directory at 320/768/1440 px in both themes; `/explore` history and public event-theme boundaries; prior contrast, motion, no-JavaScript, draft and guard journeys. Jet-black dark-mode validation subsequently passed in session 7536, including the body and neutral section strip. Backend availability, full V1 and deployment remain unverified.

The pushed foundation includes the curated public homepage, disabled-by-default account sign-in source, protected member pages and an account-scoped browser request draft. The request composer and hub improvements at `a3b0033` passed local browser acceptance and hosted CI. The later preview workflow adds a manually dispatched, preview-only Vercel path that checks plan eligibility and keeps member/design flags disabled. On 21 October, Node 24 lint/typecheck, 23 boundary tests, dependency audit, production build, Chromium acceptance and docs/link checks passed, followed by exact-head hosted Website CI, its required gate and Documentation CI. Live member and operational backend workflows remain unverified; the Vercel workflow has not been dispatched.

The protected `/app/requests` hub and opt-in `/design/requests` preview use a shared v1 parser/writer, restore and return continuity, device-clock save metadata, and optional HTTP(S) reference links. Signed-in drafts use an account key in local storage; isolated preview drafts stay in page memory and clear on refresh or leaving the app. Existing local drafts without the new optional reference list remain readable; malformed records are preserved until explicit replacement/deletion. This remains local and explicitly unsubmitted, not a live operational request workflow. Member activation remains off.

Cross-client privacy review found two Flutter read paths that display `public.users.name`: project-team member chips (`lib/features/projects/data/project_repository.dart`) and pending-booking requester rows (`lib/features/admin/data/admin_repository.dart`). The latest owner decision makes required onboarding fields private by default, so the unconditional live `users_read_all` policy and these joins do not satisfy the confirmed privacy contract. Keep production onboarding and these cross-user labels gated until a reviewed compatibility migration limits project rosters to an opted-in minimal display identity and booking-head queries to the assigned scope. No legal name or other required onboarding field is exposed as an implicit exception.

Current validation is recorded in the visual-standard interface pass above; previous homepage checks are superseded by the current-source local gate.

Design evidence: private [MagicPath project](https://www.magicpath.ai/files/463330845164449792) holds the homepage and student workspace desktop/mobile wireframes. No Figma, Penpot, Canva or generated-media artifact is established. MobileMockup was inspected but its image-only mobile-app concept workflow did not fit this website task. Firebase was not selected; no additional backend stack was introduced.

Read-only Supabase metadata/query access to `grow-idealab` (`huftzhfqnnslvnfzvbex`) was restored on 20 October 2026. The live schema lacks institution, department and current year-of-study fields on `public.users`; `user_education.end_year` is graduation/batch year and cannot substitute for study year. The raw global unique constraint on `public.users.college_roll` does not enforce the MEC pilot's approved case/space-normalized claim rule and does not prove ownership of a first claim. The earlier institution-scoped multi-institution rule is historical and superseded for the MEC-only pilot. No Auth profile-provisioning trigger was found; the live migration ledger has two entries and differs from checked-in Grow migrations. The `users_read_all` policy permits broad authenticated profile reads, and the current owner-update path is not column-restricted, so profile privacy and role integrity require correction and negative authorization tests. A prior Supabase dashboard inspection reported email auto-confirm enabled, but current Auth provider settings were not re-read in the latest session; verified-email signup and Google provider settings remain unverified. No user rows were queried, exploit attempted, DDL run, data changed, or production identity created. No migration or activation is authorized until exact cross-app migration and permission changes are reviewed and approved.

All remaining full-V1 operational modules are planned or gated, not implemented by this foundation. Signup/recovery/onboarding completeness and real operational writes are not established. Existing Flutter features and historical SQL are migration inputs, not proof of production web readiness. Preserve unrelated Flutter edits and existing accounts/data.

## Decisions still needed

1. Collaborator discovery/privacy and scoped-head routing remain open. On 22 October the owner approved Machine categories: laser cutting, 3D printing, CNC, cup printing, T-shirt printing, 3D design, laser design, lathe and woodwork; Operations: components, ICs, electronics tools and hardware. Required intake is service/title/description, with optional preferred time and references. Machine quantity/material/dimensions and Operations item/quantity/purpose may be optional. This authorizes intake categories, not stock, prices, availability or automatic machine access.
2. Time lifecycle details: rescheduling/cancellation effects, capacity source and conflicts. Preferred-time semantics, explicit requester acceptance of changed time, keeping declined proposals open for another proposal, and no automatic expiry are settled.
3. Authoritative machine/room-specific head roster, detailed allowed actions, handover mechanics/in-flight transaction effects and audit readers/retention. Only Super Admin assigns/revokes scoped heads and manages active-work handover/reassignment; no automatic reassignment rule is decided. Deputies/escalation remain deferred until pilot readiness.
4. MEC registration-format/course coverage, enforceable save-limit design, technical validation lengths, approved contacts/hours, policy texts and rich-profile field matrix. Self-declared eligibility is approved for the pilot; no college-record ownership check is promised. Country-code phone input, case/space comparison, Year 1–8, coordinated Flutter rollout, generic conflict errors/save limits and private-by-default profiles are confirmed; the pilot uses canonical MEC institution and one registration claim.
5. Deferred Operations inputs: verified catalog/stock/prices, quote/charge/deposit/balance/cancellation/refund/fine rules. Do not reintroduce historical 50/50 defaults.
6. Mandatory first-release report set and storage/upload contract.

No chat, payment gateway, AI estimation/validation, IoT, marketplace, advanced analytics or multi-institution UI is introduced by this plan. Knowledge base remains future scope.

## Canonical decisions and provenance

This standalone repository records current web scope and accepted owner decisions here, route/flow/wireframe requirements in [experience](experience.md), backend boundaries in [architecture](architecture.md), and delivery gates in [delivery plan](delivery-plan.md). Those local documents are the canonical website decision records; future backend implementation still requires verified contracts and approved migration evidence.

Historical planning inputs live in the parent Grow workspace at `docs/01_Product/PRODUCT_DECISION_DELTA_2026-09-17.md`, `docs/01_Product/00_PRODUCT_CHARTER.md`, `docs/00_Project/CURRENT_PROJECT_BASELINE.md`, `docs/02_Product/WORK_REQUEST_CONTRACT_DELTA.md`, `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md`, `docs/03_Database/ROLE_AND_POSITION_CONTRACT.md` and `docs/03_Database/STORAGE_ACCESS_CONTRACT.md`. These are provenance paths, not standalone repository dependencies or proof of deployed behavior.

## Branded loading state

The first page boot uses repeated lowercase IDEALAB wordmarks behind a maker scene with a drawn prototype, orbiting blueprint marker, staggered title, geometric star and indeterminate progress rail. It appears once per browser-tab visit. The bundled motion stylesheet starts each layer at a dim but readable opacity so the first CSS-rendered frame already shows the composition; a nonce-protected layout fallback preserves matching loader geometry if that stylesheet fails. The ten-second intro timeline starts with the first frame and includes scene assembly, followed by a 320 ms hand-off that keeps page controls inert until the overlay exits. Font and high-priority image readiness is bounded to 400 ms. Reduced-motion users skip the animation; a 12-second watchdog from initial boot releases interaction if startup stalls and may shorten the intro on very slow starts. JavaScript-disabled browsers do not receive an overlay, and the root route has no loading boundary so ordinary 404 status remains intact. See [loader timing and accessibility evidence](quality/loader-visual-timing-2026-11-01.md).
