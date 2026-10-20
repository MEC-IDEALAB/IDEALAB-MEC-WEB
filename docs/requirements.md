# IDEALAB MEC web requirements

Planning baseline: 20 October 2026. This records confirmed direction and release criteria; it does not claim the website, backend workflows or deployment is complete.

## Confirmed direction and scope

Build the website first using Next.js and TypeScript: a public curated homepage plus a responsive signed-in application, followed by a mobile app informed by the validated experience. Individual project/event records require sign-in. Use the existing backend and accounts. Website UI cannot be automatically treated as a completed native mobile application. Brand: **IDEALAB MEC**. Preserve and polish the existing bright ink-and-paper neo-brutalist identity. Use Vercel hosting and a private `IDEALAB-MEC-WEB` repository. The user created and confirmed `MEC-IDEALAB` after `IDEALAB-MEC` was unavailable. The coordinator verified administrator access, created the private [MEC-IDEALAB/IDEALAB-MEC-WEB repository](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB), and updated organization profile metadata. Native API setup completed successfully: the private [organization project](https://github.com/orgs/MEC-IDEALAB/projects/1) is linked to the repository, all 13 issues are in the project, and four milestones were created. See [setup result](github-setup.json) and the [delivery tracker](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/1). No application push, passing hosted CI or deployment is established.

The owner selected “Continue UI and GitHub setup first.” Shared-account activation is disabled by default with `ENABLE_MEMBER_PLATFORM=false`, independently of whether public backend keys exist. The current frontend foundation phase covers public UI, sample drafts and access-denial states; live identity, permissions and operational journeys remain gated.

The documented V1 is the product destination. Delivery is incremental: a working foundation does not establish production readiness for every module. Temporary sample catalog data is authorized for design/demo use only, visibly labeled **Demo — not verified stock or prices**, isolated from operational data and unable to imply availability or enable real bookings/payments. This exception does not authorize fictional requests, prices presented as actual charges, queue estimates, testimonials, achievements or operational success states.

| ID | Requirement | Release acceptance |
| --- | --- | --- |
| WEB-001 | Curated public introduction, purpose, participation and clear account entry | Accurate editorial content; individual project/event records and details require sign-in. |
| WEB-002 | Shared account signup, verification, sign-in, recovery and onboarding | Existing account works across platforms; verified identity and affiliation remain distinct; no new duplicate identity store. |
| WEB-003 | Home / Lab / Profile anchors with contextual module links | Stable navigation, direct links and predictable Back; Home shows real next actions. |
| WEB-004 | Minimum account profile | Required name, optional phone and college roll; private fields never inherit public visibility. Rich profile gated by approved field matrix. |
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

The current local foundation includes the public homepage, existing-account email/password sign-in source, protected member pages with honest unavailable states, and an account-scoped browser request draft. Member activation remains disabled by default; this does not establish available live sign-in. Source includes `src/app/page.tsx`, `src/app/auth/actions.ts`, `src/app/app/layout.tsx` and `src/features/requests/request-draft.tsx`. The draft uses account-keyed browser storage and explicitly does not submit, notify heads or reserve time. This is implementation/source evidence, not verified live authentication or backend operation. An opt-in `/design/request` page renders the same draft composer with separate sample storage when `ENABLE_DESIGN_PREVIEW=true`; otherwise it returns not found. This supports real local browser design QA without opening `/app` or proving member authorization. Latest coordinator-verified lint, typecheck and build passed; dependency audit reported zero vulnerabilities. Real browser acceptance failed while waiting for the lazy-loaded MEC logo; investigation and rerun are pending. Independent current-source review found no blocking defect and requested configuration-boundary fixture tests plus preview-disabled 404 coverage; those tests are being added, with no pass recorded yet. Operational acceptance remains outstanding. [Delivery plan](delivery-plan.md) requires current-revision evidence before status changes.

All remaining full-V1 operational modules are planned or gated, not implemented by this foundation. Signup/recovery/onboarding completeness and real operational writes are not established. Existing Flutter features and historical SQL are migration inputs, not proof of production web readiness. Preserve unrelated Flutter edits and existing accounts/data.

## Decisions still needed

1. Exact selectable V1 service categories, machine questions and collaborator discovery/privacy. Machine/Operations routing is settled.
2. Time lifecycle details: rescheduling/cancellation effects, capacity source and conflicts. Preferred-time semantics, explicit requester acceptance of changed time, keeping declined proposals open for another proposal, and no automatic expiry are settled.
3. Authoritative machine/room-specific head roster, detailed allowed actions, handover mechanics/in-flight transaction effects and audit readers/retention. Only Super Admin assigns/revokes scoped heads and manages active-work handover/reassignment; no automatic reassignment rule is decided. Deputies/escalation remain deferred until pilot readiness.
4. Approved logo/photos/public contacts/hours, policy texts and rich-profile field matrix.
5. Deferred Operations inputs: verified catalog/stock/prices, quote/charge/deposit/balance/cancellation/refund/fine rules. Do not reintroduce historical 50/50 defaults.
6. Mandatory first-release report set and storage/upload contract.

No chat, payment gateway, AI estimation/validation, IoT, marketplace, advanced analytics or multi-institution UI is introduced by this plan. Knowledge base remains future scope.

## Canonical decisions and provenance

This standalone repository records current web scope and accepted owner decisions here, route/flow/wireframe requirements in [experience](experience.md), backend boundaries in [architecture](architecture.md), and delivery gates in [delivery plan](delivery-plan.md). Those local documents are the canonical website decision records; future backend implementation still requires verified contracts and approved migration evidence.

Historical planning inputs live in the parent Grow workspace at `docs/01_Product/PRODUCT_DECISION_DELTA_2026-09-17.md`, `docs/01_Product/00_PRODUCT_CHARTER.md`, `docs/00_Project/CURRENT_PROJECT_BASELINE.md`, `docs/02_Product/WORK_REQUEST_CONTRACT_DELTA.md`, `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md`, `docs/03_Database/ROLE_AND_POSITION_CONTRACT.md` and `docs/03_Database/STORAGE_ACCESS_CONTRACT.md`. These are provenance paths, not standalone repository dependencies or proof of deployed behavior.
