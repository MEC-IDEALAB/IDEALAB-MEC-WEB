# Projects core checkpoint — 22 October 2026

Target: `idealab-mec-validation` only (`gvvqlfachzbufstzoiwi`). No production
schema, Grow data, account role, GitHub revision or hosted deployment changed.
The product owner declined an additional display-name field. Team/request UI
uses references and never exposes private onboarding name, phone or registration.

| Owner | Dependency | State | Output/evidence | Review/QA | Next action |
| --- | --- | --- | --- | --- | --- |
| Main | Confirmed project/privacy contract | Implemented | `docs/projects-contract.md`, Projects routes and guarded SQL | Read-only independent review found no SQL blocker after corrections | Real second-account acceptance |
| Read-only reviewer | Current SQL and UI | Reviewed | Membership-oracle, immutable audit outcome and stale-editor corrections checked | No remaining static installation blocker; empty-ID parser hardening completed | Review runtime findings |
| Main | Isolated baseline | Installed | `isolated_project_core_v1`, seven forced-RLS tables, four guarded RPCs | 70 catalog/sessionless assertions passed in migration transaction | Shared migration remains separately gated |
| Main | Existing approved account | Passed scoped SQL fixtures | 27 assertions in `mec_projects_transitions.test.sql`, outer rollback | SQL-role fixture, not genuine browser login or concurrency | Cross-account approval/cancel/leave |
| Main | Current source | Passed | 83 boundary tests, full ESLint, production build including TypeScript | No failing/skipped local boundary tests | Browser regression |

The transition suite checks atomic creator/lead creation, no duplicate on retry,
changed command meaning conflict, private/public discovery, creator leave guard,
code rotation and old-code rejection, existing-member join without new request,
stale edit conflict, persisted stage, exact input shape, missing entity response,
20+1 seek pagination without overlap, code-attempt limits and receipt-linked audit.
All fixture-created rows roll back. It does not exercise two independent identities
or overlapping transactions and is not evidence of those scenarios.

Genuine Chrome session created one clearly labeled isolated website-validation
project. Its default private visibility, creator lead and one membership were
visible after navigation; public discovery and stage updates persisted. Browser
testing caught automatic form reset reverting select displays after success.
The editor now cancels native reset to preserve controlled state. Final browser
retest passed: DOM stage/visibility retain `in_progress`/`public`, a subsequent
unchanged submission persists those values, and a 161-character rejected title
retains text and selections with focused error feedback. Independent reviewer
rechecked the correction and accurately bounded the SQL evidence.

Browser code rotation changed the code, focused feedback, disabled the stale
open editor and offered explicit reload. Reload restored saved data. Submitting
the previous code returned generic unavailable feedback; current-code submission
by the existing creator returned already-member without a join request or duplicate
membership. These are not tests of a different applicant being approved.

All four pages (discovery, creation, code join and detail with expanded editor)
were observed at 360, 390, 768 and 1440 CSS pixels in light and dark themes:
32 observations, zero horizontal-overflow failures. Join submit measures 52px
high at each dark-theme width. Screenshots are saved locally under
`artifacts/acceptance/projects-hub-desktop.png` and `projects-hub-phone.png`;
they exclude code and private profile details.

Final isolated aggregate: one explicitly labeled browser-test project, one
creator membership, zero join requests, seven command receipts, six audit events,
zero active visits. The project is retained as a clearly labeled test fixture;
no permanent deletion was performed. Port 3015 runs the final local production
build. Latest build and focused lint/eight Project boundary checks pass after
the reset correction; the full 83-test boundary run and full lint passed earlier
in this same slice before that JSX-only correction.

Remaining: genuine second-account request/creator approval/decline/cancel/leave,
private cross-owner denial, real concurrent races, and injected-failure rollback.
No fabricated Auth accounts were used. Shared Grow still has incompatible direct
membership writers and profile projections; production activation remains blocked.

Security advisor after install: 13 informational no-policy notices match the
intentional deny-raw/API-via-guarded-functions design. Catalog tests verify API
roles have no direct grants. The existing warning about disabled leaked-password
protection remains: [Supabase guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
