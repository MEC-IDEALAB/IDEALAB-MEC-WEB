# Full-scope release audit — 23 October 2026

## Current checkout and acceptance update

The active website checkout is `F:\kannan\projects\IDEALAB\idealab-mec-web`,
beside the Grow checkout at `F:\kannan\projects\IDEALAB\Grow`; the older
`apps/idealab-mec-web` location below is historical. Both contain substantial
local uncommitted work, and historical hosted CI does not validate it. The
current local website build passes. The public/preview browser suite has passed
for its scoped configuration, but does not test real account or operational
workflows. Password recovery is disabled pending its session boundary. See
[current account evidence](account-readiness.md) and
[recovery contract](recovery-session-contract.md).

Latest local hardening: production member-backend configuration now accepts
only the verified Grow project ref `huftzhfqnnslvnfzvbex`, while validation
remains pinned to `gvvqlfachzbufstzoiwi`. Node 24 config tests pass for the
approved and rejected targets. A reviewed validation-only migration added eight
foreign-key indexes; the Supabase advisor now reports no unindexed FK paths.
This does not authorize or perform a shared database migration or enable
production member traffic.

The requested IDEALAB MEC release is **not complete**. This is an evidence map,
not a reduced release definition. Requirements WEB-001 through WEB-018 and the
approved user/staff flows remain in scope. Earlier public-foundation CI and
isolated SQL successes cannot establish this entire release.

Current website checkout: standalone `apps/idealab-mec-web`, branch
`codex/modern-brutalist-home`, HEAD `0504b41a1427640bd8fcbdeda48423f5ea24c05a`.
The read-only status check found 211 modified/untracked entries, including
earlier work; nothing was staged, committed, pushed, deleted or reverted. A
future commit needs an explicit scoped file review, not a broad add operation.

## Requirement-to-evidence audit

| Requirement | Current evidence | Assessment and missing proof/work |
| --- | --- | --- |
| WEB-001 public introduction/assets | [Content sources](content-sources.md), public routes and current local production-browser acceptance | Public routes, published asset loading, carousel labels/dates and responsive rendering passed current local browser acceptance. Institutional source limits remain documented; no live deployment established. |
| WEB-002 shared accounts/onboarding | [Account status](account-readiness.md), auth actions/callbacks and four-step profile | Genuine isolated Google/profile/declaration passed earlier. Positive email signup/confirmation/password login/recovery are unverified; shared Flutter/production rollout is not cleared. |
| WEB-003 Home/Lab/Profile navigation | Current member shell, [top-nav acceptance](quality/top-navigation-regression-2026-10-22.md) and [signed-in member page check](quality/member-pages-browser-2026-10-23.md) | Implemented against Grow's Home/Lab/Profile hierarchy; authenticated Home, Lab and Profile were rechecked at 320/390/768/1366px with no horizontal overflow. Profile shows six private account fields owner-only. Operational write flows still need separate acceptance. |
| WEB-004 private minimum profile | [Profile/admission evidence](account-readiness.md), [second-login conflict](quality/second-account-claim-2026-10-22.md) | Isolated own profile and one-number claim enforced. Production broad-profile access and client-writable fields remain rollout gaps. |
| WEB-005 project discovery/membership | [Projects acceptance](quality/projects-core-2026-10-22.md) | Guarded core installed in isolation. Genuine second-admitted-member approval/cancel/leave and concurrent transitions remain unverified. |
| WEB-006 event participation | [Events reads](quality/events-read-2026-10-23.md), [full Events contract](events-contract.md) | Programme reads only. Registration, atomic capacity, free/paid states, payment verification, attendance and Events Head cancellation/refund workflows are incomplete. |
| WEB-007 own visits | [Visit writes](quality/own-visit-writes-2026-10-22.md) and core duty history | Genuine own check-in/out passed in isolation; current two-person/concurrent and shared-client rollout acceptance remains open. Fixed hours are superseded by actual core Open/Close duty. |
| WEB-008 Machine/Operations requests | [Intake acceptance](quality/work-request-intake-2026-10-23.md) | Private intake source/SQL implemented in isolation; genuine browser submit/reload/cancel is unrun. Collaborators, responsible-head review and material-change lifecycle remain incomplete. |
| WEB-009 agreed scheduling | [Request contract](work-request-intake-contract.md), requirements | Preferred intent is recorded only. Head proposals, requester acceptance/decline, conflicts and audited agreement are not implemented. |
| WEB-010 cancellation | Guarded pre-review cancel and sequential internal-marker test | Post-review reasoned request/head decision is incomplete; [overlap attempt](quality/work-request-overlap-2026-10-23.md) did not establish concurrency. |
| WEB-011 manufacturing/queues | Requirements and staff layout previews | No accepted manufacturing task, queue, machine/runtime/maintenance writer. Preview layouts and facilities information are not operational control. |
| WEB-012 inventory/borrowing | `/app/borrowing` unavailable state; requirements | No accepted live catalog, stock movements, issue/return verification or fine workflow. Real master data and approved rules are required. |
| WEB-013 quotes/manual UPI | Requirements; owner confirms lab GPay exists but details unavailable | No official payee configured, payment submission disabled. Quotes/proof/verification/deposit/refund rules and audited writes remain incomplete. |
| WEB-014 notifications/reports/audit | Some domain mutation journals; notifications unavailable | Local domain history does not implement notification delivery/read state or approved operational exports. Report set, privacy and retention scope remain open. |
| WEB-015 administration | Staff previews and requirement matrix | No accepted Super Admin assignment/revocation, scope-aware head controls, handover/reassignment or master-data workflow. Broader staff work was deferred by the owner. |
| WEB-016 responsive/accessibility | [Current signed-in member page check](quality/member-pages-browser-2026-10-23.md), same-day public/auth acceptance and 100 boundary checks | Home/Lab/Profile passed overflow checks at four widths. The 23 October local production-browser suite also passed five-width light/dark coverage, motion/reduced-motion, keyboard, responsive forms, recovery boundaries and gated previews. Authenticated Events currently renders a truthful empty isolated programme; intake persistence still needs a separate scoped acceptance journey. |
| WEB-017 truthful state/persistence | Exact parsers, unavailable/empty separation, local-draft distinction and guarded isolated receipts | Scoped checks pass; actual online intake browser persistence remains unverified. Do not label previews/unavailable services complete. |
| WEB-018 shared backend gate | [Flutter refresh](research/flutter-compatibility-2026-10-22.md), [shared metadata](research/events-metadata-2026-10-23.md), [shared backend readiness evidence](backend-readiness.md#current-evidence) | Still blocked: Grow production has broad account-table grants and policies, while the current clients and nine tracked website migrations do not match its two-entry live ledger. Local Flutter defense-in-depth was added after this audit; it does not fix the direct API boundary. A reviewed current-baseline migration, rollback, installed-client policy and negative/positive cross-client acceptance are still required. No production write was made. |

## Same-day shared-backend gate refresh — 23 October 2026

The live Grow catalog was rechecked after the original audit. Its current ledger
contains only `create_initial_schema` and `add_rls_policies`; both `anon` and
`authenticated` retain broad `public.users` grants, including `TRUNCATE`, and
authenticated reads remain all-row. Details are in the linked shared security
baseline. Source-level Flutter changes made after that inventory narrow the
repository API and new-row payload, but RLS/grants still permit access outside
that API. The check queried metadata only and made no production writes. Keep
member activation off until a migration is reviewed and tested against this
actual live baseline and the existing Flutter client is coordinated.

## Same-day local browser acceptance refresh — 23 October 2026

Node 24 ran `node scripts/acceptance.mjs` against the local production build;
the public journey passed at five widths in light and dark themes, including
assets, keyboard navigation, responsive sign-in/sign-up/recovery layouts,
carousel movement, scroll/card motion, reduced-motion cancellation, request
draft boundaries, disabled member actions, gated student/staff wireframes and
security headers. The carousel automatically advanced in the isolated browser;
manual checks also moved through all four archive slides and wrapped back to
TRIAD, while the slot-three/four alternate photo descriptions stayed attached
to their existing titles and dates.

The signed-in validation browser showed the Events page's empty programme and
explicitly stated that registration, payment and staff publishing are not
connected. No form was submitted and no database row was written. The public
sign-in and sign-up routes returned HTTP 200; an unauthenticated `/app` request
redirected with HTTP 307. These are local route/UI checks, not proof of live
password signup, email delivery, member permissions or operational persistence.

The backend runtime now fails closed for arbitrary Supabase targets: validation
is pinned to the isolated project, production accepts only the verified Grow ref
`huftzhfqnnslvnfzvbex` plus its separate activation flag, and the test-only auth
fixture is restricted to `.invalid`. The Vercel
Preview gate also requires the production member flag off. Current-source Node 24
lint, TypeScript, 104 boundary tests, a separate `.next-acceptance` production
build, and the browser suite passed after this change; the validation server's
member-enabled `.next` build remained intact. No provider form or member request
was submitted during this acceptance run.

## GitHub and delivery evidence

A fresh `gh pr view 14` confirms the owner merged
[PR #14](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/pull/14) on 21 October
at 12:51:22 UTC. Head `7219815bcb3f1216264ec8a85ea46ec4be2bb6df` had successful
Documentation gate, Public foundation acceptance and Required gate; reviews is
an empty array. The resulting merge is the current local HEAD above.
Fresh run listings also show successful [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39602977269)
and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39602977163)
on that merge commit. None cover the current dirty source.

The checked-in CI runs Node 24 lint/types/boundaries/audit and real public/sample
browser acceptance. Its required gate rejects failed/skipped verification. It is
named Public foundation acceptance and does not prove live member/staff/backend
workflows. No authenticated production CI or hosted acceptance is established.

The branch-protection API freshly returned 403, stating this private repository
needs an eligible plan or visibility change. Neither billing nor visibility was
changed. Do not claim server-enforced merge protection or substitute old checks
for current-head independent review. Existing authorized repository/issues/project
setup remains separate from current full-scope delivery acceptance.

Fresh GitHub reads on 23 October still show the organization delivery project
`MEC-IDEALAB/IDEALAB MEC — V1 delivery` and merged PR #14. Issue #16 remains
open and now has a verified [local-QA comment](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/16#issuecomment-6356369304); it is not marked complete because
the changes are uncommitted and await scoped review/merge. The Vercel connector
returned one account team but no projects in that scope, so no linked site
project or hosted deployment is currently available. No project, billing,
branch-protection or deployment setting was changed. The private repository's
branch-protection restriction and the absent Vercel project remain delivery
setup gaps.

## Dependency-ordered next actions

| Owner | Dependency | State | Next concrete action |
| --- | --- | --- | --- |
| Owner + main QA | Authenticated write acceptance | Browser access is restored; Home/Lab/Profile and public/auth checks passed | Run scoped request submit/detail/reload/cancel with clearly disposable validation data, plus Events keyboard/responsive checks. Do not create operational rows that could be mistaken for lab work. |
| Owner privately + main QA | Email/password account tests | Unverified; new passwords require private user entry | Complete genuine signup/email/password/recovery without sending passwords, links or codes into chat. |
| Owner + main | Production email sender | No verified production SMTP setup/delivery evidence | Configure an official sender/provider and verify confirmation/recovery delivery before public signup. A linked personal email address is not SMTP configuration. |
| Owner + consenting test student | Second admitted identity | Existing second login reused the original registration number | Use a different actual MEC student's accurate own declaration for genuine cross-member acceptance; never invent a number or bypass uniqueness. |
| Main architecture | Existing Grow client policy | Owner says current Grow users are dummy records and may be removed if a reviewed migration requires it | Plan a coordinated app update against the shared contract; identify exact records, dependencies and recoverability before any deletion. No accounts or rows have been deleted. |
| Main + owner | Staff and master-data decisions | Broader staff work deferred; detailed scopes/roster and operational rules incomplete | Resume the approved full staff work when that deferral is lifted; implement trusted assignments before receiving-head/financial writers. |
| Owner + main | Official payment/master data/report inputs | Not supplied or not settled | Keep payment/stock/report claims disabled; obtain actual approved inputs before dependent implementation. |
| Main + independent QA/security | Source and delivery | Partial local checks; no current full E2E/hosted proof | Complete missing flows/tests, review scoped files, then follow authorized push → exact-head CI/review → deployment/rollback gates. |

The goal remains active. No production change or release approval follows from
this audit. Its open items must be resolved against the full original scope,
not removed from the definition of completion.

Independent source inventory found no overlooked manufacturing, inventory,
payment, notification or staff-assignment writer. It confirmed the narrower
project/visit/opening/request/profile RPC writers already mapped above. Its
suggestion that a historical backend-readiness paragraph superseded the genuine
admission result was not accepted: that file's entry explicitly defers to the
newer account status, and admission-positive records the owner/browser/database
acceptance. That historical positive remains valid for its scope; current-source
integrated browser acceptance still needs repetition.

Production SMTP is a named dependency, not a fresh claim about private provider
settings: those settings were not re-read here. Current [Supabase guidance](https://supabase.com/docs/guides/local-development/cli/testing-and-linting#going-into-production)
says the default development sender must be replaced with a configured provider
before production. No SMTP credential was requested, read or stored in this audit.

Activation distinction: work-request actions additionally require validation
environment flags. Project/visit/opening actions rely on requireMember plus
guarded RPCs. The general member flag defaults off but is not an independent
project/environment allowlist. Shared activation requires explicit target
configuration review and actual production-compatible authorization; do not
infer isolation merely from a UI validation label or default-off flag.
