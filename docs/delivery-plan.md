# IDEALAB MEC delivery plan

Current checkpoint: [account delivery status](account-readiness.md). Older account
implementation-status paragraphs below are historical; release criteria and the
remaining full-V1 scope still apply.

## Latest delivery state — 31 October 2026

Website foundation PR #19 merged into `main` at
`f0d8ab0ad3084f6cc4e8727d9e07686f9105faf0`. Website CI, its required gate, and
Documentation CI passed on both the exact PR head and the merged commit. On
the exact PR head, Node 24.19.0 checks passed: lint, typecheck, 128 boundary
tests, dependency audit, optimized acceptance build, Chromium acceptance, both
browser-journal checks, and documentation validation (49 files / 278 links).
The 31 October docs recheck also passed (49 files / 282 links). See the [current
GitHub coordination record](quality/github-coordination-2026-10-29.md).

The merged PWA scope is the web manifest and app icons; no hosted installation
or APK has been verified. Vercel project creation for this repository returned
403, the local CLI has no credentials, and Render lists only the unrelated
LINKER service. Production member authentication remains source-disabled while
shared Grow RLS/Flutter compatibility, real auth journeys and operational
workflows remain release blockers. This foundation is not a production release.

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

Historical repository snapshot: 21 October 2026. At that time the private [IDEALAB-MEC-WEB repository](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB) and linked [organization project](https://github.com/orgs/MEC-IDEALAB/projects/1) contained 14 issues, PR #14, and four milestones. Screenshot-inspired homepage/auth polish and responsive student previews were pushed as application source commit `3ca9b63d156d257b4b494099d66e7e7dd1a9ef09`; delivery-status corrections followed in documentation commit `dec0c7c0d736f2b85f31b4edcbc11eb2620e9985` on PR #14. These historical checks do not describe the current source or release state; see the 31 October update above.

GitHub branch-rule inspection returned HTTP 403 during the earlier private-repository check. CI passes were not server-enforced merge protection. PR #14 has since merged; continue using the manual current-head/check/review gate unless an eligible plan enables branch protection.

Historical product direction: the owner selected “Continue UI and GitHub setup first.” That website foundation has since merged through PR #19. Public UI, local sample drafts and access-denial states are implemented, but `ENABLE_MEMBER_PLATFORM=false` and the source guard still block production account activation. Real member/staff/backend acceptance and remaining operational features are required before full-V1 release.

The verified-email member-gate follow-up is on application commit
`d2a310edf80d176bd10768e04dd31cde030b389e`. Node 24.19.0 lint/typecheck,
26 boundary tests, dependency audit, production build, Chromium acceptance and
documentation check passed locally. Exact-head [Website CI and required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39510291937)
and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39510291938)
passed. At that historical 22 October checkpoint, PR #14 was draft and had no
formal GitHub review. PR #19 has since merged; the member flag remains off while
full account/backend and V1 journeys remain incomplete.

## Current priority and coordinated status

The owner has since selected MEC-only student admission in both clients, based
on `MDL`/`LMDL` registration numbers, with an explicit self-declaration and one
unique claim. The pilot does not check a college roster or independently verify
the first claimant. Comparison ignoring case and repeated/surrounding spaces,
+country-code phone input, a coordinated Flutter update, and limited uniqueness
inference with generic errors/save limits are settled. Full registration formats
and technical attestation/claim enforcement remain open. See [the pilot contract](mec-pilot-admission.md).
The authorized Free validation project contains the isolated private claim-storage
and deferred pending-claim guard described in [backend readiness](backend-readiness.md).
Their scoped database tests passed; real account and Data API journeys remain unverified.

The public-navigation follow-up committed at `a488b3a711afcbb709849fcb5840dfb730c77ee4` adds current-page indicators, native
no-JavaScript navigation and keyboard/pointer dismissal with responsive focus
restoration. Node 24 lint/typecheck, 28 boundary tests, isolated production build
and full Chromium acceptance passed locally, including the reproduced resize
event-order race. Independent source review found no remaining concrete defect.
See [the navigation audit](ui-audit.md#public-navigation-follow-up--21-october-2026)
for scope and evidence. This navigation work is included in merged PR #19; see
the 31 October release update above for current hosted checks.

Current owner direction uses notebook cross-grid paper and the original yellow `#ffe029`/pink `#ff3994` anchors, coordinated blue `#a8c6ff`, purple `#c4b5f5`, red `#f39488` and green `#a6d9b5`, with cobalt actions and existing apricot/cream/jet-black. See [visual standard](design-system.md). Homepage content now includes Epilog, Snapmaker and Ultimaker facility photos, three broad activity themes and AICTE/CogniCor institutional context. The 11-entry `/lab` directory is published institutional content rather than live inventory; `/explore` uses officially supported March 2022 selection history. See [content provenance](content-sources.md) for verification limits. Individual event records remain signed-in only. Original local SVG artwork and HomeMotion retain progressive enhancement and reduced-motion behavior.

The maker-spirit eyebrow, hero service-availability footnote and first-card boilerplate were removed at the owner’s request. Factual unavailable messages remain on account/service routes. Sign-in retains its semantic form and password show/hide control, disabled while account activation is unavailable. The auth story panels use the current shared palette and theme controls. `/sign-up` shows a clearly labeled, disabled email/password registration preview and Google control, with no contact CTA or account-creation writes. The loading skeleton remains scoped to sign-in to preserve ordinary not-found HTTP status behavior.

MagicPath project `463330845164449792` was updated with hierarchy/wireframe annotations and earlier accent panels. It is a planning reference, not the high-fidelity source of the implemented interface. No Figma/Penpot/Canva or generated-media artifact is claimed.

Notebook/content validation passed (session 11250, exit 0): lint, production build and real browser coverage of five homepage widths and all three facility photos; the full 11-entry `/lab` directory at 320/768/1440 px in both themes; `/explore` history and public event-theme boundaries; prior contrast, motion, no-JavaScript, draft and guard journeys. Jet-black dark-mode validation subsequently passed in session 7536, including the body and neutral section strip. Backend availability, full V1 and deployment remain unverified.

The homepage, two-state Light/Dark toggle and requested neo-brutalist identity are implemented. Existing request-hub work is preserved. Before the first explicit choice, the theme follows the OS; a user choice is initialized before paint, persisted across tabs, and falls back to in-memory state when storage is blocked. Semantic theme colors retain 2 px borders, hard shadows, readable availability text and literal artwork plates. The opt-in onboarding preview shows six profile values (five editable, Year 1–8 and read-only canonical Model Engineering College) plus a separate MEC student self-declaration. Local feedback checks phone and sample `MDL`/`LMDL` shapes only; it checks neither phone reachability, number availability nor the declaration against college records and persists nothing. The opt-in student workspace preview now provides Home, Lab, Profile, Projects, Events, Requests, Notifications and Visits layouts with no live records or actions. Production identity, persistence, claim enforcement and operational workflows remain gated. The screenshot-inspired source and its exact-head local/hosted checks are recorded above; earlier preview results below are historical.

| Owner | Dependency | State | Evidence / review | Next action |
| --- | --- | --- | --- | --- |
| Main database test tooling; independent security review | Existing native PostgreSQL binaries; no shared credentials or schema decisions | Isolated native runtime smoke check passes locally | Node 24.19.0/PostgreSQL 16.1: verified private Windows directory, fresh loopback identity, wrong-password denial, real temporary transaction/rollback and stopped/removed cluster; out-of-scope ACL request denied without changing root ACL | Use [runtime preparation](database-validation.md) only for native SQL exploration. Approved target-version/collation migration, real Supabase/Auth/Data API and both-client acceptance remain required. |
| Main navigation implementation/QA; independent reviewer | Existing public routes and approved visual standard | Navigation enhancement locally verified and included in merged PR #19 | Escape/focus restoration, ordinary Tab exit, outside pointer, route/current-page selection, 800/801 px focus and no-JavaScript journeys passed in real Chromium; local source review passed | Keep current-head CI green; complete live member and release acceptance after the shared backend gates. |
| Main implementation | Confirmed onboarding contract, visual system and request-draft requirements | Public foundation merged in PR #19; real signup, account onboarding and live request submission remain unimplemented | PR #19 exact-head local/hosted verification is recorded in the 31 October update above. Independent source/security review informed the manual merge gate; the GitHub reviews API has no submitted review record. | Continue backend/auth and operational journeys after shared schema/security and Flutter compatibility gates are resolved. |
| Main QA | Website and MEC-preview implementation | Local UI evidence covers the supplied visual references and responsive browser states; live identities and operational database behavior remain unverified | Chromium covers public and auth pages in light/dark, responsive widths, keyboard/reduced motion, no-scroll auth at 320×568, assets, protected-route denial, non-persistent previews, recovery callback rejection and security headers. The independent visual review found no concrete defect. | Maintain current-source validation, require independent review for future application PRs, and resolve backend gates before activation. |
| Request workspace | Existing member-local draft contract plus isolated design preview | Local draft composer and hub integrated; authenticated submission and history remain unimplemented | Current 28-test boundary suite and production-browser acceptance pass; Supabase user/request records are not written. | Implement real submission only after schema, permissions and workflow transitions are reviewed. |
| Member access gate | Server-verified Supabase identity | Email confirmation is checked before the profile query; onboarding completion remains gated on the reviewed six-field schema | Independent security review passed. Node 24.19.0 lint/typecheck, 28 boundary tests, zero-findings dependency audit, production build, Chromium acceptance and docs validation (15 files/72 links) passed; no live member identity was used. | Keep the feature flag off until the canonical six-field profile contract, provisioning, RLS and Flutter compatibility are implemented and tested. |
| Password recovery | Same shared account identity | Responsive request/reset forms and fixed-origin PKCE callback implemented behind `ENABLE_MEMBER_PLATFORM`; no email or password-change request sent | Current source passed the isolated Chromium journey and exact-head Website CI; the configured backend uses a reserved `.invalid` URL and forms were never submitted. No live email or password-change request was sent. | Verify callback allowlist, delivery, PKCE exchange, password update and session behavior using an approved safe account environment; keep member flag off until shared schema/security gates pass. |
| Design | MagicPath canvas + repository wireframes | Updated artifact | Private project 463330845164449792 now contains homepage desktop/mobile, student desktop/mobile, the student V1 page map, MEC onboarding desktop/mobile, and scoped staff workspace desktop/mobile. Sign-in/join wireframe is in `experience.md`; MagicPath quota blocked a separate frame. | Keep route maps and handoff aligned with real previews; no Figma/Penpot/Canva artifact is claimed. |
| Backend | Connected Supabase project and current Grow contract | Read-only evidence available; activation blocked | `grow-idealab` now reports `INACTIVE`; its last successful schema inventory (23 October) found two migrations and unsafe profile permissions, while a fresh migration-list request timed out. `idealab-mec-validation` (`gvvqlfachzbufstzoiwi`) is `ACTIVE_HEALTHY` on PostgreSQL 17.11 with 19 recorded migrations, including Issue #18 candidates. Those local SQL files do not match stored migration text byte-for-byte. See the [validation migration audit](quality/validation-migration-ledger-audit-2026-10-31.md) and [backend readiness](backend-readiness.md). | Keep Grow paused. Establish an isolated CLI baseline and target-specific dry-run for validation; reconcile shared schema/RLS and cross-client compatibility before any production migration or account activation. |
| Shared profile architecture | Six-field privacy contract, canonical MEC pilot and current metadata | [Proposal](shared-profile-contract-proposal.md) revised for owner answers; technical and implementation review remain | Case/space comparison, +country-code input, coordinated Flutter update, generic duplicate errors/save limits, and self-declared MEC pilot admission are settled. No migration/profile API/persistence is implemented. | Specify attestation and unique-claim transitions, registration formats, validation and enforceable save limits; review/test the coordinated SQL/client slice in the authorized validation project. |
| Release | Private org repository and Vercel | Gated | PR #19 is merged; exact-head and main-commit Website/Documentation checks passed. The preview-only GitHub Actions workflow is on `main`, but Vercel project creation returned 403, no project/secrets are configured, and no hosted deployment is verified. Branch-rule inspection returned 403 on the current private-repo GitHub plan. | Obtain institution-approved Vercel project access and plan eligibility; then configure the preview workflow secrets, dispatch from `main`, and verify the exact hosted commit. Keep member access disabled until auth, shared Grow permissions and operational acceptance pass. |

## MEC preview and native runtime verification — 21 October 2026

The current MEC preview source passed Node 24.19.0 lint, typecheck, all 28
boundary tests, dependency audit (zero vulnerabilities), the isolated production
build and full Chromium acceptance locally. New browser coverage verifies the
fixed MEC institution, five editable missing-field errors, country-code phone
feedback, MDL/LMDL prefix feedback without assumed suffix lengths, focused
linked errors, memory-only values, no-JavaScript non-submission and responsive
light/dark layouts. Independent read-only review found an unconfirmed suffix
assumption; the corrected source was re-reviewed and the browser suite rerun.
Phone-light and desktop-dark artifacts were visually inspected. See the
[MEC audit](ui-audit.md#mec-pilot-preview--21-october-2026).

The separate native PostgreSQL 16.1 runtime smoke passed on this source with
private scratch permissions, endpoint/data-directory identity, wrong-password
denial, a real temporary transaction/rollback, and verified own-cluster stop
and removal. It does not exercise Supabase Auth, the application schema, RLS,
PostgREST or PostgreSQL 17/collation compatibility and is not a hosted CI job.
The [sanitized runtime result](research/local-pg-runtime-2026-10-21.json) records
that narrower evidence. Member/Google flags stay off, PR #14 stays draft and
full V1/release acceptance remains open.

## Student V1 page-map follow-up — 21 October 2026

The student design slice now covers nine destinations and responsive module
states, with a first-visit OS-dark contrast check on Home and Profile. The
system-dark check preserves `data-theme="system"`, aligns the single theme
toggle with the OS, and verifies near-black surfaces and text contrast. The
independent wireframe review found no remaining P1/P2 student UX, accessibility
or responsive issue. The MagicPath canvas now adds onboarding and staff
desktop/mobile frames; account access remains documented in `experience.md`
because MagicPath's 50-call account quota blocked another frame.

Application source commit `3ca9b63` passed Node 24.19.0 lint, TypeScript, all 28
boundary tests, zero-finding dependency audit, optimized acceptance build,
Chromium acceptance, documentation validation (18 files/112 links) and
`git diff --check`. Chromium includes 320–1440 px widths, tablet card layout,
mobile safe area, explicit light/dark, OS-driven system theme, reduced motion,
auth no-scroll checks at 320×568 and preview data isolation. Exact-head Website
CI and Documentation CI passed on this source. These checks do not establish
successful Auth, live profile reads/writes, staff authorization, database
migration or operational V1 acceptance.
Keep the member feature flag off and PR #14 draft.

## GitHub work tracking

- [Private repository](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB)
- [Private organization project](https://github.com/orgs/MEC-IDEALAB/projects/1), linked to this repository; see the tracker below for active work and acceptance gates
- [V1 delivery tracker and acceptance gates](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/1)
- [Public website and branding](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/2) and [UX flows/wireframes/design system](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/3)
- [CI, PR gates, Vercel delivery and pilot readiness](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/13)

| Issue | Workstream |
| --- | --- |
| [#1](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/1) | V1 delivery tracker and acceptance gates |
| [#2](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/2) | Responsive public website and institutional branding |
| [#3](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/3) | Member and staff UX flows, wireframes and design system |
| [#4](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/4) | Shared schema, migration and RLS reconciliation |
| [#5](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/5) | Shared account signup, browser auth, recovery and onboarding |
| [#6](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/6) | Scoped operational positions and administrative controls |
| [#7](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/7) | Work Request lifecycle and preferred-time negotiation |
| [#8](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/8) | Projects and creator-approved membership |
| [#9](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/9) | Events, capacity, manual payment and cancellation |
| [#10](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/10) | Lab visits, inventory and borrowing |
| [#11](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/11) | Manufacturing tasks, machine queue, runtime and maintenance |
| [#12](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/12) | Quotations, UPI verification, reports, notifications and audit |
| [#13](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/13) | CI, PR gates, Vercel delivery and pilot readiness |

The [setup result](github-setup.json) records the repository, project and issue URLs. Four milestones were created. Creating tracking artifacts does not complete their acceptance criteria or prove CI/CD execution.

Repository settings were verified private, with squash merge as the only enabled merge method and branch deletion after merge enabled. Branch-protection configuration returned HTTP 403: “Upgrade to GitHub Pro or make this repository public to enable this feature.” The repository remains private and no paid-plan change was made. Required-check/review enforcement through branch protection is unavailable on the current plan; manual review expectations do not substitute for enforced protection.

The documentation bootstrap push succeeded on `main` at `4c842cb8f394292a59b8ef2c43dd9b995b379afb`. [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39399627438) was verified successful on that exact SHA. This validates the documentation workflow only. The application source baseline `c9a6a8e5ed104302500f50b44aa2871fce5f6ccc` was subsequently pushed successfully and [draft PR #14](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/pull/14) opened. [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39400658809) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39400658733) both passed on that exact baseline. These hosted results cover the frontend foundation, not full V1 or live backend acceptance.

Earlier hosted results predate the final visual-standard and request-draft passes. The current request-draft application commit and its later documentation-only PR revision are recorded with exact local and hosted evidence in the [current verification entry](delivery-plan.md#verification-and-evidence-checklist).

Read-only Supabase access is available for `grow-idealab` (`huftzhfqnnslvnfzvbex`), reported `ACTIVE_HEALTHY` on 20 October 2026. Current metadata confirms `public.users` has no institution, department or current study-year columns, and `college_roll` has a global unique constraint; this is not the normalized MEC claim/ownership contract. The prior institution-scoped multi-institution proposal is historical. RLS allows broad authenticated reads of `public.users`, own-row updates are not column-restricted, broad grants include sensitive privileges, no Auth profile-provisioning trigger exists, and the live migration ledger materially differs from the checked-in Grow migrations. Security advisors also flag mutable search paths, public execution of `get_user_role`, disabled leaked-password protection and other performance/configuration items. No member rows were queried, no exploit attempted and no SQL/permission/data mutation performed. A previous dashboard read reported email autoconfirm enabled; the current connected tool cannot re-read Auth provider settings, so that setting remains unverified. Do not activate accounts or apply DDL until the live contract is reconciled with mobile, a safe environment is available, and a specific migration and rollback receive review and authorization.

## Deployment prerequisite

[Deployment preparation](deployment.md) records the intended Vercel settings and release checks. The private organization-owned repository cannot use Vercel Hobby’s Git integration, and the Hobby plan is limited to personal, non-commercial projects ([official plan limits](https://vercel.com/docs/limits#connecting-a-project-to-a-git-repository), [Hobby plan terms](https://vercel.com/docs/plans/hobby)). A manual GitHub Actions/Vercel CLI preview path is prepared with a Pro/Enterprise declaration guard; it does not override account eligibility. Preserve repository privacy and do not start a paid plan or trial as a setup side effect. Vercel project/secrets and an actual rendered hosted preview remain unverified.

## Delivery sequence and gates

| Stage | Deliverable | Exit criteria |
| --- | --- | --- |
| 1. Product and design foundation | Public shell, responsive app shell, route/state designs, shared tokens | Requirements traceability, accurate content, keyboard/narrow-screen review and no fictional operational data. |
| 2. Shared identity | Signup/verification/sign-in/recovery, session management, minimum profile | Real existing accounts work; confirmation/recovery/link edge cases, route protection and private responses tested on a safe environment. |
| 3. Read-only member surfaces | Real approved projects/events/notifications/profile/catalog reads | Individual records require sign-in; field visibility, ownership, failure states and cross-account denial verified. Demo catalog visibly labeled and isolated. |
| 4. Operational contract foundation | Roles/positions, request lifecycle, scheduling, storage/payment contracts | Live schema reconciliation, reviewed migrations/rollback, approved matrix and meaningful negative/concurrency tests on a faithful non-production baseline. |
| 5. Request vertical slice | Real Machine/Operations submission, scoped head review, edits, confirmed time, cancellation/history | Machine/room assignment enforced; only Super Admin assigns/revokes heads and manages active-work handover; requester accepts changed time; declined proposals stay open without automatic expiry; browser-to-data journey; claim/cancel race; cross-user/role denial; truthful receipts. |
| 6. Remaining documented V1 | Manufacturing/queue, inventory/borrowing, events/payments, reports/admin | Each requirement passes its real end-to-end journey, financial/capacity rules and audit checks. Deferred inputs block only dependent behavior. |
| 7. Pilot and release | Reviewed release on Vercel with operational ownership | Current revision gates, hosted evidence, accessibility, support, backup/restore and pilot acceptance; explicit production authorization where required. |

Finish one real vertical slice at a time. A navigable unavailable module is a transparent interim state, not completion of that module. No frontend scaffold, mock adapter, static screenshot, passing build or historical Flutter test proves production workflow correctness.

## Verification and evidence checklist

**Historical foundation evidence:** these completed checks precede the new request-workspace integration and do not establish its QA. Inspect package scripts before running. The manifest declares `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:acceptance`, `npm run dev` and `npm run start`. Script presence alone does not prove success. Coordinator-verified lint, TypeScript, six boundary tests, the seven-document/23-link check and dependency audit passed (session 54574; zero reported vulnerabilities). After a helper-only fix, final ESLint passed (session 40511). Direct Node 24 `next build` passed (session 20288), followed by passing real browser acceptance against that Node 24 production build (session 24144): five responsive widths, assets, menu, disabled sign-in, protected-route denial, sample draft save/restore/delete, 404 handling including preview-disabled verification on a real second server, security headers and reduced motion passed. Six native configuration tests passed (session 37853), using fixtures without real service requests. Independent current-source review found no blocking defect; its configuration-boundary and preview-disabled coverage requests are now backed by those results. The latest coordinator documentation check passed for eight files and 26 local links (session 38095), including [deployment preparation](deployment.md). Record command, current revision/worktree state, result and material output. Check diff/format as applicable. Independently review implementation and security boundaries, then resolve findings.

**Browser acceptance:** verify rendered public homepage, account entry, navigation/deep links/Back, authenticated route behavior, responsive layouts at the experience-plan widths, keyboard operation, zoom/text enlargement, reduced motion, loading/empty/error/offline/denied states and real retry outcomes. Check all visible controls and links; no dead controls or fabricated success. Record exact URLs/environment, evidence artifacts and limitations.

**Identity:** remains gated for backend activation. The configuration fixture checks for `ENABLE_MEMBER_PLATFORM=false` with public keys present passed without real service requests; preview-disabled 404 passed on a separate real local server. Live shared identity remains unverified. Before backend activation accept the shared existing account; signup/confirm/explicit sign-in; used/expired/malformed links; wrong credentials; reset/recovery; logout; incomplete onboarding; unauthorized destinations; session refresh and multi-tab behavior. Configure safe callback allowlists without silently changing production providers. No credentials/tokens in source, screenshots or logs.

**Current request-draft slice — application commit `a3b003302be968e523368e18d8feeb9377fcba69`, previous docs-only PR head `6ae37b9575386d0a1564891b278aebec5eb412bd`:** Node 24.19.0 `npm run lint`, `npm run typecheck`, `npm run test:boundaries` (19 passed), `npm run build`, `npm audit --audit-level=high`, `node scripts/check-docs.mjs` and `npm run test:acceptance` passed locally for the application change. Hosted [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39497869820) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39497869696) passed on `a3b0033`. The previous docs-only head `6ae37b9` also passed hosted [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39498551273) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39498550941), including the required gate. Production-browser coverage includes account/sample isolation, legacy-v1 restoration, corrupt and denied storage, quota-safe saves, save timestamp, validated HTTP(S) links, unsafe-protocol rejection with focused errors, return/continue/delete, responsive layouts, preview-disabled 404 and explicitly unavailable submitted history. The browser journey runs with Supabase configuration empty and no authenticated session; live profile persistence, account auth, scoped permissions and operational submission remain unverified.

**Operational E2E:** member submits a real request, authorized head reviews, member accepts material edits, head confirms preferred time, task progresses, user sees accountable history; cancel before/after claim and race conditions; project join request/creator approval; free/paid event capacity under concurrent verification; borrowing return/Operations verification; report authorization/audit. Follow each journey through browser, server, data and returned UI. Missing backend gates mean skipped/blocked, never passed.

Additionally verify changed proposed time is not treated as agreed until explicit requester acceptance, declining keeps the request open for another proposal, and no automatic expiry occurs; verify only Super Admin can assign/revoke scoped heads and manage active-work handover/reassignment. Detailed action permissions, automatic reassignment rules, handover mechanics and in-flight transaction effects remain unresolved and must be specified before dependent implementation. Machine/room-specific assignments must reject out-of-scope head actions; anonymous visitors cannot read individual project/event records; demo catalog labels remain obvious and no demo stock/prices flow into operational submissions, billing or reservation claims. Current browser-only drafts must remain account-scoped and explicitly unsubmitted. The `/design/request` preview is enabled only by `ENABLE_DESIGN_PREVIEW=true`; verify its disabled state returns not found, its sample draft is separate, and `/app` remains protected. This local preview is not evidence of authenticated backend acceptance.

**Security:** verify real deployed grants/RLS and ownership, cross-user reads/writes, client-supplied identity/role/position rejection, restricted staff scope, payment verification authority, private profile fields/media, anonymous publication, safe redirects and cache boundaries. Keep service-role/secret keys out of browser/public environment. File uploads stay disabled until storage path/MIME/size/access/retention policy is approved and tested.

**Shared backend:** preserve existing identities and mobile compatibility; compare schema/functions/grants/policies/triggers/storage/migration ledger with repository contracts; approve migration and rollback separately; use faithful non-production tests. Historical SQL is not deployment evidence. No production migration is authorized by these documents.

**Push/release:** user guidance requires actual current-source local checks and applicable end-to-end acceptance before application/feature pushes. Missing/failed/skipped required tests block push. After an authorized push inspect actual hosted checks on the relevant revision; required verification cannot pass by absent/neutral/skipped execution. Before merge require current head, required checks and independent review. Before production release verify provider/callback/domain configuration, recovery, backup/restore, support ownership and rollout/rollback. Repo/Vercel setup does not itself authorize unrelated remote settings changes.

## Reporting rules

**Historical password-recovery slice — application/test commit `4141923468daa1d790645157497923f3e2664c0d`:** local Node 24.19.0 `npm run lint`, `npm run typecheck`, `npm run test:boundaries` (28 passed), `npm run build`, `npm run build:acceptance`, `npm run test:acceptance`, `npm audit --audit-level=high` (zero vulnerabilities), docs validation (15 files/72 links), JSON parsing and `git diff --check` passed. Chromium checked gated and configured fixture servers, generic non-enumerating status, PKCE callback rejection, fixed-origin redirect, no query reflection, noindex pages, password visibility controls, responsive widths and light/dark themes. The configured backend URL is `.invalid`; forms were not submitted and no Auth requests were made. Independent read-only review found no confirmed recovery-code defect; it did not test live Auth. Hosted [Website CI and required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39540087926) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39540087887) passed on that historical commit. The reset action accepts any server-verified authenticated session and signs out the current local session only; desired recovery-only/session invalidation behavior and Supabase password/session settings need verification with an approved test identity. Live email delivery, PKCE exchange, password update, data persistence, scoped permissions and the remaining V1 workflows are unverified. Do not treat this slice as a release or enable the member flag.

The first hosted acceptance attempt on `6f9d95f4b4490604b1761ba7aab0076a4b2fb117` failed because the test started a recovery server with runtime `NEXT_PUBLIC_` values, while Next.js had compiled empty values into the build. The failure was a test-fixture setup mismatch, not a route defect. `scripts/build-acceptance.mjs` now builds with a reserved `.invalid` URL and dummy publishable key, keeps `ENABLE_MEMBER_PLATFORM=false` for the public acceptance process, and never submits the test forms. The corrected build-and-browser journey passed locally and in exact-head Website CI on `4141923468daa1d790645157497923f3e2664c0d` (run `39540087926`).

Record checks as **passed**, **failed**, **skipped**, **blocked**, or **unverified**, scoped to revision and environment. Historical notebook/content validation passed in session 11250; the jet-black dark-mode gate passed in 7536. After correcting an error-summary focus race found by hosted CI on `c56665b`, code revision `ca08645` passed Node 24 lint, TypeScript, 16 boundary tests, optimized production build, real Playwright acceptance and the Markdown/link checker locally. Hosted [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39491072209) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39491072246) passed on that exact source SHA. Browser evidence includes Year 1–8 choices, six required field validation and focus movement, no storage/network on preview activation, no-JavaScript non-submission, 320 px light and 1440 px jet-black dark screenshots, and the disabled-feature 404. Live onboarding/auth, full V1 and deployment remain unverified.

Design evidence: private [MagicPath project](https://www.magicpath.ai/files/463330845164449792) holds the homepage and student workspace desktop/mobile wireframes. No Figma, Penpot, Canva or generated-media artifact is established. MobileMockup was inspected but its image-only mobile-app concept workflow did not fit this website task. Firebase was not selected; no additional backend stack was introduced.

The local request composer and hub now share the legacy-v1-compatible account-specific draft parser/writer, with validated optional links and no submission claim. Opt-in staff and student workspace previews show role-specific or member pages without real records, identities or actions. Supabase schema and security metadata are readable; the live six-field profile/privacy mismatch and auth/compatibility gates remain in [the UI/auth audit](ui-audit.md). The error-summary focus assertion failure on `c56665b` was fixed in `ca08645`; later request-draft code passed hosted Website and Documentation CI at `a3b0033`, and the docs-only follow-up passed again at `6ae37b9`. Confirmed scheduling, scoped-head, Year 1–8, canonical MEC pilot admission in both clients, self-declaration, case/space comparison, +country-code phone entry, coordinated Flutter rollout, self-edit and private-profile defaults are recorded; technical enforcement and full registration-format coverage remain open. Full V1, real member/staff acceptance, backend activation, merge and Vercel deployment remain gated.

The 21 October 2026 staff-preview source passed Node 24.19.0 lint and typecheck, all 26 boundary tests, `npm audit --audit-level=high` (zero advisories), optimized production build, the production-browser acceptance, the Markdown/link checker (15 files/70 links), and `git diff --check`. Chromium verified the workspace preview at 320, 375, 768, 1024 and 1440 px, light/dark contrast, reduced motion, empty/no-action behavior, no browser storage writes and preview-disabled 404. These are local UI/security-boundary checks only; live member/staff authentication, permissions, persistence and business workflows remain unverified.

## Source boundaries

Use the local [requirements](requirements.md), [experience](experience.md) and [architecture](architecture.md) as canonical web scope, UX and integration decision records. They preserve accepted decisions without requiring files outside the standalone repository.

Historical provenance in the parent Grow workspace includes `docs/00_Project/CURRENT_PROJECT_BASELINE.md`, `docs/03_Database/ROLE_AND_POSITION_CONTRACT.md`, `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md`, `docs/03_Database/BACKEND_SECURITY_BASELINE.md` and `docs/03_Database/AUTH_PROVIDER_RELEASE_CHECKLIST.md`. These paths are contextual references, not working standalone links or pinned deployment evidence. Backend approval must reference inspected contracts and actual current environment evidence.

## Branded loading state

The first visit in a tab shows a black motion-graphics canvas with drawn
prototype geometry, three-beat wordmark reveals, staggered solid/outline
IDEALAB rows and a narrow indeterminate rail. Font and priority-image readiness
are bounded by 400 ms; the full motion scene stays visible for at least 1.55
seconds from its first rendered animation frame and hands off over 320 ms.
Reduced-motion users skip the animation immediately.
Separate hydrated and no-hydration watchdogs release content, blocked storage
skips the overlay, and repeat reloads/client navigation do not repeat it.
Current desktop/mobile captures and browser timing checks are in the [loader
motion record](quality/loader-visual-timing-2026-11-01.md); earlier captures remain
under `artifacts/acceptance/`.

## User poster-reference collage follow-up — 21 October 2026

The homepage hero now includes a small printed-object collage with the local
Snapmaker A350T facility photo and a factual caption, layered over the original
maker illustration. Existing editorial activity rows continue to carry the
event-list inspiration without implying a live schedule. On this local source
snapshot, Node 24.19.0 ESLint and TypeScript passed, all 28 boundary tests
passed, the optimized production build passed, the full local Chromium
acceptance passed, documentation validation passed, and `git diff --check`
passed. Desktop and 320 px production captures were visually inspected. The
independent review found no concrete collage issue. Live authentication,
profiles, database persistence, staff authorization and V1 operational
workflows remain unverified; this change does not clear the release gate.

## Shared workspace navigation follow-up — 21 October 2026

Historical checkpoint, superseded by the 22 October top-navigation change:
the member route and no-data student preview used a collapsible desktop rail
and a four-anchor mobile bar. Current navigation is Home / Lab / Profile at
the top, with contextual links; see [experience](experience.md).
Protected Visits, Borrowing and Settings routes communicate that their real
account data and operations are unavailable. The supplied editorial poster and
event-list references inform the homepage collage and factual activity rows.

For the current local source, Node 24.19.0 lint, TypeScript, all 28 boundary
tests, documentation validation (18 files/113 links), `git diff --check`, the
optimized production build and complete local Chromium acceptance passed.
Rendered homepage and mobile workspace captures were inspected, and an
independent source reviewer confirmed the Settings layout, browser-Back menu
closure, Machine/Operations request copy and mobile screenshot. Authenticated
member journeys, live Supabase data, authorization and all operational V1
workflows remain unverified. Keep activation and release gates closed.

## Local acceptance follow-up — 28 October 2026

The current uncommitted website source passed the optimized acceptance build
and Chromium acceptance suite. Coverage includes public journeys at five
widths in light and dark themes, auth layouts, keyboard and reduced-motion
behavior, gated previews, request drafts, the disabled recovery callback and
security headers. This fixture-based run does not verify real account creation,
email delivery, sign-in, recovery, authenticated drafts, database permissions
or operational backend workflows. It does not establish production readiness.
