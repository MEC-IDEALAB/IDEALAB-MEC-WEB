# Shared backend readiness and onboarding gate

Status: review plan only. This is not approved SQL, a migration, a production
change, or permission to create a billable Supabase branch. Account activation
must remain disabled until the compatibility, privacy and account journeys
below pass.

## Current evidence

Read-only inspection of `grow-idealab` completed on 21 October 2026. The
current pass rechecked project health, PostgreSQL version, deployed migration
ledger, table columns and security advisors. Policy, grant and trigger details
below are carried forward from the earlier same-day metadata audit; they were
not re-queried in this pass. The project is healthy on PostgreSQL 17.6.1.166.
The deployed ledger contains only `20260503073726 create_initial_schema` and
`20260503073744 add_rls_policies`; it materially differs from the tracked Grow
migration history and current Flutter auth/profile consumers.

The branch-list API returned no development branches. The fresh performance
advisor also reports eight unindexed foreign keys, 62 RLS auth-function
initplan findings, three pairs of duplicate permissive `SELECT` policies, and
21 indexes with no recorded use. These require workload-aware cleanup after
the authorization design is corrected; an unused-index notice alone is not a
safe instruction to drop an index.

The live `public.users` table has 19 columns, including `role`, `is_active`,
`profile_completed`, `name`, `phone` and `college_roll`. It lacks the approved
`institution`, `department` and current `study_year` fields. `college_roll` is
globally unique, while the product decision is institution-scoped uniqueness.
The database also has `user_profiles.department` and
`user_education.institution`, but neither is an approved substitute for the
six-field private onboarding contract; `user_education.end_year` represents a
graduation/batch year, not current study year.

The earlier metadata audit found that the live `users_read_all` policy lets
authenticated users read every `users` row. Own-row insert/update policies
coexist with broad table privileges, so row ownership alone does not protect
authority and status fields. That audit found no `auth.users`
profile-provisioning trigger. Website source code defaults member and Google
activation off and requires explicit flags; deployed flag values were not
inspected. Auth provider and callback configuration could not be re-read and
remain unverified.

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

## Required shared contract

Signup and onboarding must preserve one Supabase Auth identity across the web
and Flutter. A verified email receives the compatibility `student` account
role; neither signup metadata nor profile updates may assign roles, positions,
active status, profile completion or operational authority. Required profile
fields are name, phone, roll number, department, current study year 1–8, and
free-text institution. Students may self-edit those fields. They remain
private by default. A project roster or assigned head must not gain access to
these fields by relying on the current broad row policy; show a generic member
label until a narrower identity disclosure rule is approved.

The canonical field table and trusted provisioning/write path are not yet
chosen. In particular, the current `users`/`user_profiles` split and the
existing direct Flutter inserts must be reconciled before adding a second
profile source. The final policy must reject direct client writes to role,
active status, completion state and head assignments, regardless of which UI
is used.

## Cross-client document drift found during the Grow source review

A read-only review of the parent `F:\kannan\projects\Grow` checkout on 21
October 2026 found that several current web decisions have not been reconciled
across the Grow documentation set. The parent checkout contains extensive
uncommitted changes; those files were inspected but not edited. Resolve and
commit the cross-client contract before either app enables live account or
operational writes.

- `docs/01_Product/AUTH_IDENTITY_POLICY.md:13` still says student eligibility
  beyond verified email needs a future owner decision. The current web
  decision allows any verified email to create a Student account; eligibility
  for individual modules, events and services remains separate and unresolved.
- `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md:12-15,86-93` still
  describes the older three-field minimum (name, optional phone and optional
  roll number) and broad public-profile wording. The current web contract
  requires six fields, private by default, with institution-scoped roll
  uniqueness.
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
2. Agree the single source of truth for the six fields, the normalized key for
institution-scoped roll uniqueness, profile visibility for staff/project
rosters, and the treatment of existing incomplete accounts and duplicate
rolls. Preserve display text separately from any deterministic uniqueness
key.
3. Replace Flutter's direct profile creation, arbitrary update maps,
client-selected role and client-written completion state with the reviewed
shared contract. Review full-row profile helpers such as `getUserProfile`
and make them self-only or remove them if unused. Keep the existing mobile
files unchanged until their owner has reviewed the coordinated change.
4. Define a versioned rollout or tested compatibility path for existing mobile
clients that still insert `public.users` after email/Google authentication.
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
   server-loaded profile fields only after their canonical shared mapping is
   approved. Run forward
migration, compatibility, rollback/recovery and negative
authorization tests in a production-faithful non-production database. Verify
email verification, Google and email account convergence, existing accounts,
all six fields, cross-user privacy, role/status denial, duplicate roll behavior
and the corresponding Flutter flows.
8. Obtain independent migration/security review and explicit approval for the
specific shared-project change. Only after the reviewed change is applied and
verified may web signup/onboarding be enabled. No V1 operational module may
claim persistence without its own approved API, permission matrix and
end-to-end acceptance journey.

There is no Supabase development branch. Do not create one until its exact
organization cost is shown to the owner and explicitly accepted. No local or
remote development branch was created for this review.

## Decisions and evidence still required

- Canonical location and validation/normalization for institution, department,
  phone and roll number.
- How existing users supply institution and current study year, and how
  duplicate historical roll values are resolved before relaxing global
  uniqueness.
- Which terms, privacy notice and lab rules are shown and versioned at account
  creation/onboarding.
- Exact email confirmation, Google callback and existing-account behavior in
  Supabase Auth; metadata inspection is not a successful login test.
- A safe test database/branch with an understood cost, plus a production
  rollback and data-recovery owner.
- Whether the existing mobile client can be upgraded or must be supported by a
  temporary compatibility path while provisioning changes roll out.
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
| Two equal roll values belong to different institutions | Allowed only under the approved normalized institution-scoped key. |
| Two equal roll values belong to one institution | Rejected atomically, including concurrent writes and institution changes. |
| Unverified email reaches the signed-in workspace | Denied; a verified new account enters resumable onboarding. |
| Existing incomplete account signs in | Routed to onboarding until server-confirmed completion. |
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
