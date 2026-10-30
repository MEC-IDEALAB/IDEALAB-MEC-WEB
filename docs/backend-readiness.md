# Shared backend readiness and onboarding gate

Current checkpoint: [account delivery status](account-readiness.md) supersedes
historical statements below that signup/save/claim controls are absent. Genuine
isolated Google login/provisioning passed; shared production activation is not cleared.

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


Status: production remains review-plan only. A storage-only validation candidate
has been tested and applied to the owner-approved Free validation project; it is
not a production/shared Grow migration or profile API. This does not approve a
production change or a billable branch. Account activation must remain disabled
until the compatibility, privacy and account journeys below pass.

The [shared profile contract proposal](shared-profile-contract-proposal.md) turns
this gate into a concrete mapping, state/API/permission design, rollout sequence
and 14-journey acceptance matrix. It includes a fresh [metadata-only catalog
snapshot](research/shared-profile-catalog-2026-10-21.json) and a later
[storage/security catalog recheck](research/shared-backend-followup-2026-10-21.json).
No SQL migration or application persistence is implemented by that proposal.

## Current evidence

Read-only inspection of `grow-idealab` completed on 21 October 2026. This pass
rechecked project health, PostgreSQL version, the deployed migration ledger,
table columns, RLS policies, effective table/column privileges, relevant
triggers and security advisors. The metadata query inspected catalog records
only; no user rows were read. The project is healthy on PostgreSQL 17.6.1.166.
The deployed ledger contains only `20260503073726 create_initial_schema` and
`20260503073744 add_rls_policies`; it materially differs from the tracked Grow
migration history and current Flutter auth/profile consumers.

The source-to-live comparison is now feature-level, not migration attribution.
The live ledger names do not identify the checked-in SQL files or record their
source hashes. The current catalog differs from `001_initial_schema.sql`:
live `users` uses `role` rather than `base_role`/`system_role`, and the listed
public schema does not contain `project_updates`, `inventory_items` or
`inventory_transactions`. Rich-profile tables are present, but the live
policy names/conditions cannot be mapped to `003`, `006` or `008` from the two
ledger labels. The storage catalog differs from `004_storage_buckets.sql`;
`btree_gist` exists as noted below, but that alone does not prove `005` or
`rc43_backend_authority.sql` was applied. The live notification trigger names
match those in the `rc43` candidate, but the ledger still does not attribute
their source. Keep the exact migration-by-migration reconciliation open; do
not infer an applied history from similar names or surviving objects.

A follow-up read-only metadata check confirmed Supabase organization ID
`yhhsdxbhpsyovqlvdoha` and the Free organization tier. The project still has no
development branch. After organization confirmation, the branch quote returned
$0.01344/hour; [branching also requires Pro](https://supabase.com/docs/guides/deployment).
A separate project quote returned $0 monthly. Following explicit owner approval,
`idealab-mec-validation` (`gvvqlfachzbufstzoiwi`) was created in that Free
organization in Mumbai (`ap-south-1`) and is `ACTIVE_HEALTHY`. Management metadata
reports PostgreSQL `17.11.0.003`; read-only SQL confirms 17.11, UTF8,
`en_US.UTF-8`, zero public tables and zero migrations. The [sanitized baseline](research/isolated-supabase-baseline-2026-10-21.json)
records actual metadata-only checks, not migration/account acceptance. The existing
paused `grow-security-validation` project is preserved. No paid upgrade,
production-data copy, account, application migration, Auth-setting or shared-project
change was performed. Production remains one shared identity/database authority.

A later 21 October check compared PostgreSQL/collation metadata in both projects
without reading account rows. They expose the same ICU version `153.121`. In the
isolated project only, a validation collation `idealab_private.mec_registration_ci`
was created and comparison vectors confirmed case/repeated-whitespace equality
while punctuation, internal single spaces and accents remain significant. A
temporary unique-index probe passed after applying that normalization. This does
not verify a persistent app index, Auth, RLS or application behavior. See the
[normalization probe](research/registration-normalization-2026-10-21.json).

The branch-list API returned no development branches. The fresh performance
advisor also reports eight unindexed foreign keys, 62 RLS auth-function
initplan findings, three pairs of duplicate permissive `SELECT` policies, and
21 indexes with no recorded use. These require workload-aware cleanup after
the authorization design is corrected; an unused-index notice alone is not a
safe instruction to drop an index.

The live `public.users` table has 19 columns, including `role`, `is_active`,
`profile_completed`, `name`, `phone` and `college_roll`. It lacks the approved
`institution`, `department` and current `study_year` fields. `college_roll` has
a raw global unique constraint. The earlier multi-institution, institution-scoped
rule is superseded by the MEC-only pilot: one normalized MEC registration claim
must be unique regardless of case or repeated/surrounding spaces. The existing
constraint does not enforce that normalization or prove ownership of the first
claim.
The database also has `user_profiles.department` and
`user_education.institution`, but neither is an approved substitute for the
six-field private onboarding contract; `user_education.end_year` represents a
graduation/batch year, not current study year.

The fresh catalog read confirms `users_read_all` grants authenticated SELECT
with an unconditional `true` predicate. This exposes all selected `users`
columns—including email, phone, college roll, FCM token, active/ban status and
profile completion—to any authenticated account. `users_update_own` filters by
owner but does not restrict which columns the owner may update. Effective
privileges for both `anon` and `authenticated` include SELECT, UPDATE, DELETE
and TRUNCATE on `public.users`; effective column privileges allow both roles
to update `role`, `is_active` and `profile_completed`. Since the live role
constraint accepts `super_admin` and `users_insert_own` checks only the caller's
row ID, an authenticated user can self-promote an existing row to `super_admin`
or provide that role when inserting their own missing row. This is a confirmed
privilege-escalation path from the catalog rules; no exploit or user-row query
was performed. RLS does not constrain TRUNCATE; the direct REST/API exposure of
that privilege was not tested, so treat it as an excessive grant to remove.
Broad grants also exist on `user_profiles` and `user_education`.

`user_profiles` has a row-level SELECT policy allowing `is_public = true` or
the owner. Its `show_email`, `show_phone` and `show_stats` flags are ordinary
columns; the policy does not apply them as per-column access controls.
`user_education` has owner-scoped row policies, but its API roles also have
broad table privileges, including TRUNCATE. No trigger exists on `auth.users`
or `public.users`; the only triggers on these profile tables update timestamps
on `user_profiles` and `user_education`.

Website source code defaults member and Google activation off and requires
explicit flags; deployed flag values were not inspected. Auth provider and
callback configuration could not be re-read and remain unverified.

The current source now checks Supabase Auth's server-returned
`email_confirmed_at` before it queries the signed-in profile row. An unconfirmed
session receives a separate verification-required state. This closes the
source-level email-confirmation gap but does not establish completed onboarding:
the six-field profile mapping, trusted provisioning, and safe field-level RLS
remain unresolved. The member activation flag remains off by default.

Security advisors report mutable search paths on `get_user_role` and
`set_updated_at`, public execution of the SECURITY DEFINER `get_user_role`,
disabled leaked-password protection, and `btree_gist` installed in `public`.
No user rows were read, no exploit was attempted, no identity was created, and
no database or permission was changed.

A second read-only catalog check at 08:39 UTC reconfirmed the two-migration
ledger, public policies, effective grants on the selected account/operations
tables and security-advisor findings. It also found four storage buckets:
`events`, `inventory`, `profiles` and `projects`; each is marked public and has
PNG/JPEG/WebP MIME restrictions, with 5 MiB limits for `events`/`profiles` and
10 MiB for `inventory`/`projects`. The only `storage.objects` policies refer
to bucket ID `avatars`, which is not in that bucket list. This is a metadata
observation only: no objects, signed/public URLs or upload/delete requests were
inspected or sent, so effective access through the Storage API remains
unverified. Preserve the catalog mismatch as a separate storage gate; do not
rename buckets or apply the historical Storage migrations to production.

An independent read-only review of the same live authorization metadata found
two additional authority paths that must be reconciled before exposing the
respective modules. `project_members` permits an authenticated user to insert
their own membership with a client-selected `admin`, `lead` or `mentor` role;
the policy checks the user ID but not an authorized project owner or allowed
role. `knowledge_articles` permits an author to set `is_approved=true` on their
own insert, while approved articles are visible to authenticated users. These
are policy/grant conclusions from metadata, not exploit attempts. No content
or account rows were read, and no API mutation was sent. Fix each with a
trusted ownership/moderation path and negative authorization tests before
enabling project membership or knowledge publication.

The current website branch also implements only a gated recovery slice:
email requests have a generic response, the recovery callback uses a fixed
configured origin and PKCE code exchange, and password updates require a
server-verified session. Source-level configuration and local browser checks
do not establish provider redirect allowlisting, email delivery, a successful
recovery exchange or a shared account's password update. No live Auth request
or recovery email was sent. Keep the website member flag disabled.

## Required shared contract

Signup and onboarding preserve one production Supabase Auth identity across web
and Flutter. The authorized isolated validation project serves non-production
acceptance only. New accounts receive an ordinary Student role through trusted
provisioning, but verified email, active state and profile completion do not prove
MEC admission. The [MEC-only pilot](mec-pilot-admission.md) applies to both clients.

Six required profile values remain name, phone, registration number, department,
current study year 1–8 and institution. Phone entry requires `+country-code`; the
pilot institution is canonical MEC. Compare registration claims without case or
repeated/surrounding-space differences, preserving display text and preventing
alias-based duplicates. Supplied `MDL24CS219` and `LMDL` examples do not establish
complete format coverage or ownership. The owner approved a separate MEC student
self-declaration for the pilot and no college-record check. A unique claim limits
duplicate claims but cannot prove the first claimant owns the number; this is an
accepted pilot assurance limit, not a verification result.

This creates a false-first-claim recovery risk: a legitimate student can be blocked
by another account's self-declaration. The current decision authorizes neither ID
collection nor a college-roster check and does not specify who may transfer a
claim. No automatic or self-service transfer is permitted. Approve a private
recovery procedure and authoritative evidence source before production signup
is activated. Until then, support cannot reassign a claim solely on a competing
self-declaration, and a legitimate student may have no approved remedy if their
number was falsely claimed.

Self-edit and required-field privacy are approved; changing a registration number
needs a reviewed atomic claim transition, not automatic renewed admission. Neither
signup metadata nor profile forms can assign roles, active/completion/eligibility
authority or head positions. Preserve staff roles/access paths and inactive
states. Cross-user views use generic member labels until narrower disclosure is
approved. The owner accepted limited claim-occupancy inference with generic errors
and enforceable save limits, not disclosure of any other profile information.

The existing-row mapping and trusted provisioning/write path are proposed in
the linked contract, not approved or implemented. The `users`/`user_profiles`
split, separate admission state and existing direct Flutter inserts must be
reconciled without adding a second production profile authority. The final
policy must reject direct client writes to role, active status, completion,
eligibility and head assignments, regardless of which UI is used.

## Cross-client document drift found during the Grow source review

A read-only review of the Grow checkout on 21 October 2026 (then at
`F:\kannan\projects\Grow`, now at `F:\kannan\projects\IDEALAB\Grow`) found that several current web decisions have not been reconciled
across the Grow documentation set. The Grow checkout contains extensive
uncommitted changes; those files were inspected but not edited. Resolve and
commit the cross-client contract before either app enables live account or
operational writes.

- `docs/01_Product/AUTH_IDENTITY_POLICY.md:13` still says student eligibility
  beyond verified email needs a future owner decision. The latest owner decision
  restricts students to MEC in both clients, superseding earlier unrestricted
  admission. The owner approved self-declared eligibility for the pilot without
  roster verification; per-module eligibility remains unresolved.
- `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md:12-15,86-93` still
  describes the older three-field minimum (name, optional phone and optional
  roll number) and broad public-profile wording. The current web contract
  requires six private fields, canonical MEC pilot institution and one normalized
  MEC registration claim independent of display aliases.
- `docs/03_Database/ROLE_AND_POSITION_CONTRACT.md:59-63` still leaves
  assignment scope open. The current V1 web decision is machine/room-scoped
  heads, with Super Admin-only assignment, revocation and active-work handover;
  the detailed roster/actions/handover rules remain open.
- `docs/02_Product/WORK_REQUEST_CONTRACT_DELTA.md:129-133` still calls
  preferred-time and requester-visible scheduling semantics unresolved. The
  current web decision is provisional preferred time, head confirmation,
  requester acceptance of changed time, and another proposal after decline
  without automatic expiry. Capacity and conflict effects remain open.
- Clean `docs/01_Product/06_WORK_REQUEST_IMPLEMENTATION_CONTRACT.md:3,13,66-72,136-163`
  still labels a fabrication-only plan “Approved,” exposes queue position and
  completion estimates to students, cascades parent cancellation to
  manufacturing tasks, and defines a 50% deposit plus 50% balance. These
  directly conflict with the current web requirements. The newer Grow request
  notes are uncommitted and do not by themselves reconcile this clean contract.
- `docs/03_Database/BACKEND_SECURITY_BASELINE.md:47` says the live Supabase
  project was hibernated and not queried; the connected tool successfully
  returned read-only project, schema, migration and advisor metadata on 21
  October. Refresh that source status before it is reused as current evidence.

The website requirements record the latest owner decisions but do not
automatically replace or deploy the shared Flutter/database contracts. Keep
member activation and operational writes disabled until the document owners
reconcile the conflicting rules, code consumers and live schema.

## Safe delivery sequence

1. Reconcile each tracked Grow migration against the live schema, policies,
grants, triggers and migration ledger. Do not replay the repository migration
chain against this project.
2. Review the proposed existing-row mapping, canonical MEC claim boundary,
self-declaration recording and technical normalization/save-limit design.
Supplied registration-number prefixes are examples, not an exhaustive format
catalogue; the bounded input policy does not verify against college records.
Reconcile existing incomplete accounts and claims without guessing institutional
affiliation; preserve display text and required-field privacy.
3. Replace Flutter's direct profile creation, arbitrary update maps,
client-selected role and client-written completion state with the reviewed
shared contract. Review full-row profile helpers such as `getUserProfile`
and make them self-only or remove them if unused. Keep the existing mobile
files unchanged until their owner has reviewed the coordinated change.
4. Deliver the owner-approved coordinated Flutter update before activation,
with a versioned cutover and tested recovery procedure. Existing clients still
insert `public.users` after email/Google authentication.
A new Auth trigger can create the row first, causing those clients' separate
insert to fail; an idempotent trigger alone does not fix that race. Preserve
existing `lab_admin` and `super_admin` roles during profile repair or
backfill; `student` defaults apply only to new accounts.
5. Prepare one expand-first migration and a data-preserving recovery plan.
Preserve existing accounts and the current global unique constraint until
existing rows and the new normalized uniqueness rule have been checked in a
safe environment. Do not guess institutions or silently reclassify records.
6. Add least-privilege table/column grants and RLS. Audit `user_profiles`,
`user_education` and other legacy profile tables too; tightening `users` alone
may leave old profile data visible. Keep profile reads owner
only by default, make onboarding completion a trusted server/database result,
and make provisioning idempotent across email and Google creation. Fix
function search paths and execution grants as part of the reviewed security
scope.
7. The website's `requireMember` gate now checks Supabase's server-confirmed
   email timestamp before profile lookup. Extend it to require all six
   server-loaded profile fields, the owner's MEC self-declaration and one unique
   claim after the shared mapping/claim contract is approved. Preserve trusted
   staff access. Run
forward migration, compatibility, rollback/recovery and negative
authorization tests in a production-faithful non-production database. Verify
email verification, Google and email account convergence, existing accounts,
all six fields, cross-user privacy, role/status/eligibility denial, concurrent
MEC claims, recorded self-declaration, enforced save limits and both-client flows.
8. Obtain independent migration/security review and explicit approval for the
specific shared-project change. Only after the reviewed change is applied and
verified may web signup/onboarding be enabled. No V1 operational module may
claim persistence without its own approved API, permission matrix and
end-to-end acceptance journey.

There is no Supabase development branch. The owner-approved isolated Free
project is available for non-production test implementation; its creation does
not authorize a paid upgrade, branch or shared migration/Auth/data change.

## Decisions and evidence still required

A separate [native SQL runtime smoke check](database-validation.md) now passes
using the already installed PostgreSQL 16.1 binaries and a fresh owned cluster.
It verifies loopback identity, wrong-credential denial, transaction rollback and
cleanup without touching the existing service or shared project. This is not
the PostgreSQL 17.6/Supabase Auth/Data API acceptance environment required above;
no application schema, provisioning, RLS or migration has been tested by it.

- Follow-up independent technical/security review of the specified claim
  transition and rolling attempt limit. The first review returned actionable
  gaps; the revision now defines pending reservations, old-claim preservation,
  exact retry behavior, timestamp pruning, and the fifth/sixth attempt boundary.
  The [model-level temporary SQL fixture](research/registration-claim-fixture.sql)
  passed in the approved Free project and rolled back; it does not exercise the
  proposed RPC or concurrent sessions.
  The owner approved the generic-error/limited-attempt approach but not the exact
  five-per-15-minute threshold; that value remains a proposal requiring approval
  before production signup.
  Read-only test-project probes also covered composed/decomposed accents,
  non-breaking space, Latin/Greek lookalikes and sharp-s variants. These are
  design evidence only; the actual RPC still requires database tests. Country-code
  entry, case/space comparison and self-declared MEC eligibility are settled; the
  supplied prefixes remain non-exhaustive examples.
- How existing users supply institution and current study year, and how
  existing roll values are checked under approved case/space normalization
  before any reviewed replacement of raw global uniqueness. Preserve the
  existing constraint until cutover; the canonical MEC pilot does not broaden
  this rule to multiple institutions.
- Which terms, privacy notice and lab rules are shown and versioned at account
  creation/onboarding.
- Exact email confirmation, Google callback and existing-account behavior in
  Supabase Auth; metadata inspection is not a successful login test.
- Reviewed test schema and real Auth/Data API/both-client acceptance in the
  now-available isolated Free project, including the 17.11-versus-shared-17.6
  version difference; production rollback and data-recovery ownership.
- An approved private support recovery procedure and authoritative evidence source
  for a false first claim before production signup is activated. The current pilot
  explicitly lacks independent ownership verification and claim transfer.
- A real test-account path in the isolated project. The connected Supabase tool
  catalog currently exposes SQL, migrations and project management, but no Auth
  user-creation or account-testing operation. No synthetic Auth row should be
  inserted directly into `auth.users`; email must not be sent to an arbitrary
  address to manufacture a test identity.
- Supported Flutter build, versioned cutover and recovery evidence for the
  approved coordinated update; unsafe direct writers must not remain enabled.
- A review of legacy profile visibility and the current web `requireMember`
  check before any authenticated route is enabled.
- Whether an assigned Machine/Room Head needs a requester's name to review a
  request. Until decided, required onboarding fields remain private.

## Acceptance matrix

| Actor / operation | Expected result |
| --- | --- |
| Anonymous visitor reads a member profile | Denied; public pages use curated editorial content only. |
| Student reads or edits their own required fields | Allowed for approved columns only; profile remains private. |
| Student reads or updates another account | Denied. |
| Student changes role, active state, profile completion or staff position | Denied at the database boundary. |
| Client directly inserts an authority-bearing profile row | Denied; trusted provisioning creates the compatibility Student role. |
| Same MEC number with case/space or institution-label variations | One canonical claim; duplicate/concurrent claims rejected atomically with generic errors and enforced save limits. |
| MEC student self-declaration and unique claim | Pilot admission may rely on the declaration and a unique claim; it is not independently checked against college records. Reject unsupported formats only under the format policy once approved. |
| Unverified email reaches the signed-in workspace | Denied; a verified new account enters resumable onboarding. |
| Existing incomplete Student account signs in | Complete six-field profile, MEC self-declaration and one unique claim before Home; retain prior values and identity. |
| Complete Student profile has no accepted MEC claim | No student workspace access; completion is not eligibility. |
| Existing staff or inactive account signs in | Preserve trusted staff access and inactive restrictions; do not reclassify from registration format. |
| Email and Google accounts represent the same email identity | Existing-account behavior is explicitly tested; no duplicate profile or role elevation. |

This gate is tracked in [issue #4](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/4)
and the account acceptance work in [issue #5](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/5).
The current user-facing preview is documented in
[onboarding requirements](onboarding-requirements.md); it does not persist
data or satisfy this matrix.

## Supabase references

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Auth server-side integration](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Auth trigger guidance](https://supabase.com/docs/guides/auth/managing-user-data#using-triggers)

## Validation-only claim storage and pending guard — 21 October 2026

The isolated `idealab-mec-validation` project passed a fresh preflight as
PostgreSQL 17.11, `postgres` migration role, empty application namespaces,
expected Supabase API roles and a current `idealab_private.mec_registration_ci`
collation (`und-u-ks-level2`, ICU `153.121`). No production rows or schema were
accessed for this change. The validation source lives at
[`supabase/validation/20261021120000_mec_claim_storage_validation.sql`](../supabase/validation/20261021120000_mec_claim_storage_validation.sql),
outside the deployable `supabase/migrations/` directory.

The storage source was first applied together with its 21-test pgTAP suite
inside a transaction; `finish(true)` passed and the transaction was rolled
back. Those assertions verify catalog metadata, normalization behavior and a
temporary-table unique-collision probe; the persistent claims table was not
populated because no Auth identity was created. The candidate was then applied
only to project `gvvqlfachzbufstzoiwi`; Supabase recorded
`20261021120000_mec_claim_storage_validation` at ledger version `20261021110522`.

A follow-up validation-only migration,
[`20261021130000_mec_pending_claim_commit_guard.sql`](../supabase/validation/20261021130000_mec_pending_claim_commit_guard.sql),
adds a private, initially deferred constraint trigger. It rejects a claim that
is still pending when its deferred check runs and permits a pending claim that
has been resolved to current in the same transaction. The migration is not in
`supabase/migrations/` and is not a production rollout artifact.

Historical qualification: the original invoker guard and five temporary-probe
tests below did not cover the authenticated deferred execution context. A real
declaration later failed with `42501`. The [reviewed privilege correction](research/pending-guard-privilege-fix-2026-10-22.json)
is now installed only in isolation; the current test file contains thirteen
boundary assertions and rejects arbitrary trigger attachments. A genuine
successful claim/commit retry remains pending. The following five-test results
describe only the earlier postgres-run temporary probe.

The original five-assertion pgTAP suite,
[`mec_pending_claim_commit_guard.test.sql`](../supabase/tests/database/mec_pending_claim_commit_guard.test.sql),
passed with `finish(true)` both in a rollback-only preflight and after the
migration was installed. The behavior checks use a temporary probe table and
force the initially deferred constraint with `SET CONSTRAINTS ... IMMEDIATE`;
the suite does not observe a real outer `COMMIT` rejection against a persistent
claim row. A catalog check verified the persistent trigger is initially
deferred. The test transaction was rolled back.

Post-apply catalog reads confirmed RLS enabled and forced, zero policies, no
`anon`/`authenticated`/`service_role` schema usage, table privileges, or helper
execution, and no public application relations. The guard function is
`SECURITY INVOKER`, has an empty `search_path`, and cannot be executed by those
three API roles. No claim rows or persistent pgTAP extension remain. The
security advisor's single `rls_enabled_no_policy` INFO finding reflects this
intentionally private table; no PostgREST request or role-level API journey was
run. The performance advisor returned no findings.

The validation schema now contains private storage, unique indexes, a normalizer
and the deferred pending-claim guard. It still has no claim RPC or profile
writer. No Auth provisioning, real-user or Google sign-in, PostgREST/RLS role
journey, Flutter/web acceptance, concurrency, collision throttling or
production rollout has been tested. The actual COMMIT path against a persistent
claim row also remains unverified. The validation table's direct input limits
remain incomplete by design while no API roles can access it. Keep the exact
five-per-15-minute threshold unapproved and member activation disabled. The
[sanitized test evidence](research/validation-storage-slice-2026-10-21.json)
records the verified boundary and remaining gates.


## Account-access follow-up

A metadata-only recheck still finds `users_read_all` with an unconditional `true` SELECT predicate, alongside own-ID insert and update policies. No account rows were read. The isolated project public Auth settings endpoint responds successfully: email signup is enabled, email confirmation is required and Google is disabled. The project owner supplied a permitted test inbox for live email confirmation/recovery; the address is deliberately omitted from this document. No signup or recovery message has been sent and no Auth identity was created in this follow-up. The dashboard browser is signed out; the connected plugin does not expose callback/provider-setting updates, so callback configuration and Google setup remain pending private dashboard sign-in. A local validation-only verified-email predicate candidate is being prepared separately; it is not a production profile API or activation.


The needed validation project subsequently opened successfully in the existing signed-in Chrome session. Its Auth URL configuration currently has Site URL `http://localhost:3000` and no additional redirect URLs. These are read-only observations: no values were changed. The earlier in-app dashboard tab was signed out. New metadata also confirms `auth.users` has RLS enabled (`relrowsecurity=true`, `relforcerowsecurity=false`), so the local identity-reader candidate intentionally refuses the actual current target; an Auth-reader permission-chain revision is required before it can be run. The candidate and its 28-assertion pgTAP source passed static checks and independent ACL review after inherited-schema privilege checks were added. PostgreSQL parsing, pgTAP runtime and live Auth success were not run.


## Verified-email helper rollback validation — 22 October 2026

The previously blocked custom-owner design was tested only inside rollback
transactions against `idealab-mec-validation`. The first probe caught function
ownership/grant ordering; the second caught missing Auth-schema usage. A
metadata recheck explains the latter: the managed `auth` schema grants `postgres`
USAGE without grant option, so it cannot pass that schema access to a new role.
Both failed probes rolled back, with absence of the new role/helper verified.

The current [candidate](../supabase/validation/mec_profile_api_candidate.sql)
instead uses a fixed zero-argument boolean helper owned by the existing
privileged `postgres` role. This is explicitly a privileged definer boundary,
not a least-privileged custom owner. It binds to `auth.uid()`, reads only the
current caller's confirmed non-anonymous email state, uses an empty search path,
and grants only authenticated execution. It creates no Auth role, policy,
identity, profile writer or admission rule. Independent static security review
found no additional blocker for the rollback-only probe. Future private
functions still need their own transactional execution-grant review.

The actual dashboard exposed-schema list was checked read-only: `public` and
`graphql_public` are selected; `idealab_private` is excluded. API settings were
not changed. The [structural/negative pgTAP suite](../supabase/tests/database/mec_profile_api_candidate.test.sql)
then executed **21 planned / 21 run / 0 failed** assertions, with `finish(true)`,
inside a transaction that was rolled back. This includes actual anon and
service-role helper-call denials, no-identity rejection, spoofed-metadata
rejection, catalog/ACL checks and the closed claim-table boundary. Post-rollback
metadata confirms no helper, custom reader role or pgTAP extension remains, and
none of the three API roles has private-schema USAGE. No production change was
made. See [sanitized evidence](research/verified-email-helper-rollback-2026-10-22.json).

The separate [verified-row acceptance source](../supabase/tests/database/mec_verified_identity_acceptance.test.sql)
is **unexecuted** and requires a real, owner-approved confirmed Auth account.
Its SQL claim instrumentation would still not prove signed-JWT or Data API
integration. Real verified/unverified/anonymous/deleted identity transitions,
email delivery, recovery, Google convergence, profile provisioning, claim
concurrency/throttling, and Flutter/web account journeys remain incomplete.
Keep account activation disabled. The current candidate has not been installed.


## Isolated profile read/provisioning rollback validation — 22 October 2026

The new [profile read/provisioning candidate](../supabase/validation/mec_profile_read_provisioning_candidate.sql)
was independently reviewed, then executed with the verified-email helper inside
one rollback-only transaction in the approved isolated project. A fresh catalog
preflight confirmed PostgreSQL 17.11, the existing maintenance role's managed
Auth TRIGGER and ID REFERENCES privileges, no existing non-internal Auth
triggers, and an empty public application schema.

The candidate reproduces the observed nineteen profile columns/defaults and six
non-club constraints, adds institution/department/study-year/version/revision,
and preserves the raw roll-number uniqueness constraint. It deliberately omits
the club foreign key and all operational dependencies; this is not complete
shared-schema or migration parity. Forced RLS and column grants permit only
verified current-owner reads of the twelve-field profile projection. No API
role has direct writes or access to excluded profile columns. The read RPC is
SECURITY INVOKER and does not return or establish MEC admission.

The private provisioning trigger creates a Student/active/incomplete row for a
new non-anonymous email identity or an anonymous-to-email conversion, ignores
editable authority metadata and never overwrites an existing ID. This describes
reviewed code, **not proven genuine-account trigger behavior**. No Auth account
was created, converted, altered or deleted. Existing identities were not
backfilled.

The initial 32 assertions passed. After adding exact catalog comparisons, the
current [suite](../supabase/tests/database/mec_profile_read_provisioning_candidate.test.sql)
executed **35 planned / 35 run / 0 failed** assertions with `finish(true)`.
Coverage includes exact legacy column metadata and retained constraints, added
checks, RLS/trigger catalog shape, the column allowlist, and actual SQL denials
for excluded reads, client insert/update/delete/truncate and anonymous/service
RPC calls. No owner/cross-owner fixture or signed JWT was fabricated. The
transaction rolled back. Fresh metadata confirms no profile table, read RPC,
provisioner, helper or pgTAP extension remains; Auth has zero non-internal
triggers and the three API roles still lack private-schema USAGE. Nothing was
installed or changed on the shared project. See [sanitized evidence](research/profile-read-provisioning-rollback-2026-10-22.json).

At the initial projection review, the web guard still used a three-column
active-only lookup. The subsequent admission-aware gate below replaces that
lookup; a new active but incomplete profile no longer opens the workspace.
The complete read/admission contract still needs genuine-account acceptance.
The updated identity guard independently rejects anonymous/missing-email identities
before any profile lookup; its 29-boundary-test source, lint, TypeScript,
optimized build and public/configuration browser regression pass locally.
Real account provisioning, confirmation, conversion, idempotency, staff/inactive
preservation, own/cross-owner Data API reads, save/claim operations, concurrent
claims, Flutter rollout and live account journeys remain incomplete. Keep
member activation off and both SQL candidates uninstalled.


## Admission-aware read and web gate — 22 October 2026

The new [admission read candidate](../supabase/validation/mec_profile_admission_read_candidate.sql)
extends only the prior same-transaction empty profile projection. Its private
caller-only boolean requires verified non-anonymous Auth, active Student role,
complete version-1 six-field profile, and that owner's matching current
version-1 self-attestation claim. It does not verify registration ownership or
grant staff/operational powers. The public invoker read now returns thirteen
fields, including `mec_admitted` and decimal-text revision. Existing twelve-field
consumers are not compatible with this final-client candidate until updated.

Independent review found a concrete false-completion edge: default PostgreSQL
`btrim` would accept NBSP-only name/department. The corrected checks trim POSIX
outer whitespace without collapsing internal text; phone validation also rejects
control characters. The [current test suite](../supabase/tests/database/mec_profile_admission_read_candidate.test.sql)
passed **23 planned / 23 run / 0 failed** assertions with `finish(true)` inside a
rollback transaction. This covers metadata/ACLs, actual SQL role denials,
missing-identity/spoofed-metadata rejection and expression-level whitespace/phone
vectors. It does not execute a genuine account/profile/claim positive. The
transaction rolled back, and metadata confirms no profile/read/admission/email
helper/provisioning objects, non-internal Auth triggers, pgTAP or API private
schema usage remain. See [sanitized evidence](research/admission-read-rollback-2026-10-22.json).

The web account loader now consumes the exact owner-bound thirteen-field response.
Version-0/invalid incomplete Students remain incomplete; a complete Student with
no backend admission remains admission-required; trusted active staff keep their
separate path. Inactive, unverified and malformed/unavailable responses cannot
open the workspace. `requireMember` redirects non-ready accounts outside the
operational layout, and workspace page callers also enforce it. A private,
noindex `/account-access` page presents distinct status guidance. The subsequent local profile-save integration is recorded below; declaration/
claim writes remain unavailable. The subsequent local profile-save integration is recorded below. No raw table-read fallback exists.

Node 24 lint/TypeScript, **38 boundary tests**, optimized production build and full
public/configuration browser regression passed. Browser coverage includes
unauthenticated denial/private no-store headers on the new status route; it does
not impersonate a session to render successful account states. Independent source
review found no bypass/redirect loop; its own attempted tests used unsupported
Node 20 and did not execute, so runtime evidence is the main agent's Node 24 run.
Real profile saves/claims, email signup/confirmation/resend, Google convergence,
Data API admission and Flutter/web acceptance remain incomplete. All database
candidates are uninstalled and member activation remains disabled.


## Profile save candidate — 22 October 2026

The local profile-save SQL candidate adds an exact six-field validator and an
owner-only revision-checked writer. It locks the current caller's profile row,
checks current verified identity and active status, and derives completion and
contract version from the validated fields. Clients cannot supply roles,
activation, completion or admission authority. Revisions remain decimal text.
Changing an existing claimed number requires a separate claim transition.
The retained raw roll unique constraint still applies before normalized claims;
a profile save alone does not establish student admission.

The isolated rollback suite passed **44 planned / 44 run / 0 failed** assertions.
A fresh catalog query confirms the candidate profile/collision tables and
read/save/helper routines are absent, no non-internal Auth triggers or pgTAP
remain, and API roles have no private-schema usage. See the
[sanitized save evidence](research/profile-save-rollback-2026-10-22.json).
The owner approved the five-collision/15-minute limit on 22 October 2026.
Real concurrent-account testing remains required before rollout.

The local web form now calls the authenticated Server Action, sends only six
profile fields plus expected revision, preserves drafts on failure, and offers
explicit reload after a conflict or uncertain save response. A successful RPC
response triggers server revalidation; it never grants admission from client
state. Incomplete owners use the private account-access page, while admitted
Students edit on their profile page. Staff editing is still deferred.
Independent review found no owner/authority bypass; misleading reservation copy
and the uncertain-save reload affordance were corrected. Forty-five boundary
tests, ESLint and TypeScript pass. Real account rendering, committed persistence,
concurrent edits, claims and Flutter compatibility remain unverified. No candidate
was installed, no shared production schema changed, and activation stays off.

A read-only aggregate of the shared profile table found six profiles, all active,
two trusted staff-role rows, four legacy completion flags, four missing phones,
and four missing registration values; no names were missing. These are separate
marginal counts and do not establish which completion flags overlap missing
fields. No individual profile values or identifiers were exported. Preserve
existing accounts and staff authority; do not infer or silently backfill values.

The final profile-save recovery-affordance revision also passed ESLint, TypeScript,
optimized build and the full public/configuration Chromium regression. These
checks still do not establish live account persistence.


## Email account integration — 22 October 2026 (in progress)

The local source now contains password signup, strict credential input, a separate
PKCE email-confirmation callback independent of Google, and generic resend
confirmation feedback. Signup sends no role/profile authority metadata. The
confirmation callback clears its temporary local session before intentional sign-in.
Account-entry pages and callbacks use private no-store responses. Callback parsing
rejects duplicate codes, malformed flow IDs and external return destinations;
Google/recovery use the same parser. The signup/signin card now keeps its URL in
sync, including browser history and refresh. Signup uses an eight-character minimum;
existing short passwords may still sign in, while password replacement uses the
new minimum. No password or email address is stored in URLs or source.

A real production browser run found signup overflow at 1366×768. Shortened
secondary copy and spacing corrected it; five desktop/phone baseline sizes in both
themes pass the focused browser check, and short-height scrolling remains available.
The corrected optimized-build public/configuration browser regression passed,
including enabled email forms, Google-off signup, private responses, malformed
confirmation rejection, and signup-card URL/refresh continuity. Fifty-two
boundary tests, ESLint, TypeScript and optimized build pass. Independent review
found two low-severity edges (C1 controls and SDK sign-out failure); both were fixed.

The dashboard browser currently reports local browser use disabled in Work
settings. Auth callback configuration, real email confirmation/resend/recovery,
Google setup, session cookies and committed profile/admission persistence remain
unverified. Supabase's built-in email sender supports team-address tests only and
is not a production public-signup sender; custom SMTP is required. No account was
created or test email sent by this slice; no production setting/schema was changed.
The member/Google activation flags remain off.


The local registration-claim candidate now records explicit self-declaration,
locks the same owner profile row as saves, and atomically reserves/replaces the
normalized claim with profile display/revision updates. Exact idempotent retries
write nothing; failed raw-unique collisions (including display-only edits) share
the approved five-per-15-minute counter. A raw 4096-code-point resource bound
precedes normalization; the normalized number remains capped at 64 characters.
Only MDL/LMDL prefixes are confirmed; no exhaustive official format is invented.
Independent review and **28 planned/run, zero failed** rollback-only assertions
passed. Fresh absence/ACL checks confirm rollback and zero isolated Auth accounts.
See [claim evidence](research/registration-claim-rollback-2026-10-22.json).
Genuine claims, swaps, collisions, concurrency, immediate-constraint rollback and
signed Data API behavior remain unverified; no installation or production change
is established by these tests.

A read-only request using the isolated project publishable key reached the real
Auth settings endpoint (HTTP 200): email provider enabled, signup enabled,
email autoconfirm false and Google provider false. No credentials/session were
created, no email sent and no Auth settings changed by that request.

A live read-only Data API schema probe against a nonexistent table with
`Accept-Profile: idealab_private` returned HTTP 406 / PGRST106 (invalid schema),
confirming that namespace is not currently exposed. The OpenAPI-root request
was rejected by the gateway and was not used as exposure evidence. No personal
rows were requested.


## Validation foreign-key indexes — 23 October 2026

The Supabase performance advisor identified ten unindexed foreign-key
constraints in the isolated schema. I reviewed the live table/index catalog and
the installed migration source, then applied the additive
[`validation_fk_indexes_v1` migration](../supabase/validation/20261023081307_validation_fk_indexes_v1.sql)
to `idealab-mec-validation` only. It creates eight B-tree indexes: one for each
uncovered foreign-key path, with two composite indexes also covering their
single-column actor references. Postflight checks and a fresh catalog query
confirmed all eight indexes are valid and ready; the performance advisor no
longer reports unindexed foreign keys.

The advisor now reports nine unused-index notices because the isolated tables
have little test traffic. These indexes remain useful for referential checks and
future owner/history queries; the test database's idle workload is not a reason
to remove them. The 18 RLS-without-policy notices are the expected private or
deliberately ungranted tables, and leaked-password protection remains disabled
on the Free plan. No data, grants, policies, Auth settings, or shared Grow
production schema changed.


## Live isolated Auth setup — 22 October 2026

Browser access was restored after the owner enabled Local browser use and restarted
the desktop app. The owner explicitly approved the isolated Site URL
`http://127.0.0.1:3015` and its three exact confirmation/recovery/OAuth callbacks;
all were saved and visibly verified in the validation dashboard. Shared Grow
production settings remain unchanged. See [callback evidence](research/isolated-auth-callbacks-2026-10-22.json).

The local site is now running a production build against that isolated project.
Its new `.env.local` is git-ignored and contains only the isolated public config
and test activation flags; default example/production activation stays off.
Actual HTTP smoke checks confirm private/no-store account pages, anonymous denial
on both private entry routes, and safe rejected-confirmation/recovery redirects.
Google stays off because its provider is not configured. No production SMTP
service is configured. The owner has the live signup page for private password
entry and inbox confirmation; no genuine email, signup or session success has
been established yet. Credentials and confirmation URLs must stay out of logs,
source, screenshots and evidence files.

The integrated declaration action now rereads the authenticated owner's exact
profile after a claim receipt and requires an admitted active Student with the
same revision and display number before returning success. Independent review
accepted this correction. Fifty-nine boundary tests, lint/TypeScript and the
optimized build pass; public/configuration browser acceptance passed before
this final protected-action hardening. Genuine admitted form rendering and
persistence remain part of the pending real-account journey.
