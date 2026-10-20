# IDEALAB MEC delivery plan

Planning baseline: 20 October 2026. The user created and confirmed `MEC-IDEALAB`. The coordinator verified administrator access, created the private [IDEALAB-MEC-WEB repository](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB), and updated organization profile metadata. Native API setup completed successfully: the private organization project is linked, all 13 issues are in the project, and four milestones were created. Vercel remains the selected hosting target; the frontend baseline was pushed and [draft PR #14](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/pull/14) is open. The previous pushed revision `3ea9fd69d80b802a3ab30dd4f2f14994d02bcec9` passed both [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39459247881) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39459247807). Those hosted results do not cover the unpushed visual-standard pass. Current local homepage/theme and basic request-hub checks passed; new hosted CI remains pending. No merge, deployment or live backend acceptance is established.

The owner selected “Continue UI and GitHub setup first.” The current frontend foundation phase covers public UI, sample drafts and access-denial states. `ENABLE_MEMBER_PLATFORM=false` independently disables shared-account activation even when public keys are present; live member/staff/backend acceptance gates remain required before activation and full-V1 release.

## Current priority and coordinated status

Current owner direction uses notebook cross-grid paper and the original yellow `#ffe029`/pink `#ff3994` anchors, coordinated blue `#a8c6ff`, purple `#c4b5f5`, red `#f39488` and green `#a6d9b5`, with cobalt actions and existing apricot/cream/jet-black. See [visual standard](design-system.md). Homepage content now includes Epilog, Snapmaker and Ultimaker facility photos, three broad activity themes and AICTE/CogniCor institutional context. The 11-entry `/lab` directory is published institutional content rather than live inventory; `/explore` uses officially supported March 2022 selection history. See [content provenance](content-sources.md) for verification limits. Individual event records remain signed-in only. Original local SVG artwork and HomeMotion retain progressive enhancement and reduced-motion behavior.

The maker-spirit eyebrow, hero service-availability footnote and first-card boilerplate were removed at the owner’s request. Factual unavailable messages remain on account/service routes. Sign-in retains its semantic form and password show/hide control, disabled while account activation is unavailable. The auth story panels use the current shared palette and theme controls. `/sign-up` remains information/contact only, with no registration writes or OAuth. The loading skeleton remains scoped to sign-in to preserve ordinary not-found HTTP status behavior.

MagicPath project `463330845164449792` was updated with hierarchy/wireframe annotations and earlier accent panels. It is a planning reference, not the high-fidelity source of the implemented interface. No Figma/Penpot/Canva or generated-media artifact is claimed.

Notebook/content validation passed (session 11250, exit 0): lint, production build and real browser coverage of five homepage widths and all three facility photos; the full 11-entry `/lab` directory at 320/768/1440 px in both themes; `/explore` history and public event-theme boundaries; prior contrast, motion, no-JavaScript, draft and guard journeys. Jet-black dark-mode validation subsequently passed in session 7536, including the body and neutral section strip. Backend availability, full V1 and deployment remain unverified.

The owner’s current priority is correcting the homepage, adding dark mode and restoring the intended neo-brutalist identity before further request-workspace development. Existing request-hub work is preserved. Light, Dark and System themes are implemented locally with pre-paint initialization, OS preference handling, persisted/cross-tab choice and an in-memory fallback when storage is blocked. Semantic theme colors retain 2 px borders, hard shadows, readable availability text and literal artwork plates.

| Owner | Dependency | State | Evidence / review | Next action |
| --- | --- | --- | --- | --- |
| Main implementation | Reference direction and existing theme identity | Notebook-grid/content and jet-black checks passed locally | Notebook/content lint/build/browser 11250 passed; jet-black gate 7536 passed | Inspect final diff and hosted checks after authorized push. |
| Main QA | Latest jet-black dark-mode token change | Passed locally | Notebook/content full gate 11250 passed before this CSS change; 7536 passed | Preserve local versus previous-pushed CI distinction. |
| Request workspace | Shared basic local storage | Integrated; further work deprioritized | Protected hub and isolated preview, legacy v1/single draft; sample/corrupt/deletion-focus checks passed; reference enhancements absent | Preserve WIP; resume dependent features after homepage priority. |
| Design | MagicPath canvas | Verified artifact | Private project 463330845164449792, 11 shapes/two desktop-mobile frames | Reconcile design with rendered homepage; no other design artifact claimed. |
| Backend | Connected Supabase and dashboard access | Database/CDP timeout unresolved | Healthy project metadata; SQL/list/three DB health checks timeout; Chrome SQL dashboard CDP timeout | Continue permitted health inspection; no restart/compute change. |
| Release | Private org repository and eligible Vercel team | Gated | Previous pushed 3ea9fd6 Website/Documentation CI passed; visual pass unpushed; no deployment | Resolve provider/account prerequisite before deployment. |

## GitHub work tracking

- [Private repository](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB)
- [Private organization project](https://github.com/orgs/MEC-IDEALAB/projects/1), linked to the repository with all 13 issues
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

The previous pushed revision `3ea9fd69d80b802a3ab30dd4f2f14994d02bcec9` passed both [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39459247881) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39459247807). Those hosted results do not cover the unpushed visual-standard pass.

Supabase remains installed and connected. Project metadata identified `grow-idealab` (`huftzhfqnnslvnfzvbex`) as `ACTIVE_HEALTHY` on 20 October 2026, while public table/migration/minimal SQL calls and three subsequent database health checks timed out. Attempts to open/access the Chrome SQL dashboard tab also hit CDP timeouts. No live schema or SQL result is established; this is a database/dashboard-access issue, not an uninstalled tool. No restart or compute change was authorized or performed.

## Deployment prerequisite

[Deployment preparation](deployment.md) records the intended Vercel settings and release checks. The private organization-owned repository cannot use Vercel Hobby’s Git integration; an eligible Pro or Enterprise team is required, according to the verified [official Vercel Git requirements](https://vercel.com/docs/git#deploying-private-git-repositories). Preserve repository privacy; no account upgrade, paid trial or deployment has been performed. Vercel account/team readiness and an actual rendered hosted preview remain unverified.

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

**Current local draft slice:** follow the [request-hub acceptance plan](experience.md#local-request-workspace-slice). Verify legacy draft restoration, account/sample isolation, corrupt and blocked storage recovery, valid references/metadata, save/reload/return/continue/delete, keyboard navigation and responsive layouts. Confirm submitted history remains explicitly unavailable and no design-flow service requests occur. Basic sample journeys, corrupt storage and deletion focus passed locally in session 24659. Extended reference validation and live-account acceptance remain unverified.

**Operational E2E:** member submits a real request, authorized head reviews, member accepts material edits, head confirms preferred time, task progresses, user sees accountable history; cancel before/after claim and race conditions; project join request/creator approval; free/paid event capacity under concurrent verification; borrowing return/Operations verification; report authorization/audit. Follow each journey through browser, server, data and returned UI. Missing backend gates mean skipped/blocked, never passed.

Additionally verify changed proposed time is not treated as agreed until explicit requester acceptance, declining keeps the request open for another proposal, and no automatic expiry occurs; verify only Super Admin can assign/revoke scoped heads and manage active-work handover/reassignment. Detailed action permissions, automatic reassignment rules, handover mechanics and in-flight transaction effects remain unresolved and must be specified before dependent implementation. Machine/room-specific assignments must reject out-of-scope head actions; anonymous visitors cannot read individual project/event records; demo catalog labels remain obvious and no demo stock/prices flow into operational submissions, billing or reservation claims. Current browser-only drafts must remain account-scoped and explicitly unsubmitted. The `/design/request` preview is enabled only by `ENABLE_DESIGN_PREVIEW=true`; verify its disabled state returns not found, its sample draft is separate, and `/app` remains protected. This local preview is not evidence of authenticated backend acceptance.

**Security:** verify real deployed grants/RLS and ownership, cross-user reads/writes, client-supplied identity/role/position rejection, restricted staff scope, payment verification authority, private profile fields/media, anonymous publication, safe redirects and cache boundaries. Keep service-role/secret keys out of browser/public environment. File uploads stay disabled until storage path/MIME/size/access/retention policy is approved and tested.

**Shared backend:** preserve existing identities and mobile compatibility; compare schema/functions/grants/policies/triggers/storage/migration ledger with repository contracts; approve migration and rollback separately; use faithful non-production tests. Historical SQL is not deployment evidence. No production migration is authorized by these documents.

**Push/release:** user guidance requires actual current-source local checks and applicable end-to-end acceptance before application/feature pushes. Missing/failed/skipped required tests block push. After an authorized push inspect actual hosted checks on the relevant revision; required verification cannot pass by absent/neutral/skipped execution. Before merge require current head, required checks and independent review. Before production release verify provider/callback/domain configuration, recovery, backup/restore, support ownership and rollout/rollback. Repo/Vercel setup does not itself authorize unrelated remote settings changes.

## Reporting rules

Record checks as **passed**, **failed**, **skipped**, **blocked**, or **unverified**, scoped to revision and environment. Notebook/content validation passed (session 11250, exit 0): lint, production build and real browser coverage of five homepage widths and all three facility photos; the full 11-entry `/lab` directory at 320/768/1440 px in both themes; `/explore` history and public event-theme boundaries; prior contrast, motion, no-JavaScript, draft and guard journeys. Jet-black dark-mode validation subsequently passed in session 7536, including the body and neutral section strip. Backend availability, full V1 and deployment remain unverified.

Design evidence: private MagicPath project `463330845164449792` was created and opened; an actual canvas read verified 11 shapes across two desktop/mobile frames. No Figma, Penpot, Canva or generated-media artifact is established. MobileMockup was inspected but its image-only mobile-app concept workflow did not fit this website task. Firebase was not selected; no additional backend stack was introduced.

The request hub/basic storage is integrated, preserves one account-specific legacy-v1-compatible draft and never claims submission. Reference enhancements remain unimplemented. Supabase is connected, but its database queries and browser dashboard access remain blocked by timeouts; no live schema was established. The previous pushed revision `3ea9fd69d80b802a3ab30dd4f2f14994d02bcec9` passed both [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39459247881) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39459247807). Those hosted results do not cover the unpushed visual-standard pass. Confirmed scheduling and Super Admin assignment/handover decisions remain intact. Full V1, live member/staff acceptance, backend activation, merge and Vercel deployment remain gated.

## Source boundaries

Use the local [requirements](requirements.md), [experience](experience.md) and [architecture](architecture.md) as canonical web scope, UX and integration decision records. They preserve accepted decisions without requiring files outside the standalone repository.

Historical provenance in the parent Grow workspace includes `docs/00_Project/CURRENT_PROJECT_BASELINE.md`, `docs/03_Database/ROLE_AND_POSITION_CONTRACT.md`, `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md`, `docs/03_Database/BACKEND_SECURITY_BASELINE.md` and `docs/03_Database/AUTH_PROVIDER_RELEASE_CHECKLIST.md`. These paths are contextual references, not working standalone links or pinned deployment evidence. Backend approval must reference inspected contracts and actual current environment evidence.

## Branded loading state

The initial page boot and sign-in loading boundary use repeated IDEALAB.MEC wordmarks with alternating row motion, inspired by the existing official-site loader. The overlay clears on hydration without a minimum display duration; a five-second fail-open watchdog prevents a stuck screen if scripts fail. JavaScript-disabled browsers do not show the boot overlay. Reduced motion leaves rows static. The root route has no loading boundary, preserving ordinary 404 HTTP responses. Loader visual and dismissal checks are part of browser acceptance; live backend readiness is unchanged.
