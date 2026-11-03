# Current account delivery status

## Read-only backend recheck — 3 November 2026

The connected Supabase read-only tools report the shared project `huftzhfqnnslvnfzvbex`
as `ACTIVE_HEALTHY` on PostgreSQL 17.6.1.166 in Mumbai. Its display name is
`IDEALAB MEC,` (including a trailing comma); the managed PostgreSQL database
itself is still named `postgres`. The live migration ledger contains the two
initial-schema migrations plus `20261102083307_shared_access_hardening_v1` and
`20261102130200_shared_profile_contract_v1`. No schema writes were made in this
recheck. The live catalog still contains legacy Grow tables, including `users`,
`user_profiles` and the richer profile tables; the optional public-profile and
operational module migrations are not in the ledger. A read-only function-name
check found no shared `get_lab_opening_v1`, `set_lab_opening_v1`,
`get_own_lab_visits_v1`, `check_in_lab_v1`, `check_out_lab_v1`,
`set_lab_utility_v1`, `get_lab_presence_v1`, or `submit_work_request_v1` APIs.
The matching website operations are therefore not live on the shared database.

The live Supabase advisor currently reports 7 security findings (3 informational
private-table RLS notices and 4 warnings covering a public extension, callable
security-definer functions, and leaked-password protection) and 90 performance
findings (8 unindexed foreign keys, 59 RLS init-plan notices, 21 unused indexes,
and 2 multiple-permissive-policy notices). These require scoped review; this
metadata check did not change them. The same read-only check confirms the four
Storage buckets (`profiles`, `projects`, `events`, `inventory`) are public and
all four current Storage policies target the absent `avatars` bucket. An
aggregate count found one object in `inventory`; no object identifiers or file
contents were read. Storage authorization behavior remains unverified. Email/
Google account journeys, confirmation delivery, Flutter compatibility on a real
device and operational member flows also remain unverified. Production member
features stay disabled.

Latest shared-backend checkpoint (2 November 2026): the owner-approved
`20261102130200_shared_profile_contract_v1` is now installed and its preservation,
permissions, RLS and anonymous-denial checks pass. Legacy clients remain offline
for the coordinated cutover. The website shared-local developer configuration is
available, while hosted production accounts remain source-disabled. Real provider,
email delivery, onboarding/cross-client and storage acceptance remain incomplete.
See [installation evidence and limits](quality/shared-profile-installation-2026-11-02.md).
This supersedes older uninstalled-profile statements below; historical checkpoints
remain scoped to their original dates.

## Current status — 2 November 2026

The owner now approves one shared Grow/IDEALAB backend and the project switch.
Validation has been paused and `grow-idealab` restored to ACTIVE_HEALTHY.
Fresh catalog checks confirm the earlier account privacy/authority gaps and the
missing shared onboarding APIs; production access remains gated. The dated
31 October project-state paragraph below is historical. See the
[shared configuration plan and delivery ledger](shared-backend-configuration-2026-11-02.md)
for live inventory and current rollout dependencies. The owner-approved first
permissions patch is installed as `20261102083307_shared_access_hardening_v1`;
its scoped checks passed. This supersedes older statements that no shared-project
change has occurred. Profile APIs, production auth activation and bucket changes
are still pending; see [installation evidence](research/shared-access-installed-2026-11-02.json).

The revised shared-profile candidate now preserves both legacy registration
reservations with normalized uniqueness and no automatic admission. Its
disposable PostgreSQL17.6 suite passes save/readback, repair, declaration/retry,
normalized collisions, privilege denials, provisioning fixture behavior and
duplicate-migration rejection. Source hashes and limits are recorded in the
[SQL verification report](quality/shared-profile-sql-2026-11-02.md). This is not
an installed shared-profile migration or real Google/email/client acceptance.

Fresh read-only public Auth settings initially reported Google and email signup
enabled with email autoconfirm enabled. The owner has since enabled Confirm email;
an independent 2 November read verifies `mailer_autoconfirm=false`. Both client signup
paths now preflight the provider settings and reject unsafe configuration;
this safeguard does not replace correct provider configuration. The connected
browser requires Supabase login and this chat lacks local computer-use runtime.
The owner changed the setting privately; the agent verified it without reading
credentials. See [boolean-only settings evidence](research/shared-auth-public-settings-2026-11-02.json).

The website has an explicit development-only `shared-local` target for the
reviewed shared contract, requiring its own operator flag, exact Grow pin and
local runtime. It has not been enabled here; hosted production remains blocked.
Flutter now has its separate default-off shared account gateway/route; it does
not open the legacy operational shell or use legacy provisioning in that mode.

The Next.js 16 auth proxy and server-side member guards are in place. The proxy
refreshes Supabase cookies before protected-route checks; a new local validation
E2E check covers public sign-in pass-through and unauthenticated member redirects
with `no-store` responses, without an existing session or real credentials.
Website TypeScript, 148 boundary tests, the optimized production build,
and the public Chromium acceptance suite passed on the current source. This does
not verify an existing-session token refresh or a live provider journey.

Production email/password and Google access remain disabled in source until the
shared Grow permissions and cross-client account contract pass review. Recovery
is still disabled. Real confirmation delivery still needs an approved sender;
the deployed Vercel auth journey was not rechecked because the connected Vercel
tool could not access this project. Before a future enablement, verify both
`/auth/callback` and `/auth/confirm` in the Supabase redirect allow-list for the
canonical website origin, then run the genuine provider journeys. Do not use the
isolated validation project as the production account store.

Website foundation PR #19 merged into `main` at
[`f0d8ab0`](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/commit/f0d8ab0ad3084f6cc4e8727d9e07686f9105faf0). Its exact-head and merged-main Website CI, required gate and Documentation CI passed. The local acceptance suite covers the public experience and gated previews; it does not establish production account access.

The isolated validation project has had an owner-completed Google/profile/declaration journey, but production member and Google access remain disabled. Public email/password confirmation and recovery delivery have not been verified with a production sender. Password recovery remains disabled pending a reviewed session-bound grant. Shared Grow production permissions and cross-client migration/acceptance remain release blockers; no production database change or hosted deployment was made. See the [deployment status](deployment.md) and [shared backend evidence](backend-readiness.md#current-evidence).

Supabase metadata rechecked on 31 October reports `grow-idealab` as `INACTIVE`
and `idealab-mec-validation` as `ACTIVE_HEALTHY` on PostgreSQL 17.11. The
validation project now has 19 recorded migrations, including the isolated
Issue #18 project-create changes; it is not a fresh zero-migration baseline.
The inactive Grow project's current migration list could not be read because
the request timed out. Its last successful schema inventory is dated 23 October.
The six local Issue #18 candidate files are not byte-identical to their stored
validation statements. See the [migration ledger audit](quality/validation-migration-ledger-audit-2026-10-31.md).

The dated evidence table below records scoped checks and database state as of 23 October 2026. Its older GitHub/deployment row is superseded by this current status.

Full requested user/staff release: see the [current requirement-by-requirement
audit](release-readiness-2026-10-23.md). Scoped implementation/checks below do
not establish production completion.

Historical 29 October Grow follow-up: the sibling mobile checkout contained a default-off,
validation-only profile writer for the shared save RPC. It binds requests to a
verified account token, limits its payload to the six profile fields, closes its
transport on timeout, and treats lost responses or session changes as uncertain.
Seven focused reader/writer Flutter tests and scoped analysis passed, including a
mocked request through the installed Supabase SDK. Since then, the validation
account adapter has been wired into its gated onboarding path, still default-off
and pinned to the isolated project. Fresh 2 November review confirms the default
Grow route still stores the entered draft locally and directly sets
`profile_completed`. Replace that legacy path with the shared server API before
activation; neither isolated wiring nor those mocked checks establish production
or cross-client acceptance.

Profile-save and MEC declaration forms now compare their rendered account ID
with the freshly verified session before making profile RPCs. Helper tests cover
stale, missing, duplicate and malformed IDs; a real account-switch action test
is still required. Separately, the current password-update action verifies a user
but does not bind the update to a recovery-specific session. Website recovery is
now disabled in all environments until a reviewed session-bound recovery grant and
replay/concurrency tests are implemented. The public browser suite passed with
the recovery forms disabled and the callback returning 404; this is not a live
email or recovery acceptance test. This finding requires an existing
authenticated session; it is not an unauthenticated takeover finding.
The proposed trust boundaries and acceptance cases are recorded in the
[recovery session contract](recovery-session-contract.md).

The authenticated sign-out forms also compare the rendered account to a freshly
verified user before signing out, preventing an old tab from ending a different
account's browser session. This is a local consistency check; live two-account
sign-out and recovery cleanup acceptance remain unverified.

The current local public/preview browser suite passed after shortening the
signup helper text to restore the no-scroll layout. It covers public and gated
preview journeys, not live authentication or operational backend acceptance.

Authentication actions and callbacks now request strict cookie writes: a write
exception becomes a sanitized failure instead of being silently ignored. Normal
server rendering retains the read-only fallback. Local profile, lab, visit,
project and request server actions also request strict writes. Unit checks cover the adapter,
including partial writes. Tests also exercise the installed Supabase SDK's
password sign-in and PKCE exchange with synthetic responses and a failing cookie
writer; no live provider or browser is involved. These do not prove real email
confirmation and recovery. A provider mutation can precede a browser error,
so callback copy does not claim the operation was rolled back.

Signup now attempts to clear local session cookies after every provider outcome,
including a lost response, and offers a retry if cookie cleanup fails. It preserves
the confirmation PKCE verifier and signs out any existing browser session; it does
not revoke a provider-side session. Actual cookie handling and email confirmation
still require an end-to-end test, and email confirmation must remain enabled.

Historical evidence checkpoint: 23 October 2026. This supersedes older implementation-status
paragraphs claiming signup, confirmation, profile-save or claim controls are absent.
It does not supersede product requirements or authorize production activation.

| Scope | State at this checkpoint | Evidence and remaining gate |
| --- | --- | --- |
| Auth completion cleanup and callback privacy | Source and HTTP correction verified locally | Successful confirmation no longer becomes expired solely because SDK sign-out throws; cleanup failures remain explicit. Recovery retry stays on sign-in. Actual callback headers now use no-referrer. 100 boundary tests/build and scoped HTTP checks pass; positive email/password journeys remain unverified. See [cleanup evidence](quality/auth-completion-cleanup-2026-10-23.md). |
| Backend environment isolation | Source and test gates verified | Validation URLs are pinned to the approved isolated project; test configuration accepts only `.invalid`. Production account integration is blocked in source even if the former production opt-in is set because the shared Grow account policies are unsafe. The Vercel Preview workflow also requires every member/data feature flag to be false. |
| Events programme and detail | Read dependency implemented; installed only in isolation | Guarded list/detail, status filters and safe bounded projection pass SQL and parser checks. No event fixtures retained. Browser access is restored; current authenticated Events interaction still needs a focused read/keyboard check. Registration/capacity/payment/staff remain incomplete. See [Events evidence](quality/events-read-2026-10-23.md). |
| Student request intake | Installed and enabled only for isolated validation | Guarded submit/history/cancel and anonymized retention helper pass scoped SQL checks: 65 catalog, transition suite, nine retention and six owner-isolation assertions. Browser access is restored, but no member request row was created; genuine online persistence/cancellation and overlap remain unverified. See [current evidence](quality/work-request-intake-2026-10-23.md). |
| Projects core | Implemented locally; guarded contract installed only in isolation | Creator membership, project edits, code rotation and bounded discovery pass scoped SQL checks. Browser checks and remaining second-account/concurrency gates are recorded in [Projects evidence](quality/projects-core-2026-10-22.md). No extra display-name field; isolated projections omit profile fields, while shared Grow privacy remains unresolved. |
| Public website and responsive account presentation | Implemented locally | Latest Node 24 run passed lint, TypeScript, all 100 boundary tests, optimized production build and public/auth browser acceptance. Authenticated Home/Lab/Profile rendered at 320/390/768/1366 without horizontal overflow. Genuine email/password and operational write journeys remain separate. See [current browser check](quality/member-pages-browser-2026-10-23.md). |
| Isolated identity baseline | Installed in `idealab-mec-validation` only | Reviewed provisioning, owner read, save, admission and claim functions; anonymous access denied and private schema unexposed. See [installation evidence](research/isolated-account-baseline-2026-10-22.json). |
| Google authentication | Genuine isolated login passed | After owner corrected the OAuth credentials, Google returned through the server callback to authenticated onboarding. One verified Auth identity and its linked active `student` profile were created. See [positive evidence](research/google-account-positive-2026-10-22.json). |
| Email/password signup, confirmation and recovery | Server actions, callbacks and forms implemented | Input/configuration/negative boundaries pass; genuine email delivery, private password entry, confirmation, password login and reset remain unverified. Google success does not prove these journeys. |
| Production email sender | Setup and delivery not verified | Supabase's development sender does not establish production public signup. An official configured SMTP provider/sender and actual confirmation/recovery delivery are required; no production SMTP settings were re-read in this checkpoint. |
| Profile wizard | Implemented and checked | Four steps, Back/Next, review/final submit, keyboard/error focus, 24 theme/viewport combinations and no premature submission after the event fix. See [wizard evidence](research/onboarding-wizard-2026-10-22.json). |
| Real personal profile and MEC admission | Genuine isolated journey passed | Owner completed the declaration after the deferred-trigger correction. Browser reached `/app`; aggregate database checks show one verified account, one complete active profile, one current claim and zero pending claims. Admitted `/account-access` redirects to `/app`. Unchecked update remains rejected with accessible field feedback. See [acceptance evidence](research/admission-positive-2026-10-22.json). |
| Second-login registration conflict | Expected uniqueness rejection verified | Current isolated metadata shows two verified complete profiles and one current claim. The second profile used the same normalized number. Eight rollback assertions verify rejection preserves the first claim and grants no second admission. LMDL prefix works; clearer generic account-reuse guidance replaces retry-only copy. See [conflict evidence](quality/second-account-claim-2026-10-22.md). |
| Confirmed email-change lifecycle | Reviewed delta installed only in isolation | A private trigger now synchronizes confirmed, nonanonymous Auth email into an existing profile without changing its authority or revision. Fifteen catalog/permission assertions pass; provider-driven email-change and collision acceptance remain unverified. See [delta evidence](research/profile-email-sync-2026-10-22.json). |
| Shared Grow production compatibility | Not cleared | A read-only production inventory on 23 October found a two-migration ledger, broad `anon`/`authenticated` grants (including `TRUNCATE`), all-row authenticated users reads and client-writable authority/completion columns; see the [shared backend readiness evidence](backend-readiness.md#current-evidence). Flutter now sends identity fields only for account provisioning, defers profile-row creation when signup requires email confirmation, and synchronizes on confirmed sign-in with an idempotent upsert. The repository profile updater checks owner identity and allows only basic fields; profile reads are self-scoped and Google no longer has a duplicate provisioning path. Full Flutter tests (183) and analysis pass. These are client safeguards: legacy onboarding screens still write `role` and/or `profile_completed` directly, and the production grants/policies remain unchanged. Coordinated migration/rollback and cross-client acceptance remain required; no production change was made. |
| Operational member/staff workflows | Planned or gated | Request lifecycle, scheduling, inventory, borrowing, events/payments and reports require their approved contracts and genuine scoped end-to-end journeys. Unavailable modules and previews are not completed services. |
| Own lab visits on Home/Lab/Visits | Genuine check-in/out and history passed in isolation | Grow-compatible lab_sessions with one-active-visit index, guarded current-open check-in, exact owned checkout after closure and retry receipts. 75 boundary tests; 22 catalog and 27 rollback transition checks. Two clearly labeled completed test visits, no active visits. Actual overlap/cross-owner and shared-client rollout remain open. See [visit-write evidence](quality/own-visit-writes-2026-10-22.md). |
| Core-controlled lab availability | Installed and genuine Open/Close passed in isolation | Explicit owner-approved test duty capability; Student role unchanged. Actor/time journal, bounded member projection, conflict/retry handling and 24 responsive observations. Opening checkpoint: 30 catalog plus 16 rollback transition assertions and 69 boundary tests. Shared rollout and real two-core/concurrency journeys remain open. See [opening evidence](quality/core-lab-opening-2026-10-22.md). |
| Request browser draft under real member session | Save/restore/reload and cleanup passed | Unsafe references rejected; known sample fields restored and review fits four widths. Exact temporary draft was deleted with owner approval after Chrome reconnected. This is not online submission. See [latest check](quality/grow-reference-account-check-2026-10-22.md). |
| GitHub and deployment | Historical 23 October state; superseded by the 31 October status above | PR #19 has since merged, but no production activation or hosted deployment is verified. |

Production and public defaults keep member and Google activation off. The ignored
local configuration enables them only against the isolated project on port 3015.
The Google OAuth secret is held by Supabase; it is absent from website source and
test artifacts. Real user details, credentials, codes and sessions are not evidence
fixtures. UI sample drafts cannot prove real student eligibility or ownership.

Next acceptance dependencies are real password/email/recovery tests, a second genuine account for
cross-owner checks, concurrency, Flutter compatibility and approved production
rollout. See [task ledger](task-list-2026-10-21.md), [architecture](architecture.md)
and [delivery plan](delivery-plan.md) for the broader scope and gates.
