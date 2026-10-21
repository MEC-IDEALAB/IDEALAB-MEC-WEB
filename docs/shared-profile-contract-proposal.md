# Shared student profile contract — implementation proposal

Status: technical proposal for review, 21 October 2026. This is the next implementation
gate for WEB-002, WEB-004 and WEB-018. It is not a deployed API, executable migration,
approval to change the shared project, or evidence of working account creation.

The confirmed product requirements remain in [onboarding requirements](onboarding-requirements.md).
The proposal uses the existing Supabase Auth identity and `public.users` row.
It does not introduce a separate website account or move required fields into a
legacy rich-profile table.

## Evidence and scope

The [metadata snapshot](research/shared-profile-catalog-2026-10-21.json) was returned
by a fresh read-only Supabase query on 21 October. It contains column, constraint,
policy, table-grant and trigger metadata only. No account records, Auth settings,
secrets, emails or passwords were read or changed.

The snapshot confirms:

- `users` has `name`, `phone`, `college_roll`, `role`, `is_active` and
  `profile_completed`, but no institution, department or current study year.
- `users_college_roll_key` is globally unique. The approved product rule is
  uniqueness within an institution.
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
| College/institution | new `users.institution` | text, nullable for unreconciled existing accounts | Member edits own value |
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
is concurrency control, not proof of completion.

## Recommended field rules to settle before SQL

These are proposed engineering rules; they are not a claim that current records
already comply. Do not rewrite existing values automatically.

| Field | Proposed rule |
| --- | --- |
| Name | Trim surrounding whitespace; preserve Unicode spelling; 1–120 Unicode code points; reject control characters |
| Phone | Collect country code and store a parsed international phone number in E.164 form; validate national length with maintained phone metadata rather than a guessed global minimum; no SMS-verification claim |
| Roll | Trim surrounding whitespace; preserve display spelling; 1–64 code points; reject control characters |
| Institution | Free text, 1–200 code points after trimming; preserve display spelling; reject control characters |
| Department | Free text, 1–120 code points after trimming; preserve display spelling; reject control characters |
| Study year | JSON integer / SQL smallint 1–8; reject coercion from fractions, booleans or arbitrary strings |

Recommended uniqueness comparison: Unicode-normalized, case-insensitive institution
and roll keys with surrounding/repeated whitespace normalized. Display text remains
separate. Do not strip punctuation, transliterate names or merge aliases:
“MEC” and “Model Engineering College” remain different entered institution names
unless an approved institution directory is introduced later. This limitation is
inherent in the approved free-text design.

This recommendation enforces uniqueness within a normalized entered label, not a
canonical real-world institution. That is narrower than an unconditional
institution-wide guarantee. Owner acceptance of this limitation is still required;
the pending comparison question explicitly states the alias behavior. If true
institution identity is required, first approve a canonical institution identifier
and alias-resolution workflow while retaining free-text display. Until then this
proposal does not claim WEB-004's uniqueness acceptance is settled.

The SQL implementation must specify its Unicode/collation behavior and test the
same comparison vectors in Postgres and clients. Do not substitute JavaScript
case conversion for the database's uniqueness decision. The database unique index
is the final concurrent-write authority.

Before implementing those rules, settle whether international-format phone entry
and the proposed institution/roll comparison match the intended user experience.
Changing comparison semantics later requires another duplicate/collation review.

## Account and profile states

Evaluate identity before profile data. Each state has a distinct recovery path.

| State | Evidence | Result |
| --- | --- | --- |
| Signed out | No server-verified Auth user | Sign-in |
| Unverified | Auth email confirmation absent, or anonymous identity | Verification guidance; no profile read or member entry |
| Unavailable | Auth/profile lookup failed, row missing, unknown future/negative contract version, or malformed response | Retry/support; do not label the profile incomplete |
| Inactive | Server-loaded `is_active` is not true | Account-unavailable guidance; no onboarding write or member entry |
| Incomplete | Verified active owner row with legacy contract version 0, or version 1 with trusted completion false / a missing required field | Onboarding with existing own values |
| Complete | Verified active owner row, contract version 1 and all six valid stored fields; trusted completion true | Member Home and permitted deep links |

An incomplete existing account must be able to load its own saved values without
entering operational pages. Backend failure is never converted into a successful
empty profile. Direct links use the same server gate.

## Proposed API and permission boundary

The following names describe the intended versioned API; none is currently
implemented or callable.

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
validates the exact payload, then writes only the six profile fields and derived
completion/version/revision. It cannot edit another ID, role, status or other field.
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
Even with generic feedback, success versus failure can reveal whether a guessed
institution/roll pair is occupied. Record owner acceptance of that limited inference
or design a non-enumerating private-review flow; generic wording alone is not proof
that enumeration is impossible. Do not return raw Postgres/provider errors or write
profile values into logs.

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
operation “Finish setup” and enters Home only from the returned saved profile.
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
2. Settle field/comparison rules, the supported old-app window and the exact safe
   validation environment. Obtain architecture/security review of this contract.
3. Prepare expand-only SQL in the canonical Grow migration chain: nullable new
   fields, contract/revision columns and approved validation helpers. Do not
   activate a new completion gate or tighten deployed writes yet.
4. Update all supported Flutter and web consumers to the same versioned own-profile
   contract. Remove separate profile inserts, client authority/completion updates
   and full-row arbitrary update maps. Update Flutter's model/router to require
   server-loaded version-1 completeness. Test each auth and repair path.
5. Reconcile existing rows in the safe environment. Keep unknown institution/year
   values null; let verified owners supply them. Preserve existing IDs, roles and
   inactive/ban states. Missing account rows need an explicit repair path; no
   automatic elevated role or guessed institution is allowed.
6. Add the approved composite institution/roll unique index only after normalized
   duplicates and collation behavior are checked. Keep the global roll constraint
   until the composite check and supported-client rollout pass; remove it in the
   reviewed switch transaction, not as an unverified cleanup.
7. In the tested switch, enable trusted provisioning, owner-only reads, allowlisted
   writes, derived completion and versioned functions. Older plain INSERT clients
   are incompatible with a trigger-created row; trigger idempotency alone does not
   fix their duplicate-key error. Older profile writers also lose permission to
   set completion/role. Do not claim backward compatibility without testing it.
8. Verify real signup/confirmation/Google/recovery, existing accounts, missing-row
   repair, partial resume, self-edit and every denial case below. Enable the website
   member flag only after the shared change and compatibility journeys pass.

Recommended deployment policy is a coordinated Flutter update before activation,
rather than retaining unsafe role/completion writes for old versions. If old
installed versions must stay fully writable, design and test a separate bounded
compatibility bridge before choosing the switch date. This remains an owner rollout
decision; it cannot be inferred from “share the existing backend.”

For recovery, disable new web writes first, preserve the expanded columns/data and
forward-fix the contract. Do not restore permissive profile reads or role writes as
a rollback. Back up affected schema/privileges and validate restoration in the safe
environment before the approved live change. Do not drop new profile data, overwrite
staff roles or guess replacement institutions during recovery.

## Acceptance matrix for the actual implementation

| ID | Journey / adversarial condition | Required evidence |
| --- | --- | --- |
| SP-01 | New email from any domain, confirmation and intentional sign-in | One Auth identity/one ordinary Student profile; six-field onboarding before Home |
| SP-02 | Google new/existing identity and cancellation | Same profile authority; configured provider/callback; no duplicate row or stranded client |
| SP-03 | Legacy true completion with missing new fields | Onboarding, not Home; existing role and saved values preserved |
| SP-04 | Save partial progress, reload and finish; omit/unknown keys, null/empty, wrong types and invalid non-empty values | Full replacement rules are enforced; own saved progress resumes; only six valid persisted values allow completion; no silent merge/clear |
| SP-05 | Anonymous Auth session carrying authenticated role, unverified/deleted Auth identity, inactive owner and another user; direct REST reads and excluded-column selection | Anonymous/unverified/deleted/cross-user private reads and all writes denied by DB; inactive verified owners may read the allowlisted own profile/status only but cannot save/Home; excluded columns and `SELECT *` denied; helper grants and failure states verified |
| SP-06 | Direct profile/role/status/completion/position/ID update, insert or alternate writable RPC/view | Direct member writes are denied; only the reviewed own-profile writer changes six fields and derives completion/version/revision |
| SP-07 | Two concurrent same approved institution/roll-key saves; repeated guessed pairs | At most one succeeds; failed save is atomic; generic feedback, enforceable abuse limit and accepted privacy-inference/private-review policy |
| SP-08 | Same roll at different entered institutions and aliases of one institution | Approved label-vs-canonical identity rule is tested explicitly; do not claim alias-level uniqueness from label normalization; global roll constraint no longer rejects permitted pairs after the switch |
| SP-09 | Self-edit, concurrent/stale revision, lost response and direct six-field Data API update bypass attempt | Row-lock/revision compare prevents supported-client overwrite races; bypass writes denied; preserve last valid profile and recoverable retry |
| SP-10 | New signup trigger failure; anonymous/phone-only exclusion and eligible conversion; separately, missing legacy row/staff/inactive repair | Signup transaction and conversion obey eligibility; operator repair preserves authoritative role/status, is idempotent and refuses ambiguous classification; no claimed account success without readiness |
| SP-11 | Supported Flutter auth/Google/profile/router flows | Actual supported app versions pass the same contract and privacy denials |
| SP-12 | Connection failure, cancelled provider, expired/revoked session | Retryable UI; no fake completion, password update or operational success |
| SP-13 | Failed migration/switch and recovery | Restore/recovery exercise preserves identities and private data without reopening vulnerabilities |
| SP-14 | Cross-user projects/booking display after privacy tightening | No required personal fields leak; approved scope or generic label works |

Run these with real Auth, Postgres RLS/Data API and both clients in the approved
safe environment. Unit tests or a simulated auth schema cannot establish this
acceptance. No local PostgreSQL, Docker or Supabase CLI executable was discoverable
on PATH in the 21 October inspection; no tooling was installed or database created.
The connected branch-list tool also returned no development branches, and the
organization remains Free. The owner has been asked to confirm the organization
for a branch quote or identify a safe alternative; no quote, billable resource or
test identity has been created.

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
technical proposal gaps are resolved. The owner decisions below remain open.

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

Next: resolve the comparison/phone and supported-client decisions, review the
permission/trigger design independently, then implement and test one coordinated
migration and client slice in the chosen safe environment. The exact shared-project
change still needs explicit authorization after the concrete SQL and acceptance
evidence are available.
