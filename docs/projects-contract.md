# Projects — compatible student flow

Scope: WEB-005, signed-in discovery, public/private creation, code-based pending
join requests and creator decisions. Uses inspected Grow entities in the isolated
`idealab-mec-validation` project. Production remains read-only. Existing source:
Grow `supabase/schema.sql`, `project_repository.dart` and actual live constraints.

Installed only in isolation as `isolated_project_core_v1`; the candidate is not a
production migration. See [current acceptance evidence](quality/projects-core-2026-10-22.md).

## Compatibility and privacy

Preserve the ten `projects` columns: id/title/description/club_id/status/
created_by/visibility/showcase_url/created_at/updated_at. Preserve membership
id/project_id/user_id/role/joined_at and its unique project/user pair. Valid live
statuses are ideation/in_progress/completed/showcase; membership roles are
admin/lead/member/mentor. Creation atomically inserts creator plus **lead**,
never unsupported owner/active/archived values. Student creation offers public
and private only. Club operations, uploads and showcase links remain unavailable
pending their separate contracts. The isolated baseline omits the unused clubs
foreign key, as does its existing profile baseline; it is not full operational
schema fidelity and cannot be replayed into production as-is.

Private controls hold revision and a random 32-hex-character join code. Private
requests, command receipts, join-attempt counters and transition events extend
the canonical entities; no duplicate identity store or alternate project table
is introduced. No raw API writes or global profile joins are granted. All
operational RPCs require current verified, active ready membership.

Home and Lab show up to three most recently updated projects belonging to the
current account. This reuses the guarded `mine` list and its validated projection;
it adds no raw profile query, client account selector or aggregate-count claim.
An empty result invites creation or a code request; load failures remain explicit.
Project mutations invalidate Home and Lab so saved changes appear on return.

Code possession can create a **pending request only**. It grants neither team
membership nor access to private project title/description/roster. The creator
alone can approve/decline; approval inserts ordinary member atomically. A
requester sees their own status; private project details stay hidden until
membership. Public here means discoverable by signed-in members, not anonymous
web visitors. Codes are shown/rotated only to creators and excluded from list
projections and screenshots. Ten join-code attempts per fifteen minutes per
account is a technical abuse bound, not a grant or membership policy.

The owner declined an additional project name field. Isolated project payloads
omit onboarding profile fields and use generic member references. This does not
make the shared Grow profile private: its current authenticated read policy is
broad, so production member access remains blocked pending the shared permission
migration. Neither users.name nor public-profile defaults are interpreted as
consent to disclosure. No alias field or new profile-setup step is added.

## Atomic operations and locking

- Create: validate bounded title/description and visibility; derive creator and
  server time; insert project, controls and creator lead in one transaction.
- Update: only creator, expected revision, supported live status values.
- Rotate code: only creator and expected revision. Old codes stop initiating
  requests; existing pending requests remain pending until a creator decision.
- Join: creator/member already present returns recorded unchanged result;
  otherwise one effective request per project/requester. New intents can renew
  a withdrawn/declined request, retaining prior decisions in transition history.
- Decide: only current creator; expected request revision; approval rechecks
  applicant eligibility and inserts ordinary membership atomically. Decline
  grants nothing. Competing decisions conflict rather than overwrite.
- Cancel: requester can withdraw their own pending request using its revision.
- Leave: member can leave their own membership; creator cannot leave and remove
  the required lead. Ownership transfer is not silently invented.

Actor/profile locks precede project and request locks. Decisions requiring two
profiles acquire them in UUID order; mutual cross-project reviews must not invert
that order. Project row locks serialize code/request/approval changes. Supported
profile/admission writers lock the same profile rows. Auth validation remains
point-in-time, not a lock against every administrator Auth mutation.

Every mutation uses a caller-bound UUID command with an exact validated request
and recorded result. Applied and unchanged outcomes are retry-safe; an old join,
cancel, approval or leave retry cannot repeat a later transition. Current member
authorization is checked before replay. Actor, authority and time never come
from form fields. Raw entities/requests/receipts are denied to API roles.

## Screens and observable acceptance

```text
Projects → My projects / Discover + search + next page
         → Start a project → title / description / visibility → create → detail
         → Join with code → pending → Your requests → withdraw / status
Detail   → public metadata, or private member/creator access
         → member references; own Leave (creator blocked)
Creator  → share/rotate code, edit stage/details, pending requests → approve/decline
```

Pages share Home/Lab/Profile navigation and use the existing ink/paper palette,
responsive cards, honest empty/unavailable states and keyboard/error focus.
Forms keep entered content after a failed/unconfirmed request. No fictional
project, team identity, progress percentage or activity metric is shown.
Bounded reads use pagination or state an explicit recent-record limit.

| Owner | Dependency | State | Evidence / next action |
| --- | --- | --- | --- |
| Main | Approved WEB-005 and live shape | Contract established | Implement isolated RPCs and pages |
| Read-only explorer | Grow schema/screens/privacy | Evidence collected | Do not copy instant join or unsupported roles |
| Main | Project identity decision | No extra name field | Use generic references and preserve existing privacy |
| Independent reviewer | SQL/UI candidate | Pending | Check privilege, locking and retry boundaries |
| Main | Current source and test accounts | Pending | Create/read/persistence, privacy and creator approval journeys |

Full acceptance requires genuine second-account pending/approval/private-access
and denial journeys plus actual concurrency. One creator account and sequential
SQL-role fixtures cannot prove those. Shared activation additionally requires
Flutter changes, legacy reconciliation and an approved migration/rollback.
# Account-switch protection

Project create, edit, join, withdrawal, review, leave and code rotation forms
carry the account that rendered them. The local server action compares it with
the freshly verified session before the project RPC. This is a stale-tab
consistency check, not a replacement for database authorization. An independent
source review and focused boundary tests passed; real two-account action and
cross-client acceptance remain unverified.

# Create retry receipt — isolated validation, 29 October 2026

Creation previously generated a new command ID after reload, so a committed create
with a lost response could lead to a duplicate. A guarded owner-scoped
[receipt reader](../supabase/validation/20261029013311_isolated_project_create_receipt_v1.sql)
is installed only in validation. Its transaction tests passed with synthetic
records rolled back; post-install checks found no test projects, anonymous
execution denied and direct authenticated receipt-table access denied. The local
server helper accepts only an exact saved receipt. An absent receipt is unresolved,
not proof that no creation is in flight. The local create page now records the
normalized command and payload in an account-scoped browser journal, retries the
same command and uses confirmed receipts to clear orphaned markers. Chromium
tests cover reload, concurrent tabs, account separation, missing journals and
stale markers. Clearing both browser stores or moving devices defeats this local
recovery. Real signed-in create/retry, UI recovery, second admitted-account
denial and true database concurrency remain unverified. This isolated work does
not authorize shared rollout.

Project reads, mutations and receipt lookup now require both the explicit
`ENABLE_PROJECT_CORE=true` flag and the pinned validation backend. The project
pages hide or replace action controls when this gate is closed. Configuration
tests and independent source review pass; actual gated authenticated journeys
remain unverified. A rejected or uncertain creation can still leave the browser
journal unresolved: clearing it safely requires a server-serialized resolution
that prevents an older in-flight create from committing afterward.

The local project form keeps unsaved text visible when browser storage fails and
preserves a second tab's distinct unsent text alongside the saved submission.
The isolated design preview uses a separate browser-storage namespace and blocks
both server actions. Rendered Chromium preview checks passed for storage denial,
two-tab conflicts, retry read failure and preview action isolation. The first
test attempts timed out because the form was filled while the boot loader made
the page inert; after allowing the loader to finish, public/preview acceptance
passed. The
separate marker-write-failure UI branch and actual signed-in behavior remain
unverified. These preview checks do not establish backend acceptance.

## Account-bound create resolution — isolated validation, 31 October 2026

The installed isolated backend now exposes a one-slot, owner-bound create intent.
Read-only inspection of its public function definitions confirmed these RPC
shapes:

- `public.get_own_project_create_intent_v1()` returns `clear` with a decimal
  generation, `unresolved` with a command ID, the exact four-key
  `{kind:'create',title,description,visibility}` payload (or `null` when it
  cannot be safely recovered), nullable saved project ID and generation, or
  `unavailable`.
- `public.mutate_project_for_account_v1(p_command jsonb,
  p_command_id uuid, p_create_generation bigint,
  p_expected_user_id uuid)` performs create registration atomically. There is
  no separate begin-intent RPC. Its saved result includes a project ID.
- `public.get_own_project_create_receipt_v1(p_command_id uuid)` returns the
  caller-owned saved receipt or SQL `NULL`.
- `public.ack_own_project_create_v1(p_command_id uuid)` returns an acknowledged
  result or a conflict.

Website create now requires a current verified member, the rendered account ID,
and the server generation. A server-recovered payload is authoritative. While
one create is unresolved, a different command or changed payload cannot be
sent; the same command, payload and generation are retried. The website checks
the owned saved receipt before acknowledging, and only routes to the project
after a matching acknowledgment or a read-back that proves the exact receipt
was already acknowledged. Malformed, stale, mismatched, failed or unavailable
states fail closed and do not claim that an uncertain create was not saved.
Other project operations continue to use the existing supported mutation RPC;
the old generic action rejects create commands.

The browser journal remains only as a same-device retry aid when a response or
browser session is lost. It stores the server generation with the exact command
and payload. Server intent and receipt state remain authoritative. If recovery
details are malformed, the UI blocks another create and offers a server-state
check where a command ID is available. The server-recovered payload is rendered
read-only; the only retry action uses its original command, payload and
generation. If an older browser marker has no matching receipt after the server
generation advances, the UI deliberately stays blocked, directs the member to
check My projects, and requests IDEALAB support if the outcome is still unclear.
It does not silently discard that marker based only on a missing receipt.

This implementation targets **only** `idealab-mec-validation`. It did not
change database schema or settings, query or write database rows, create test
accounts, or enable production project writes. The local validation SQL
candidates still differ from the recorded applied statements; see the
[migration ledger audit](quality/validation-migration-ledger-audit-2026-10-31.md).
The implementation has focused parser/action-boundary and browser-journal
checks, not a real signed-in database journey, cross-client check or true
concurrency test. Shared Grow rollout remains gated.

## Earlier bounded creation-intent proposal — historical, superseded

The following proposal predates the installed validation-only contract above.

The existing v1 mutation accepts an arbitrary command ID. A resolver can lock
the actor row and insert a permanent tombstone for that ID, but deleting a v1
tombstone would permit an old delayed request to create a project. An arbitrary
number of tombstones also needs an abuse and retention policy. A validation-only
tombstone quota would eventually exhaust without a safe reset; it is not the
production solution.

The proposed v2 contract uses a server-registered, owner-scoped intent containing
the normalized create payload, server-generated ID, server-set expiry and state.
Both create and resolution lock the actor and the intent in the same order, then
recheck account eligibility and intent state. Create accepts only an existing,
unexpired intent with the exact registered payload; unknown, expired, abandoned
or mismatched intents cannot create. Resolution returns the confirmed project if
creation committed, or marks the intent abandoned under the lock. If either
request waits behind the other, it must observe the committed result before
deciding; timeout, account changes and database errors remain unresolved.

To handle a lost browser journal or device change, an owner-only, bounded intent
list must allow the member to review unresolved submissions and resolve them;
it must not expose other accounts' payloads. Retrying must reuse the registered
intent and exact payload. Receipt and intent retention must cover the agreed retry
window; expired or removed intent IDs remain invalid, and cleanup must lock and
recheck state so it cannot race an in-flight create. A per-account active-intent
limit, expiry, receipt retention, handling of account deletion and treatment of
exhausted limits remain product/operations decisions, not implemented defaults.

One option is a durable per-account generation with a single current intent slot.
Starting and acknowledging an intent compare the expected generation under the
same account lock; a terminal acknowledgment advances it. Even if old terminal
details are later collected, delayed requests with the old generation cannot open
new work. A single slot would limit members to one unresolved creation at a time,
which had not yet been approved when this earlier proposal was drafted. If adopted,
cleanup must use the same lock order, and a missing old receipt must lead to an
unknown/check-projects state rather than a claim that nothing was created.

This guarantee cannot coexist with unrestricted v1 create writes. A coordinated
rollout must inventory website and Grow consumers, disable or reject v1 **create**
after both clients can handle the change, and preserve other v1 operations until
their separate compatibility review. Old queued clients must receive a clear
upgrade/unavailable response rather than a silent retry. Shared deployment also
requires migration/rollback review against the real Grow ledger and data.

Before activation, tests must exercise two independent database connections in
both lock orders, expiry during a wait, cleanup versus in-flight creation,
simultaneous resolution, payload mismatch, quota exhaustion, lost responses,
account switching/deactivation, cross-owner denial and old-client behavior.
Tests must establish the transaction isolation and actual Auth/Data API behavior;
the current isolated browser journal and sequential SQL assertions do not prove
these concurrency properties. This earlier section described a proposed
implementation before the validation-only create-intent functions were
installed; it is not the current website contract and does not authorize shared
rollout.


## Phase 0 shared cutover evidence - 4 November 2026

Grow HEAD a88ce7e uses separate direct writes for project creation and creator lead membership, instant self-join, leave and multi-step ownership transfer. Its dirty worktree already calls guarded project RPCs. Preserve that work. Revoking membership INSERT alone would strand legacy project creation after its first write. Coordinate both client entry points before the shared grant change.

A read-only shared aggregate found four projects, three membership rows, one project with a creator but no matching membership, no elevated non-creator memberships and no null project/user pairs. The guarded get_project_v1(uuid) function is absent. These counts establish migration test cases, not approval of existing rows.

The shared candidate must preserve project IDs and existing visibility, reconcile missing creator membership without broadening access, and atomically create the project plus lead membership for new records. Replace instant join with a pending request and creator approval. Keep ownership transfer gated until its own atomic contract is approved. Validate legacy record preservation and denial of direct API membership writes against a disposable deployed-schema baseline before any cutover.


The 4 November aggregate found no projects missing creator, timestamps, status or visibility, and none marked club-only. The disposable replay initialized a control record for each of two synthetic legacy projects, including one without creator membership. Repeating initialization kept the existing revisions and join codes. Project and membership rows remained identical. Evidence: `artifacts/database-runtime/runtime-1793782144562-0b494c1a.json`. This proves control backfill behavior only. Shared RPC activation and any creator membership repair require separate review.


The disposable replay loaded the existing guarded list and detail functions onto the reconstructed project tables. A synthetic nonmember could discover the public project but could not see its join code or fetch the private project. The creator could read the private project and its code without a creator membership row. Evidence: `artifacts/database-runtime/runtime-1793782440891-d0a883b6.json`. This uses a synthetic readiness predicate to isolate the read projection. Real admission, the shared privilege cutover and client integration still require acceptance.


The live catalog confirmed direct SELECT grants to anon and authenticated on both project tables. With the legacy policy and that grant, the disposable probe allowed anon to see a synthetic public project. After modeling grant revocation, anon lost direct project SELECT and detail RPC execution, authenticated lost raw membership SELECT and private-card helper execution, and the guarded signed-in projections still passed. Evidence: `artifacts/database-runtime/runtime-1793782687987-36677fe0.json`. No live row was queried for this probe.

Grow HEAD a88ce7e has additional raw membership readers in Home, Lab tool booking, and both Profile providers. Those must move to scoped reads before shared grant revocation. The inspected dirty worktree no longer uses those raw table references, but its replacement journeys need acceptance. The separate project Storage client still generates public URLs. Storage exposure is outside this SQL proof.


Read-only shared Storage inventory on 4 November found an empty public projects bucket, zero populated project showcase URLs, and no project-banners or portfolio buckets. Grow defines public-URL helpers for project images and banners, but the source scan found no callers beyond their declarations in the inspected worktree or HEAD. There is no observed project media to relocate in this snapshot. Keep uploads disabled until a reviewed private Storage policy and cross-client authorization are verified. Recheck counts at cutover.


The disposable `node scripts/db-runtime.mjs --project-admission` run loaded the shared profile candidate, Lab readiness guard and isolated project RPCs together. A synthetic account saved its profile and declared MEC eligibility through the profile RPCs, then created and read a private project as creator. After an Auth ban, the same SQL identity was denied project listing. The transaction rolled back and the scratch cluster was removed. Evidence: `artifacts/database-runtime/runtime-1793783230043-d32fd0e7.json`. This exercises the admission implementation with synthetic Auth, not hosted provider or client behavior.
