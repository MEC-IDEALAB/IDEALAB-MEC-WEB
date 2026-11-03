# Member workspace redesign — 2 November 2026

Status: owner decisions recorded; local visual implementation in progress.
No new shared schema, public-profile exposure or payment activation is claimed.

## Confirmed direction

Keep Home / Lab / Profile as the primary navigation, with Settings inside Profile.
Merge the landing page's neo-brutalist ink borders, yellow/pink accents, hard
shadows and monochrome event imagery with retro pixel headings and original
ASCII artwork. Retain readable body typography and existing self-hosted fonts.
Use pixel typography for short display phrases, labels and collectible marks,
not long paragraphs, forms or session tables. Do not add another visual system.

Use real editorial and member data. Do not copy placeholder stock, session
counts, public handles, achievements, availability or prices from Flutter.
The no-scroll requirement applies to compact auth cards; these content-rich
workspace pages need ordinary vertical flow and keyboard-accessible sections.

## Proposed information architecture and wireframes

| Destination | Section order | Main action and detail destinations |
| --- | --- | --- |
| Home `/app` | Top information ribbon; greeting/compact ASCII artwork; featured activities; community/learning shortcuts; About the space; support/donation panel; bottom quote ribbon | Mentorship & support; learning & knowledge; meet the IDEA Lab/FabLab team; facilities, zones, equipment, areas and floor plans; rules & safety; contact |
| Lab `/app/lab` | Core-reported opening state and Wi-Fi/power status; own check-in/out; current presence; My sessions; request/booking actions; upcoming events; My projects and Discover projects | Visit history; work request; components/tools request; slot request; event detail; project detail and discovery |
| Profile `/app/profile` | Flippable identity/share card; interests and Maker Marks; bio/skills; projects and participation; experience, education and volunteering; settings shortcut | Edit profile; share/QR; visibility settings; Settings |
| Settings `/app/settings` | Account and visibility; appearance/motion; feedback/contact; policies; referral/vouch; account deletion; sign out | Separate edit and destructive flows; confirmation and clear completion/error states |
| Request hub `/app/requests` | Machine work and Operations/components entry points; drafts; submitted requests and status | Common request shell with service-specific fields and protected detail/history |

Home's facilities/about grouping should be one compact directory, not a wall of
separate large cards. On phones, present short stacked groups with explicit
buttons; on desktop use a main content column plus contextual cards. Lab keeps
the actionable visit state above decorative artwork. Profile keeps private
account details distinct from any deliberately published profile.

```text
HOME                       LAB                        PROFILE
Home | Lab | Profile       Home | Lab | Profile        Home | Lab | Profile
information ribbon         Open/Closed + Wi-Fi/Power   identity card <-> QR
greeting + ASCII scene     own visit actions          interests / Maker Marks
featured activities        current presence           bio / skills / links
learn / ask / community    own session history        projects / participation
about / facilities guide   requests / slot requests   experience / education
support space / team       events / projects          volunteering / settings
quote ribbon
```

## Flows and data boundaries

- Preserve verified identity, MEC admission, required six-field profile and
  server-side member guards. Optional interests must not become another
  admission blocker. Existing decisions place enrichment in Profile after Home
  access; include an optional interests setup there with Skip. Moving this into
  initial onboarding requires an explicit owner decision. Interest badges are
  self-selected labels, not earned awards, verified skills or safety clearance.
- Existing role vocabulary remains student, lab_admin and super_admin; trusted
  scoped capabilities authorize core status edits. An interest, badge or QR
  never grants a role, machine access or attendance permission.
- Wi-Fi/power status needs a reviewed permissioned writer, actor/time metadata
  and an explicit Unknown state. Never infer available service from missing
  updates. Current lab opening continues to follow actual core Open/Close duty
  declarations, not a fixed timetable.
- Own session history remains owner-only. The new presence list needs a separate
  minimal read contract; it must not expose raw session history or contact data.
  Any visible name uses explicitly opted-in display identity, not an implicit
  release of the required legal name. Support a generic/count-only fallback and
  visibility revocation. No separate mandatory display name is required.
- Shared profile QR contains a share URL only, never an Auth token, email,
  phone, registration number or private profile payload. It is not a check-in
  credential. Public routing, visibility and revocation need a new contract.
- Bio, image, portfolio, GitHub/LinkedIn/site links, skills, experience,
  education and volunteering need bounded inputs and explicit visibility. Do
  not derive public identity from an email address. Images need approved private
  upload/owner access rules and image processing before activation.
- Suggested collectible name: **Maker Marks**. Proposed interests include both
  technical and nontechnical topics: robotics, AI, electronics, fabrication,
  design, art, painting and fitness. The owner selected self-chosen interest
  badges; do not implement earned awards or imply verified achievement,
  machine training or certification.
- Existing intake decisions remain service/title/description required; time,
  references and technical details optional. Machine work includes laser, 3D,
  CNC, cup/T-shirt printing, design, lathe and woodwork. Operations handles
  components, ICs, electronics tools and hardware. Borrowing/return/stock and
  head-confirmed slot requests are separate from submitting a work request.
- Donation payment stays disabled until approved official payee details and
  policy are supplied. No personal account, invented funding claim or fake QR.
- Team roster, floor plans, safety rules, learning resources and mentorship
  intake need real approved content. Existing facility directory can be reused
  as editorial material, not a verified stock/booking catalog.
- Account deletion must honor the approved anonymized lab-history retention,
  revoke access/share links and clean up owned private media safely. Do not
  label an unconnected button as a completed deletion workflow.

## Owner decisions — confirmed in this chat

1. Signed-in members see current presence names; public visitors see counts only.
2. Optional shareable profiles default **public**, with a private setting. This
   supersedes the proposed private default for optional profiles only. Required
   account fields are not automatically published. Existing legacy data must not
   become public as a side effect of a migration; new optional content has a
   clearly disclosed public default on deliberate save.
3. Badges are all self-selected interests. “Maker Marks” remains a proposed name,
   not an owner-confirmed product label.
4. Students request a slot and the responsible head confirms.
5. Vouch a friend is an invitation/referral only, with no admission or authority.
6. Mentorship begins with curated resources plus a support/mentor request,
   without matching, scheduling or learning-progress infrastructure.

Remaining technical boundaries: presence should use a deliberately shared name,
without requiring a second name or exposing stored private legal names by a
backfill. Utility freshness needs an honest timestamp/unknown state until a
specific freshness policy is established. Actual team roster, floor plans,
mentorship intake recipient and published learning resources need approved
content. Existing verified contact email may serve a clearly labeled email
support entry; it must not claim a stored request or response commitment.

## Source and implementation evidence

- Website member pages: `src/app/app/page.tsx`, `lab/page.tsx`,
  `profile/page.tsx`, `settings/page.tsx` and `borrowing/page.tsx`.
- Reuse `MemberQuickActions`, `WorkspaceDestinations`, `LabOpeningPanel`,
  `OwnVisitsPanel`, `UpcomingProgramme`, `RecentProjects`, request drafts and
  member skeletons. These components do not establish shared live rollout.
- [Shared architecture](architecture.md) distinguishes the installed shared
  profile contract from operational routines installed only in validation.
- [Grow reference mapping](grow-reference-mapping.md) is historical reference.
  Current source review found the Home header/ticker/quick-action/activity rhythm
  in `Grow/lib/features/home/presentation/screens/rc5_home_screen.dart`, the
  member card/settings in `lib/features/profile/presentation/screens/rc5_profile_screen.dart`,
  and visit-state/history layout in `lib/features/lab/presentation/screens/lab_screen.dart`.
  Their public-looking email-derived handle is not a working public-profile
  route; their ID QR is an account identifier, not the proposed share URL.
  Rich-profile routes remain unavailable and the current work-request data
  source rejects submission. Do not port these as verified working services.
- UI/UX Pro search matched Pixel Art styling and reduced-motion/contrast rules.
  Its generic game palette and conversion-hero pattern do not fit this member
  workspace: retain the existing [visual tokens](design-system.md), task-first
  section order and readable body font instead.

## Task and verification ledger

| Task | Owner | Dependency | State / evidence | QA and next action |
| --- | --- | --- | --- | --- |
| MW-01 Existing web/mobile inventory | Coordinator + two read-only explorers | Current source | Complete: web and current Flutter RC5 screens inspected | Reuse layouts, not placeholder/live-service claims |
| MW-02 Section/flow plan | Coordinator | Confirmed owner scope | Six owner answers recorded; independent read-only review incorporated | Use confirmed defaults |
| MW-03 Shared visual components/Home | Main + Home worker | MW-02; approved editorial content | Local Home implementation; 18 preview layouts and 12 axe snapshots passed | Motion/navigation/no-JS checks and full optimized public regression passed |
| MW-04 Lab utility/presence/session flows | Main + security reviewer | Visibility and capability contract; existing visit integration | Local visual layer added; utility/presence backends unavailable | Owner/other member/core/anonymous denial and concurrency tests still required for new APIs |
| MW-05 Rich profile/share/marks/onboarding | Main + security reviewer | Explicit publication/interest contracts | Local editor, private account separation, no-store public route, copy/open link, lazy QR flip card and optional interest/skill/link fields; candidate SQL remains uninstalled | UI and isolated SQL behavior pass; live Supabase/PostgREST, Flutter, anonymous reads, cache/revocation and real device QR acceptance remain |
| MW-06 Requests/components/bookings | Implementation | Existing intake plus stock/slot approval contracts | Planned | Real submit/detail/cancel/approval and retry checks |
| MW-07 Settings/policies/deletion | Implementation + security review | Approved policy/content/retention and shared media contract | Planned | Safe sign-out/deletion, retained history and access denial |
| MW-08 Release | Coordinator + independent reviewer | Current-source local acceptance | Not started | Actual CI/current head/review before merge; no fake service acceptance |

For every feature distinguish live records, unavailable services and optional
editorial content. Use stable skeleton shapes only during real loading; empty,
denied, stale and error states are distinct. Decorative ASCII stays out of the
accessibility tree, pauses offscreen/hidden, and becomes static under reduced
motion. Carousels need keyboard access and a discoverable motion control without
covering navigation. Cache public editorial content separately from private
member data; avoid duplicate requests and large animation dependencies.

## Local implementation checkpoint

The new Home reuses real streaming programme/project panels and moves opening
and own visits into an expandable Lab snapshot. Editorial activities use existing
published themes, not invented upcoming events. Guidance/team/support actions
are clearly labeled email links, not completed submissions or donations.

Lab and Profile now share an original ASCII scene, pixel labels, bold accent
plates and existing protected flows. Wi-Fi/power show Unknown; presence and
public-profile sharing remain clearly unavailable. No data was published.
`/design/member-space?screen=home|lab|profile` reuses these components with no
account records and is available only with `ENABLE_DESIGN_PREVIEW=true`.
The preview's skeletons are explicitly illustrative; protected pages retain
actual Suspense boundaries.

Independent review caught mismatched preview navigation, a ribbon button's
accessible-name mismatch, and ASCII artwork ignoring motion pause. These were
corrected. Rendered axe checks caught low contrast on two accent panels; explicit
ink text corrected it in both themes. Preview layout coverage is 320, 390 and
1440 pixels in light/dark, with reduced motion. Lint, TypeScript, optimized
acceptance build and 39 focused auth/profile/visit/opening boundary tests passed.
The 18 preview layouts and 12 WCAG axe snapshots passed. Additional real-browser
checks passed for moving ribbons, global ribbon/canvas pause, primary preview
navigation and server-rendered content with JavaScript disabled. Browser tests do not
establish authenticated editing, new API persistence or production rollout.

The full optimized production public/configuration regression suite subsequently
passed on this application source, including public responsive routes, auth and
recovery layouts, loader timing, keyboard/motion, existing preview skeletons,
drafts, security headers and PWA member-route cache exclusions. Real provider
login/signup/email delivery and authenticated operational persistence remain
unverified on this revision. The new visual preview matrix ran against the local
developer server; it is not an authenticated member acceptance suite.

No GitHub push, merge, deployment, provider change or shared database mutation
was performed in this redesign slice. See the [new contract proposal](shared-public-profile-proposal.md)
for the next database boundary and required shared-client verification.

Owner follow-up: removed the new preview's breadcrumb/banner, duplicate
Home/Lab/Profile buttons and redundant Member Home label. The primary header
navigation remains. Home now renders the exact shared landing-page top and
bottom ticker components, including their theme treatment and motion control
in the footer. The route remains design-flag gated and contains no member data.

Mobile follow-up: compact ASCII headers, larger touch actions and readable card
copy, safe-area padding and a single-column destination list reduce excess
vertical space. The owner replaced the Lab link strip with a labeled six-card
Quick access grid (Overview, Requests, Borrowing, Events, Visits, Projects).
It uses six columns on desktop and reflows on phones and enlarged text. Current
page state, real links, focus rings and reduced-motion behavior are preserved.
Independent review found no remaining source blocker. The local browser suite
passed 42 layout cases including touch, landscape and 200% text at 320/390/600px,
12 axe snapshots, actual motion/pause, no-JS rendering and preview navigation.
Scoped ESLint and TypeScript passed. These are local UI checks, not new backend
acceptance or a deployment.

Lab layout follow-up (3 November): reordered overview to primary navigation,
shared landing ticker, monochrome archive-photo banner with icon-only Wi-Fi and
electricity indicators, a single enclosing Quick access card, then existing
opening/own-visit/history and other content. Replaced the previous promotional
Lab hero and verbose utility panel. The status banner shows only Wi-Fi and
electricity symbols while screen readers receive unknown-status labels; no
live status is invented. The photo is
decorative, local and served by Next Image. The static design preview now uses
explicit sign-in check-in/history cards instead of an endless loading skeleton;
the protected member route retains real async opening and visit panels. Removed
the second destination grid from the Lab body because the top Quick access card
already contains those routes. A matching quote band now closes the Lab overview;
the footer motion control names and pauses both top highlights and bottom quotes.
No new operational API or database change. All 42 visual cases and 12 axe
snapshots passed after the reorder, including text enlargement, touch sizing,
explicit DOM section-order assertions and the real ticker pause/resume behavior.
Desktop and mobile dark-mode captures were inspected. Source review found no
blocker; scoped lint and TypeScript passed.

The shared Grow catalog does not expose `get_lab_opening_v1`,
`set_lab_opening_v1`, `get_own_lab_visits_v1`, `check_in_lab_v1`, or
`check_out_lab_v1`; the read-only function-name query found no matches. The
opening and visit RPCs remain validation-only candidates. Production controls
therefore stay gated until a specific shared migration, trusted core-duty
assignment path, compatible Flutter client, and negative-authorization tests
are reviewed and accepted.

The complete public Chromium acceptance suite also passed on this worktree,
including login/signup/recovery layouts, loader timing, responsive motion,
keyboard behavior, 10 route/theme axe snapshots, gated member previews and PWA
offline fallback. Auth proxy and request/project journal browser checks passed;
`npm audit --audit-level=high` reported zero vulnerabilities, and documentation
validation passed for 72 files / 356 local links. Live account/provider journeys,
production permissions and operational workflows remain unverified.

## 3 November implementation and verification checkpoint

The optional profile editor now gates its share card on a persisted, initialized
public profile and the current public visibility selection. Its QR is generated
only after opening the card, encodes the same-origin opaque `/people/{id}` path,
and never includes Auth IDs or private account fields. Copy/open controls remain
available; the design preview labels its generated code as a local preview, not
a member identity. Focus follows the visible card face and the browser scrolls
the focused control into view. URL validation in the website and candidate SQL
rejects browser-parsed numeric IPv4 suffixes while preserving ordinary `0b` and
`0o` DNS labels.

Local verification on the current worktree: optimized isolated acceptance build
passed; TypeScript and ESLint passed; `test:boundaries` passed 168/168; public
profile contract tests passed 9/9; member browser suite passed 42 responsive
layouts and 12 axe snapshots, including QR generation, focus transfer, touch
targets and 200% text. The disposable PostgreSQL 17.6 rehearsal passed forward,
behavior and rollback checks, including controlled concurrent first-save and
privacy-change/stale-save races. Evidence is
[`runtime-1793651658862-4794e84c.json`](../artifacts/database-runtime/runtime-1793651658862-4794e84c.json).
No member rows or live database writes were used.

The member preview test is now a self-contained `test:member-space` command:
it uses dummy Supabase configuration, keeps member services off, builds the
design-only route, serves it on a temporary local port, runs the browser suite
and stops the server. Required Website CI and the manual Vercel preview workflow
include it; CI also retains the member screenshots/results. These hosted workflow
checks have not run on this local-only revision.

Fresh local verification on 3 November 2026 used the required Node.js 24 runtime:
ESLint, TypeScript, all 168 boundary tests, and the member preview browser suite
(42 responsive layouts and 12 axe snapshots) passed. The isolated optimized
acceptance build and public Chromium suite also passed, including the cinematic
loader milestones, reduced-motion handling, auth/recovery presentation, security
headers, ten-route WCAG snapshots, gated member pages and offline PWA shell. The
suite explicitly leaves live account creation, email delivery, Google sign-in,
password recovery, shared permissions and operational writes unverified. The
signed-out auth-proxy E2E also passed: public auth pages render, protected member
routes redirect with private/no-store and `Vary: Cookie` headers, and no account
credential or Supabase session was used. The
default terminal still resolves Node.js 20; package.json requires Node 24, so use
the pinned runtime before running the boundary suite locally. No live account or
database write was used for these checks.

The public-profile SQL candidate remains local and the feature gate stays off.
The live Supabase MCP read-only migration ledger still contains only the initial
schema, RLS, shared-access hardening and shared account-profile contract; no
public-profile migration is installed. Live project checks still show private
RLS tables without direct policies, `btree_gist` in `public`, two callable
SECURITY DEFINER functions (one is the owner-profile API), leaked-password
protection disabled, and performance lints for foreign-key indexes and repeated
auth policy evaluation. These need scoped review; this work did not change them.

Still required before release: exact migration approval/catalog reconciliation;
Flutter direct-write and offline-queue compatibility; real signed-in and
anonymous Supabase/PostgREST tests; QR decoding/device scan and public cache/
revocation checks; approved email delivery; the unfinished presence, requests,
booking, borrowing, events and staff workflows; then current-head CI, review and
release checks. The workspace is local and unpushed/undeployed.
