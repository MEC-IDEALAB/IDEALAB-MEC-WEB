# Shared backend readiness and onboarding gate

Status: review plan only. This is not approved SQL, a migration, a production
change, or permission to create a billable Supabase branch. Account activation
must remain disabled until the compatibility, privacy and account journeys
below pass.

The [shared profile contract proposal](shared-profile-contract-proposal.md) turns
this gate into a concrete mapping, state/API/permission design, rollout sequence
and 14-journey acceptance matrix. It includes a fresh [metadata-only catalog
snapshot](research/shared-profile-catalog-2026-10-21.json). No SQL migration or
application persistence is implemented by that proposal.

## Current evidence

Read-only inspection of `grow-idealab` completed on 21 October 2026. This pass
rechecked project health, PostgreSQL version, the deployed migration ledger,
table columns, RLS policies, effective table/column privileges, relevant
triggers and security advisors. The metadata query inspected catalog records
only; no user rows were read. The project is healthy on PostgreSQL 17.6.1.166.
The deployed ledger contains only `20260503073726 create_initial_schema` and
`20260503073744 add_rls_policies`; it materially differs from the tracked Grow
migration history and current Flutter auth/profile consumers.

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

The branch-list API returned no development branches. The fresh performance
advisor also reports eight unindexed foreign keys, 62 RLS auth-function
initplan findings, three pairs of duplicate permissive `SELECT` policies, and
21 indexes with no recorded use. These require workload-aware cleanup after
the authorization design is corrected; an unused-index notice alone is not a
safe instruction to drop an index.

The live `public.users` table has 19 columns, including `role`, `is_active`,
`profile_completed`, `name`, `phone` and `college_roll`. It lacks the approved
`institution`, `department` and current `study_year` fields. `college_roll` is
globally unique. The earlier product decision was institution-scoped uniqueness;
the current MEC-only pilot requires one normalized MEC registration claim, with
no institution-label alias bypass.
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

A read-only review of the parent `F:\kannan\projects\Grow` checkout on 21
October 2026 found that several current web decisions have not been reconciled
across the Grow documentation set. The parent checkout contains extensive
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
self-declaration recording, registration-format coverage and technical
normalization/save-limit design. Reconcile existing incomplete accounts and
claims without guessing institutional affiliation; preserve display text and
required-field privacy.
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

- Technical approval of the proposed existing-row mapping, phone metadata and
  normalization/collation rules. Country-code entry, case/space comparison and
  self-declared MEC eligibility are settled; full registration formats and
  attestation/claim enforcement are not.
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
