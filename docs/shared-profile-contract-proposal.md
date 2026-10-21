# Shared student profile contract — implementation proposal

Status: technical proposal for review, 21 October 2026. This is the next implementation
gate for WEB-002, WEB-004 and WEB-018. It is not a deployed API, executable migration,
approval to change the shared project, or evidence of working account creation.

The confirmed product requirements remain in [onboarding requirements](onboarding-requirements.md).
The proposal uses the existing Supabase Auth identity and `public.users` row.
It does not introduce a separate website account or move required fields into a
legacy rich-profile table. The latest [MEC pilot admission contract](mec-pilot-admission.md)
restricts student workspace admission in both clients; email verification and
profile completion alone do not establish admission.

## Evidence and scope

The [metadata snapshot](research/shared-profile-catalog-2026-10-21.json) was returned
by a fresh read-only Supabase query on 21 October. It contains column, constraint,
policy, table-grant and trigger metadata only. No account records, Auth settings,
secrets, emails or passwords were read or changed.

The snapshot confirms:

- `users` has `name`, `phone`, `college_roll`, `role`, `is_active` and
  `profile_completed`, but no institution, department or current study year.
- `users_college_roll_key` is globally unique. The approved product rule is
  uniqueness within an institution in the earlier multi-institution design. The
  current pilot requires one normalized MEC registration claim, independent of
  institution display aliases; it does not admit students from other institutions.
- `users_read_all` permits authenticated reads of every row. Own-row updates
  do not restrict columns, and both API roles have broad table privileges.
- The role constraint accepts `student`, `lab_admin` and `super_admin`.
  There is no non-internal trigger on `auth.users`.

Existing Flutter code is an additional compatibility dependency, not a migration
template. The reviewed parent checkout has unrelated uncommitted work and remains
unedited. Its current auth repository and Google service perform separate
select/insert profile provisioning; the active RC5 onboarding stores most fields
locally and writes the completion boolean directly. See the source map below.

## Proposed canonical mapping

Keep all six required values on the existing operational account row. This makes
one atomic profile save possible and avoids joining independent legacy education
records to decide whether onboarding is complete.

| Product value | Canonical column | Expand-first shape | Ownership |
| --- | --- | --- | --- |
| Name | existing `users.name` | text; retain existing NOT NULL; empty new-account value is incomplete | Member edits own value |
| Phone | existing `users.phone` | text, nullable until supplied | Member edits own value |
| Roll number | existing `users.college_roll` | text, nullable until supplied | Member edits own value |
| College/institution | new `users.institution` | text, nullable for unreconciled legacy accounts; canonical MEC value for pilot claims | Server-constrained pilot value; no alias bypass |
| Department | new `users.department` | text, nullable for unreconciled existing accounts | Member edits own value |
| Current study year | new `users.study_year` | smallint, nullable or integer 1–8 | Member edits own value |
| Completion contract | new `users.profile_contract_version` | smallint, default 0 | Database only |
| Optimistic revision | new `users.profile_revision` | bigint, default 0 | Database only |

Retain `users.id` as the Auth foreign key. Preserve existing role vocabulary,
IDs, activation/ban state and account relationships. Neither onboarding nor
profile editing accepts role, active status, email, completion flags, positions,
XP, badges, QR data or another account ID.

`profile_completed` remains a compatibility output; it is not sufficient evidence
by itself. Completion version 1 requires all six valid stored values plus the
trusted completion result. A legacy true boolean with missing required fields
must resolve to incomplete, never Home.

The version is a profile-contract marker, not an authorization role. A revision
is concurrency control, not proof of completion. Pilot admission is separate from
profile completion and follows the owner's MEC student self-declaration plus one
unique registration-number claim. The pilot has no roster or document verification;
another person could make the first claim. Its storage/API design must be reviewed
before SQL; neither `role=student` nor a valid-looking number alone may synthesize
the declaration or claim.

## Confirmed product rules and proposed technical validation

The owner confirmed case/space-insensitive comparison, country-code phone entry
and the MEC-only pilot. Lengths, exact Unicode/collation behavior, complete number
formats and validation implementation below remain technical review candidates.
Existing records are not assumed compliant and must not be silently rewritten.

| Field | Proposed rule |
| --- | --- |
| Name | Trim surrounding whitespace; preserve Unicode spelling; 1–120 Unicode code points; reject control characters |
| Phone | Required `+country-code` entry is confirmed. Proposed storage is parsed E.164; validate national length with maintained phone metadata rather than a guessed global minimum; no SMS-verification claim |
| Roll | MEC registration number, preserving display text; proposed 1–64 code-point limit and control-character denial. Supplied `MDL24CS219` and lateral-entry `LMDL` are examples, not an exhaustive format directory |
| Institution | Canonical Model Engineering College value for the pilot; proposed 1–200 code-point storage limit; preserve legacy display text during reconciliation without using aliases as separate claim scopes |
| Department | Free text, 1–120 code points after trimming; preserve display spelling; reject control characters |
| Study year | JSON integer / SQL smallint 1–8; reject coercion from fractions, booleans or arbitrary strings |

The approved comparison ignores case and repeated/surrounding spaces while
preserving entered display text. During the pilot, the claim scope is canonical
MEC: “MEC” and “Model Engineering College” cannot hold separate claims for the same
normalized registration number. The earlier free-text alias distinction is
superseded for pilot admission, not an approved bypass. Do not strip punctuation
or invent format rules from the two supplied prefix examples.

`MDL24CS219` explains college, admission year, course and student number; `LMDL`
identifies lateral entry. Neither format nor uniqueness proves number ownership.
The owner chose explicit self-declared MEC eligibility for the pilot, not a
lab-team review or number-bound invitation. A one-time lab-team check without ID
upload is not part of the approved pilot. Current study year stays an explicit
Year 1–8 value rather than being inferred from admission year.

The SQL implementation must specify its Unicode/collation behavior and test the
same comparison vectors in Postgres and clients. Do not substitute JavaScript
case conversion for the database's uniqueness decision. The database unique index
is the final concurrent-write authority.

Before SQL, settle the exhaustive registration-format/course coverage and exact
normalization/validation and attestation/claim implementation. The assurance policy
is settled as self-declared MEC eligibility without college-record verification;
changing comparison semantics later requires another duplicate/collation review.

## Account and profile states

Evaluate identity before profile data. Each state has a distinct recovery path.

| State | Evidence | Result |
| --- | --- | --- |
| Signed out | No server-verified Auth user | Sign-in |
| Unverified | Auth email confirmation absent, or anonymous identity | Verification guidance; no profile read or member entry |
| Unavailable | Auth/profile lookup failed, row missing, unknown future/negative contract version, or malformed response | Retry/support; do not label the profile incomplete |
| Inactive | Server-loaded `is_active` is not true | Account-unavailable guidance; no onboarding write or member entry |
| Incomplete | Verified active owner row with legacy contract version 0, or version 1 with trusted completion false / a missing required field | Onboarding with existing own values |
| Profile complete, declaration or claim missing | Verified active Student with version-1 six-field completion but no required self-declaration or unique claim | Admission guidance; no student workspace access |
| Pilot Student | Verified active owner, complete version-1 profile, MEC student self-declaration and one unique claim | Member Home and permitted student deep links; admission is self-declared, not college-record verified |
| Existing staff | Trusted existing staff role and current scope, subject to verification/active checks | Preserve the reviewed staff access path; do not require a Student claim or invent staff authority |

An incomplete existing account must be able to load its own saved values without
entering operational pages. Backend failure is never converted into a successful
empty profile. Direct links and operational Data API policies use the same
independent admission boundary. Profile completion must not auto-admit a Student;
existing staff and inactive identities retain their separate trusted states.

## Proposed API and permission boundary

The following names describe the intended versioned API; none is currently
implemented or callable. These profile operations need a reviewed self-declaration
and unique-claim admission read/transition boundary before either client can
authorize entry. That boundary records an attestation; it does not claim that a
college roster or document was checked.

| Proposed operation | Input | Successful output / atomic behavior |
| --- | --- | --- |
| `get_own_profile_v1` | No account ID | Allowlisted own six fields, read-only account role, active/completion/version/revision state |
| `save_own_profile_v1` | Full six-key replacement payload plus expected revision; no actor or authority input | Lock own row, validate version/revision and values, update atomically, derive trusted completion/version, increment revision, return saved own profile |
| New-Auth provisioning trigger | Trusted NEW non-anonymous Auth identity with an email, including an explicitly tested anonymous-to-email conversion | Insert ordinary Student profile once; ignore editable role/status metadata; never overwrite an existing profile |
| Operator missing-profile repair procedure | Approved target Auth ID and authoritative role/status provenance; never member-supplied authority | Restore one missing legacy row under a reviewed maintenance transaction; preserve existing rows and refuse ambiguous authority/status |

Use the member session and `auth.uid()` for identity in every database operation.
The website has no service-role bypass. The read RPC is SECURITY INVOKER with
owner-only SELECT RLS and an explicit returned-column list. Owner SELECT may return
the owner's inactive state so the app can distinguish inactivity from lookup failure;
it grants neither member entry nor a save. Anonymous roles receive no profile access.

The complete account-row read allowlist is `id`, `name`, `phone`, `college_roll`,
`institution`, `department`, `study_year`, `role`, `is_active`, `profile_completed`,
`profile_contract_version` and `profile_revision`. The account role is a read-only
compatibility value, never a form input or permission granted by the client cache.
Auth supplies the email separately; do not read legacy account email, FCM/QR data,
ban details or unrelated counters through this profile contract. Revoke table-level
SELECT from API roles and grant SELECT on exactly this column list to authenticated
only, with the verified-owner RLS below. Test direct selection of an excluded own
column and `SELECT *` as denials; the RPC response alone is not the allowlist boundary.

Make the save API the exclusive member write boundary. A public SECURITY INVOKER
wrapper calls one narrowly scoped private SECURITY DEFINER writer. The elevated
writer is justified by server-controlled completion/revision and atomic concurrency
checks while API roles have no table UPDATE privilege. It derives `auth.uid()`,
checks the current verified non-anonymous Auth identity, locks that same owner's row,
requires `is_active=true`, rejects unknown contract versions and stale revision,
validates the exact payload and canonical MEC institution, then writes only the
six profile fields and derived completion/version/revision. It cannot edit another
ID, role, active status or eligibility authority. Registration-number self-edit
needs an atomic reviewed claim transition: it cannot transfer another claim,
auto-approve a replacement number or leave the self-declared admission attached to
an old number. The precise attestation record, claim transition and replacement
behavior still need a technical design.
Use fixed search paths, qualified static SQL, minimal function privileges and no
caller-selected relation, column, actor or dynamic SQL. No elevated function may
simply return a client-provided completion result.

Revoke all member/anonymous direct INSERT, UPDATE and DELETE privileges at both table
and column level, plus TRUNCATE, REFERENCES and TRIGGER, unless a separately reviewed
operation explicitly needs them. Revoke public/anonymous execution on both wrappers
and private functions; grant only the authenticated call chain needed for these
verified-owner operations. Inventory other writable views/RPCs/SECURITY DEFINER
functions and eliminate alternate profile-write paths. A table grant review alone
does not prove the writer is exclusive. Direct Data API updates of even the six
allowed fields must be denied, so they cannot bypass expected-revision checks.
Recheck every policy because permissive policies are OR-combined; retaining
`users_read_all` defeats privacy.

Verification must also hold for direct Data API requests, not only Next.js actions.
The read RLS predicate must combine owner identity with a mandatory, narrowly scoped
private helper that checks the current Auth row: non-null `auth.uid()`, non-anonymous
identity, non-empty email and a current email-confirmation timestamp. A role named
`authenticated` alone is insufficient because anonymous Auth users may hold it.
Proposed helper `idealab_private.has_current_verified_email_v1()` is a no-argument,
STABLE SECURITY DEFINER boolean function, owned by the trusted migration role with
the necessary Auth read privilege. It has `search_path=''`, fully qualified static
SQL, checks only the row matching `auth.uid()`, and returns no Auth fields or tokens.
The `idealab_private` namespace is function-only and absent from exposed Data API
schemas. Revoke schema CREATE/USAGE and function EXECUTE from PUBLIC and anon;
authenticated receives only schema USAGE and EXECUTE on this helper and the exact
private writer needed by the public invoker wrapper. It receives no direct Auth
table privileges. Apply the function revocations in the same creation transaction
before commit, and audit effective/inherited grants. Trigger functions have no
member EXECUTE grant. All private functions enforce their own caller scope even if
called outside the wrapper. Do not trust editable user metadata, an email substring
or a nonexistent JWT email-confirmation claim. Deleted Auth identities must also
fail the helper lookup. Verify the real helper/RLS permission chain in Postgres;
these are proposed grants, not proof of deployed privileges.

Auth provisioning may require a SECURITY DEFINER trigger function; keep it in a
non-exposed schema, qualify every object and revoke public execution. Exclude
anonymous and email-less/phone-only identities from Student provisioning. An
anonymous-to-verified-email conversion needs a separately tested update event; do
not use that event to silently repair unrelated legacy missing profiles. The new
row stays unreadable until email confirmation and starts incomplete. A trigger
failure can block signup, so it needs real Auth integration tests.

No cross-user legal-name/phone/roll/institution read exception is included.
Project rosters may show a generic member label until a separate opt-in display
identity contract is approved. Staff access to operational records requires its
own assigned-scope API; it must not reopen a global profile SELECT policy.

Also reconcile legacy `user_profiles` and `user_education`: any duplicated required
personal values must not remain exposed through another table, view or function.
Until the deferred rich-profile field/consent matrix is approved, their profile
reads must be owner-only, with unnecessary API grants removed and unsupported
legacy writes disabled. Do not copy a user's required fields into public rich
profile columns. Test the legacy endpoints as well as the new own-profile API.

The save response distinguishes safe field validation, stale revision, inactive
account, lost verification and retryable backend failure. Do not expose raw unique
constraint details or another account's identity. There is no roll-availability
lookup endpoint. A uniqueness failure uses a generic cannot-save/review response,
and repeated authenticated saves need an enforceable abuse limit before launch.
The owner accepted limited occupied-registration inference with generic errors
and save limits, along with self-declared first-claim eligibility. This is not
independent ownership verification or an assertion that enumeration is impossible.
Define and test the limit/window and enforcement path
for direct API calls too; a client-only throttle or a failed transaction that
rolls back its attempt counter is insufficient. No availability lookup, other
profile disclosure, raw provider errors or profile-value logging is permitted.

## Save, resume and self-edit behavior

Use one required-profile form with modern body text, retro accents and the existing
tokens. Prefill only the server-loaded owner's saved values. Keep unsaved text in
page memory; do not add six-field personal-data drafts to local/session storage.

A save-progress path may persist valid partial fields on the same owner row before
first completion. Define full-replacement semantics: all six keys must be present,
and unknown/omitted keys are rejected rather than silently merged or defaulted.
Name is a string; trimmed empty name stores the existing incomplete sentinel `''`
only for version 0. Other text fields accept string or null, with trimmed empty text
mapped to null; study year accepts integer 1–8 or null. Non-empty invalid strings,
wrong types, invalid years and oversized values are rejected in partial saves too.
The expected revision travels as a validated decimal string because SQL bigint is
not always exactly representable as a JavaScript number.

Version-0 progress remains incomplete until all six saved values are valid; that
accepted save derives completion/version 1 on the server. The UI labels that complete
operation “Finish setup”; student Home additionally requires a stored MEC student
self-declaration and one unique registration claim. A missing declaration or claim
stays outside the student workspace even when all six fields are complete.
Once version 1 is complete, clearing any required value is rejected atomically and
retains the last valid server profile. A legacy true completion boolean alone never
upgrades the profile version. Unknown future versions cannot be downgraded by this API.

Refresh/sign-in resumes persisted progress. A failed request keeps unsaved input in
the current page and focuses a useful error. Lost responses are resolved by
reloading the own profile/revision; no client completion flag is trusted. Concurrent
edits return a conflict and let the user review current saved values before retrying.

## Coordinated rollout and data preservation

### Existing Auth identity with a missing profile

Missing legacy rows remain unavailable to member APIs; the website must not create
them by guessing a role/status or asking the member to choose one. Before rollout,
exercise this operator-only repair procedure in the safe environment:

1. Confirm the target Auth identity exists and is an eligible verified email
   identity. Establish previous role, active/ban state and account relationships
   from an approved audit/backup/roster source. If that source cannot establish the
   intended authority/status, require an explicit operator/owner classification;
   do not silently reactivate or downgrade the person.
2. In one reviewed maintenance transaction, lock the target Auth identity and check
   again for its profile. If a row already exists, preserve it and stop; a racing
   repair/provisioning operation must not overwrite it.
3. Insert only the missing row with the approved role/status and known valid
   profile values. Unknown institution/year and other required fields stay
   incomplete; no fabricated institution or legal name is used. Account ID remains
   the same Auth ID. Reconcile any known relationships before confirming repair.
4. Record authorized operator, target ID, provenance reference, action/time and
   outcome without profile-value snapshots in logs. Re-fetch the profile through
   the same own-profile API and complete onboarding only if required. Test an
   inactive/staff repair and an idempotent retry explicitly.

This is an operator maintenance path, not a public repair RPC or an existing
implemented tool. It requires a reviewed concrete SQL procedure and the exact
live-change approval. New-signup trigger failure/rollback and legacy row repair
are different acceptance cases.

### Deployment sequence

1. Capture a metadata baseline and reconcile the two-entry live migration ledger
   against every checked-in migration. Do not replay 001–008 or replace the live
   role model with `base_role/system_role` as part of this profile change.
2. Implement the approved self-declaration/unique-claim policy; resolve
   registration-format coverage, technical normalization/save-limit design and
   acceptance in the available isolated validation environment.
   Obtain architecture/security review of this contract and admission API.
3. Prepare expand-only SQL in the canonical Grow migration chain: nullable new
   fields, contract/revision columns and approved validation helpers. Do not
   activate a new completion gate or tighten deployed writes yet.
4. Update all supported Flutter and web consumers to the same versioned own-profile
   contract. Remove separate profile inserts, client authority/completion updates
   and full-row arbitrary update maps. Update Flutter's model/router to require
   server-loaded version-1 completeness and separate trusted pilot admission.
   Preserve staff access. Test each auth, claim, self-edit and repair path.
5. Reconcile existing rows in the safe environment. Keep unknown institution/year
   values null until the reviewed MEC claim path and owner-supplied current year
   establish them. Preserve existing IDs, roles and inactive/ban states. Missing account rows need an explicit repair path; no
   automatic elevated role or guessed institution is allowed.
6. Add the reviewed normalized MEC claim uniqueness boundary only after existing
   claims, duplicate comparisons and collation behavior are checked. Institution
   aliases cannot split the pilot scope. Preserve legacy constraints until the
   replacement and supported-client rollout pass; any constraint change belongs
   in the reviewed switch, not an unverified cleanup.
7. In the tested switch, enable trusted provisioning, owner-only reads, allowlisted
   writes, derived completion and versioned functions. Older plain INSERT clients
   are incompatible with a trigger-created row; trigger idempotency alone does not
   fix their duplicate-key error. Older profile writers also lose permission to
   set completion/role. Do not claim backward compatibility without testing it.
8. Verify real signup/confirmation/Google/recovery, existing accounts, missing-row
   repair, partial resume, self-edit and every denial case below. Enable the website
   member flag only after the shared change and compatibility journeys pass.

The owner approved a coordinated Flutter update before activation. Define the
supported build/cutover and recovery procedure; older direct INSERT/completion
writers must not retain unsafe permissions to preserve apparent compatibility.
Both clients require the same pilot admission and privacy acceptance.

For recovery, disable new web writes first, preserve the expanded columns/data and
forward-fix the contract. Do not restore permissive profile reads or role writes as
a rollback. Back up affected schema/privileges and validate restoration in the safe
environment before the approved live change. Do not drop new profile data, overwrite
staff roles or guess replacement institutions during recovery.

## Acceptance matrix for the actual implementation

| ID | Journey / adversarial condition | Required evidence |
| --- | --- | --- |
| SP-01 | New verified-email identity, intentional sign-in and MEC admission | One Auth identity/ordinary Student profile; six-field completion, explicit MEC self-declaration and one unique claim before Home; no college-record verification or invented email-domain restriction |
| SP-02 | Google new/existing identity and cancellation | Same profile authority; configured provider/callback; no duplicate row or stranded client |
| SP-03 | Legacy true completion, missing new fields or absent MEC claim; existing staff | Student onboarding/admission remains gated; IDs, saved values, roles and inactive state preserved; trusted staff access is not removed by Student eligibility |
| SP-04 | Save partial progress, reload and finish; omit/unknown keys, null/empty, wrong types, phone format and invalid non-empty values | Full replacement and +country-code rules enforced; own progress resumes; only six valid persisted values allow profile completion, which alone does not admit; no silent merge/clear |
| SP-05 | Anonymous Auth session carrying authenticated role, unverified/deleted Auth identity, inactive owner and another user; direct REST reads and excluded-column selection | Anonymous/unverified/deleted/cross-user private reads and all writes denied by DB; inactive verified owners may read the allowlisted own profile/status only but cannot save/Home; excluded columns and `SELECT *` denied; helper grants and failure states verified |
| SP-06 | Direct profile/role/status/completion/eligibility/position/ID update, insert or alternate writable RPC/view | Direct member authority writes denied; reviewed own-profile writer derives completion/version/revision only; chosen admission path cannot be bypassed |
| SP-07 | Concurrent same normalized MEC-number claims and repeated guesses via both clients/direct API | At most one claim succeeds; failed save atomic; generic errors and enforceable attempt limits; no other profile disclosed |
| SP-08 | MDL/LMDL examples, case/spaces, MEC display aliases and invalid/unknown format | One canonical MEC claim scope; aliases cannot duplicate a number; full format policy tested without inventing branch coverage; self-declaration is not college-record verification |
| SP-09 | Self-edit including registration change, stale revision, lost response and direct six-field Data API bypass | Atomic reviewed claim transition plus revision checks prevent overwrite/transfer races; no automatic admission of a replacement number; last valid profile and recoverable retry preserved |
| SP-10 | New signup trigger failure; anonymous/phone-only exclusion and eligible conversion; separately, missing legacy row/staff/inactive repair | Signup transaction and conversion obey verified-email provisioning rules without auto-admission; operator repair preserves authoritative role/status, is idempotent and refuses ambiguous classification; no claimed account success without readiness |
| SP-11 | Coordinated supported Flutter and Next.js auth/Google/profile/admission/router flows | Both real clients pass the same completion, admission and privacy denials before activation; unsafe old writers are not retained |
| SP-12 | Connection failure, cancelled provider, expired/revoked session | Retryable UI; no fake completion, password update or operational success |
| SP-13 | Failed migration/switch and recovery | Restore/recovery exercise preserves identities and private data without reopening vulnerabilities |
| SP-14 | Cross-user projects/booking display after privacy tightening | No required personal fields leak; approved scope or generic label works |

Run these with real Auth, Postgres RLS/Data API and both clients in the approved
safe environment. Unit tests or a simulated auth schema cannot establish this
acceptance. A later [native runtime smoke check](database-validation.md) used the
existing Node 24.19.0/PostgreSQL 16.1 installation and a fresh UTF8/C cluster,
verifying isolated identity, wrong-password denial, transaction rollback and
stop/removal. Its [sanitized result](research/local-pg-runtime-2026-10-21.json)
is runtime preparation only: no app SQL, migration, Auth, RLS or Data API was tested.
It does not match the shared PostgreSQL 17.6/en_US.UTF8 environment.

The confirmed Free organization `yhhsdxbhpsyovqlvdoha` has no development branch.
The retrieved branch quote was $0.01344/hour, but branching also requires Pro;
no upgrade or branch creation was authorized. A separate project quote returned
$0 monthly. The owner subsequently approved creation of the fresh Free project
`idealab-mec-validation` (`gvvqlfachzbufstzoiwi`) in the same organization,
Mumbai (`ap-south-1`), now `ACTIVE_HEALTHY`. Management metadata reports PostgreSQL
`17.11.0.003`; read-only SQL confirms 17.11/UTF8/`en_US.UTF-8`, zero public tables
and zero migrations. The [actual metadata baseline](research/isolated-supabase-baseline-2026-10-21.json)
is connectivity/environment evidence, not app SQL, Auth, RLS, migration or
both-client acceptance. Target-version differences from the shared 17.6 project
still need assessment.

This environment serves non-production acceptance only; production remains one
shared Supabase identity/database authority. Existing paused
`grow-security-validation` is preserved. No paid upgrade, production-data copy,
account, application migration, Auth-setting or shared-project change was made. See
[Supabase deployment](https://supabase.com/docs/guides/deployment) and
[branch usage](https://supabase.com/docs/guides/platform/manage-your-usage/branching).

## Current source map and research

Parent Grow sources inspected read-only:

- `lib/features/auth/data/auth_repository.dart`: email signup creates Auth then
  inserts a profile; `ensureUserProfileExists` uses select-then-insert.
- `lib/features/auth/data/google_auth_service.dart`: separate profile provisioning.
- `lib/core/router/app_router.dart`: active RC5 onboarding and completion-boolean gate.
- `lib/features/auth/presentation/screens/rc5_onboarding_screen.dart`: locally held
  profile values and direct completion update.
- `lib/features/auth/presentation/screens/profile_setup_screen.dart`: legacy role
  and completion write; not the active route.
- `lib/shared/models/user_model.dart`: legacy role/completion model.
- `supabase/migrations/001_initial_schema.sql` and `002_rls_security_fixes.sql`:
  mutually inconsistent role vocabulary; not a safe replay chain.

Official guidance checked 21 October:

- [Supabase managing user data](https://supabase.com/docs/guides/auth/managing-user-data):
  Auth foreign keys, RLS and the signup-blocking risk of a profile trigger.
- [Auth architecture](https://supabase.com/docs/guides/auth/architecture):
  Auth schema authority and protected cross-schema access.
- [JWT fields](https://supabase.com/docs/guides/auth/jwt-fields) and
  [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security):
  authenticated database role is not proof of non-anonymous verified-email identity.
- [Column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security):
  table-level privileges override attempts to restrict only individual columns.
- [Postgres trigger behavior](https://www.postgresql.org/docs/17/trigger-definition.html):
  trigger execution and signup/update transaction behavior must be verified with
  the final privilege design; a trigger name alone does not establish safe access.
- [Supabase changelog](https://supabase.com/changelog):
  upcoming TLS cipher removal affects very old HTTP clients; test the supported
  Flutter/runtime versions. The September Postgres update also calls for extension
  checks; this proposal changes no extension or index on an extension type.
- [Postgres update notice](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes):
  keep environment version/extension checks in the rollout, not an unrelated live upgrade.
- [TLS notice](https://supabase.com/changelog/cbc-tls-ciphers-deprecated):
  modern TLS client compatibility must be part of supported-version acceptance.

## Review record — 21 October 2026

Two independent read-only reviews examined this proposal and the metadata artifact.
The contract review found revision-bypass, partial-save and legacy-version
ambiguities; the final text resolves them through an exclusive save boundary,
explicit replacement semantics and separate legacy/unsupported states. The security
review required a mandatory current-Auth read boundary, non-anonymous provisioning,
an operator repair procedure, accurate alias/inference limitations, exact read
allowlist and private-helper execution grants. Its final re-review confirmed those
technical proposal gaps were resolved for that earlier candidate. The later MEC
pilot and owner answers in this revision still require technical re-review; the
earlier reviews do not approve the new admission design.

These are document/metadata reviews, not an independent pass of a migration or
application. Neither reviewer ran database/Auth tests or changed the shared service.
Local documentation validation passed for 16 files and 82 local links; the saved
JSON was parsed and checked for the 19-column baseline, missing new fields, enabled
table RLS and PostgreSQL 17.6 metadata. No implementation E2E applies to this
documentation-only change; the existing application acceptance is recorded in the
[delivery plan](delivery-plan.md).

## Review and next action

This contract is a review candidate. No migration, profile API, six-field production
form, client patch or live permission fix has been implemented by this document.
The [backend readiness gate](backend-readiness.md) remains open.

Next: design the approved self-declaration and unique-claim record/transition,
finish registration-format coverage and specify enforceable save limits. The
isolated Free test project is available; prepare and review its test implementation
without treating empty-project connectivity as acceptance.
Review the resulting permission/trigger/admission design independently, then
implement and test a coordinated migration/client slice. The exact shared-project
change still needs explicit authorization after the concrete SQL and acceptance
evidence are available.
