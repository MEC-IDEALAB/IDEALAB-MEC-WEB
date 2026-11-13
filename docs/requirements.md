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
| WEB-007 | Manual lab check-in/out and visit history | One-tap check-in with a generic visit label, authoritative timestamps, and current lab-open state enforced; app-wide active-session timer/reminder and checkout; check-in grants no machine authority. QR remains optional. |
| WEB-008 | Separate Machine and Operations requests | One Start a Work Request entry, approved service-specific questions, collaborators/links, review, material-edit approval and accountable history. |
| WEB-009 | Preferred time followed by head confirmation | Requested time provisional; requester explicitly accepts any changed proposed time before it becomes agreed/confirmed. Declining a proposed time keeps the request open for another proposal, with no automatic expiry. Authorized head decision and acceptance audited; no inferred capacity reservation. |
| WEB-010 | Request cancellation | Direct cancellation before head claim/review, atomically checked; afterward reasoned request requiring responsible head decision. |
| WEB-011 | Manufacturing tasks, queue, machine state/runtime/maintenance | Separate entities and permissioned staff controls; verified catalog and safe disclosure; no student operation of fabrication machines. |
| WEB-012 | Inventory, assets, consumables and borrowing | Distinct item classes, approved imports/stock, movement history, due dates and Operations-verified return. Fine rules require approval. |
| WEB-013 | Estimates, approved quotes and manual UPI verification | Provisional estimates use an approved, versioned rate catalog and itemized assumptions; verified actual usage is separate. Official payment route, fee terms and refund rules must be approved before payment submission; no automatic verification or invented charge. |
| WEB-014 | Notifications, operational exports and audit | Real events and read states; approved report scope; actor/action/entity/time metadata for critical mutations. |
| WEB-015 | Administration and configurable master data | Student Ambassador and Super Admin have equal in-app administrative powers, including operational Head assignment/revocation and handover. Use an audited trusted-roster path and server-enforced scope. Infrastructure credentials and ownership remain separate. |
| WEB-016 | Responsive and accessible professional experience | Criteria in [experience](experience.md); keyboard, touch, text enlargement, status feedback and reduced motion work. |
| WEB-017 | Truthful persistence and failure handling | Missing backend shows unavailable; drafts explicitly local/unsubmitted; no simulated operational success. |
| WEB-018 | Shared-backend production gate | Reconcile schema/grants/RLS/functions/storage/migration ledger, approve contracts and verify negative authorization before enabling writes. |

## Event, project-resource and work-request flows — owner direction, 3 November 2026

The member Home and Lab show multiple upcoming activities in a horizontally
scrollable event strip. Each card opens a dedicated event detail route using a
shared event layout. The Events destination lists the full event programme with
status filters and bounded pagination. The list, detail route and carousel
already exist in the web source; their current Supabase contract is read-only.

Students need a real RSVP/registration record. The Event Head creates and
manages events and configures open or invite-only eligibility, capacity, the
attendee-list visibility, and free or paid status. The owner chose Event Head
control of attendee visibility, with registered attendees as the default.
Attendance names must be served only to audiences allowed by that event's
setting. A free RSVP must enforce eligibility and capacity atomically. A paid
event may be configured, but its RSVP/payment path stays disabled until the
official payment route, fee terms and refund rules are approved; no personal
payment account or unverified payment flow may be substituted.

Projects lists the signed-in member's projects and active campus projects,
including visibility, project details, membership counts and an appropriately
private member roster. Keep existing project create and creator-approved join
flows. A project may request machine work or components/tools through the common
Make & borrow request hub. The project ID must be validated against membership
and visibility on the server. A request is not a reservation, confirmed stock,
machine authorization or charge.

Project resource accounting distinguishes a request, estimate, accepted quote,
actual use, final bill and payment confirmation. The owner confirmed that the
assigned head prepares an estimate from entered filament/service details, sends
it to the student, and work starts only after the student explicitly approves.
After production, the head records actual usage and the final bill, confirms
payment, and closes the request into history. Students do not upload design
files; storage limitations make head-entered quantities the first release path.
The initial filament rate of ₹3 per gram is approved. Assigned heads manage
rates only within their trusted scope; every change is versioned and audited.

The server must snapshot rate versions and assumptions in each estimate, keep
estimated quantities distinct from verified actuals, and calculate the final
bill from head-recorded actual usage. No production begins without student
approval. Initial rates for machine use, design and time-based service beyond
the approved filament rate are not configured yet; assigned heads will manage
rates in their trusted scope before those charges are quoted. A declined
estimate stays open for the head to revise or reject. A higher final bill
requires an explicitly submitted student approval checkbox tied to that bill’s
revision and amount. The student pays using IDEALAB’s official UPI QR and
enters the transaction ID. The head verifies receipt before closure. A project
showcase report may publish only verified usage, approved totals and explicitly
shareable member fields. Inventory, booking, pricing, report storage and public
sharing still require reviewed authorization, retention and audit contracts.
See [project resource estimates](project-resource-estimates.md).

The current Make & borrow request categories are Machine work (laser, 3D
printing/design, CNC, cup/T-shirt printing, laser design, lathe and woodwork)
and Operations support (components, ICs, electronics tools and hardware).
Service, title and description are required. Preferred time, reference links,
quantity, material, dimensions and other technical details remain optional.
Head confirmation is required for a booking or operational change; the
requester's explicit acceptance remains required when a proposed time changes.

As of this date, the website has the event list/detail/carousel and project
list/create/detail/join-request surfaces, plus a Make & borrow draft workflow.
It does not have connected event RSVP/Event Head APIs, project-linked resource
usage/cost/report APIs, or production request submission. The active Supabase
schema contains legacy `events`, `rsvps`, `projects`, `project_members`,
`tools` and `tool_bookings` tables, but only the initial schema, shared access
hardening and shared profile migrations are recorded. It has no event/project
RPCs in the inspected public schema; direct event/RSVP/project membership
policies are insufficient for capacity, eligibility or creator/head decisions.
Do not enable the feature from table presence alone. A complete reviewed
migration and negative authorization/concurrency tests are release gates.

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
| Super Admin and Student Ambassador | Equal in-app administrative powers, including operational Head assignments, master data, moderation and authorized audit access | Trusted audited roster path; no self-elevation, email-name inference or client-writable authority. Supabase/service-role credentials, database ownership, GitHub organization ownership, Vercel ownership and production secrets remain outside application roles. |
| Other core positions | Web/Design and any approved responsibilities | No automatic operational powers; define roster/scope before granting controls. |

## Current evidence versus planned work

Current owner direction uses notebook cross-grid paper and the original yellow `#ffe029`/pink `#ff3994` anchors, coordinated blue `#a8c6ff`, purple `#c4b5f5`, red `#f39488` and green `#a6d9b5`, with cobalt actions and existing apricot/cream/jet-black. See [visual standard](design-system.md). Homepage content now includes Epilog, Snapmaker and Ultimaker facility photos, three broad activity themes and AICTE/CogniCor institutional context. The 11-entry `/lab` directory is published institutional content rather than live inventory; `/explore` uses officially supported March 2022 selection history. See [content provenance](content-sources.md) for verification limits. Individual event records remain signed-in only. Original local SVG artwork and HomeMotion retain progressive enhancement and reduced-motion behavior.

The maker-spirit eyebrow, hero service-availability footnote and first-card boilerplate were removed at the owner’s request. Factual unavailable messages remain on account/service routes. Sign-in retains its semantic form and password show/hide control, disabled while account activation is unavailable. The auth story panels use the current shared palette and theme controls. `/sign-up` shows a clearly labeled, disabled email/password registration preview and Google control, with no contact CTA or account-creation writes. The loading skeleton remains scoped to sign-in to preserve ordinary not-found HTTP status behavior.

The protected member route tree and no-data wireframe share Home / Lab / Profile navigation. Desktop uses the top navigation; phones use a bottom navigation bar and keep only the brand, theme and notification utilities in the top header. Lab quick access is one responsive card with Make & borrow, Events and Projects; old request/borrow URLs redirect to the combined destination, and Visits stay within the check-in/history card. Profile contains account details and Settings. Existing server guards remain. Operational modules remain unavailable until their own backend acceptance. See the current [member workspace redesign](member-workspace-redesign-2026-11-02.md).

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
3. Named trusted-roster maintainer and backup, approved machine/room scope map, detailed actions, handover/in-flight transaction effects and audit retention. The 4 November decision supersedes earlier Super-Admin-only wording: Student Ambassador and Super Admin have equal in-app administrative powers and both use the trusted roster process. No automatic reassignment rule is decided. Deputies/escalation remain deferred until pilot readiness.
4. MEC registration-format/course coverage, enforceable save-limit design, technical validation lengths, approved contacts/hours, policy texts and rich-profile field matrix. Self-declared eligibility is approved for the pilot; no college-record ownership check is promised. Country-code phone input, case/space comparison, Year 1–8, coordinated Flutter rollout, generic conflict errors/save limits and private-by-default profiles are confirmed; the pilot uses canonical MEC institution and one registration claim.
5. Deferred Operations inputs: verified catalog/stock/prices, quote/charge/deposit/balance/cancellation/refund/fine rules. Do not reintroduce historical 50/50 defaults.
6. Mandatory first-release report set and storage/upload contract.

No chat, payment gateway, AI estimation/validation, IoT, marketplace, advanced analytics or multi-institution UI is introduced by this plan. Knowledge base remains future scope.

## Canonical decisions and provenance

This standalone repository records current web scope and accepted owner decisions here, route/flow/wireframe requirements in [experience](experience.md), backend boundaries in [architecture](architecture.md), and delivery gates in [delivery plan](delivery-plan.md). Those local documents are the canonical website decision records; future backend implementation still requires verified contracts and approved migration evidence.

Historical planning inputs live in the parent Grow workspace at `docs/01_Product/PRODUCT_DECISION_DELTA_2026-09-17.md`, `docs/01_Product/00_PRODUCT_CHARTER.md`, `docs/00_Project/CURRENT_PROJECT_BASELINE.md`, `docs/02_Product/WORK_REQUEST_CONTRACT_DELTA.md`, `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md`, `docs/03_Database/ROLE_AND_POSITION_CONTRACT.md` and `docs/03_Database/STORAGE_ACCESS_CONTRACT.md`. These are provenance paths, not standalone repository dependencies or proof of deployed behavior.

## Branded loading state

The first page boot uses repeated lowercase IDEALAB wordmarks behind a maker scene with a drawn prototype, orbiting blueprint marker, staggered title, geometric star and indeterminate progress rail. It appears once per browser-tab visit. The bundled motion stylesheet starts each layer at a dim but readable opacity so the first CSS-rendered frame already shows the composition; a nonce-protected layout fallback preserves matching loader geometry if that stylesheet fails. The ten-second intro timeline starts with the first frame and includes scene assembly, followed by a 320 ms hand-off that keeps page controls inert until the overlay exits. Font and high-priority image readiness is bounded to 400 ms. Reduced-motion users skip the animation; a 12-second watchdog from initial boot releases interaction if startup stalls and may shorten the intro on very slow starts. JavaScript-disabled browsers do not receive an overlay, and the root route has no loading boundary so ordinary 404 status remains intact. See [loader timing and accessibility evidence](quality/loader-visual-timing-2026-11-01.md).


## Approved V1 execution — 4 November 2026

The approved staged plan in [delivery plan](delivery-plan.md) supersedes earlier conflicting statements. Both top roles manage operational Heads. Verified active Lab core members can open or close the Lab. Recorded closure automatically ends active visits. The checkout reminder runs only while the web app is open. Explicit Publish controls public profile access. Payment follows completion, and a disputed increase stays blocked until Operations resolves it and obtains consent where required.

The MEC pilot targets 16 December 2026, six weeks after Task 1 started on 4 November; scope review is 25 November. GitHub linking, then the public heatmap, then optional portfolio steps are the first schedule cut. GitHub and profile publication have independent controls; if publication privacy/takedown acceptance fails, disable public profile and QR while preserving drafts and allowing the verified account/Lab path to continue.

The profile is not published by onboarding completion. Members preview the public allowlist and explicitly choose Publish. QR codes contain only an opaque, rate-limited URL; public reads are uncached and withdrawal/deletion/takedown must stop URL resolution. Provider avatar or initials are the pilot image source; custom uploads remain deferred until storage, validation and deletion are proven.

Lab opening/check-in/closure share server-authoritative serialized state. Only a verified active Lab core member can open or close; a different core member may close. Check-in is rejected while closed, only one active visit per member is allowed, and recorded closure checks out active visits idempotently at the exact closure timestamp. The in-app reminder operates only while the web app is open; closing the browser stops reminders, while recorded Lab closure still ends the visit. A reconnect reloads server state and does not fabricate success.

The validation-only STAFF-01A candidate now uses separate assignment/history tables and a database-enforced maximum of two active Machine Heads per machine scope. Focused PostgreSQL 16.1 capacity, approval, revocation and rollback checks passed, and the revised candidate passed Grow synthetic shared-profile SQL on PostgreSQL 17.11. The faithful deployed-schema rehearsal and live Next.js/Flutter calls remain unverified. Independent review found that Student Ambassador appointment/revocation and Lab-core roster changes have no candidate-level audit history; connect them to an audited trusted roster process or add a reviewed append-only audit path before activation. Keep staff actions disabled until that roster dependency, current candidate review and shared-client authorization gates pass.

For event publishing, preserve Event Head attendee-visibility intent only when the published/read projection enforces it. If the shared event schema lacks a safe persisted field or authorized read path, fail closed to the approved fixed default and do not expose an ignored setting. Event RSVP, capacity, waitlists and attendee lists remain gated until their own contract and acceptance tests pass.
