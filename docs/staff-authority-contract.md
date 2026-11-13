# Scoped staff authority

This is the scoped authority contract for issue #6. On 4 November the owner
confirmed that Student Ambassador and Super Admin have equal in-app
administrative powers, including operational Head assignment, revocation and
handover. This authority does not grant Supabase service-role credentials,
database ownership, GitHub organization ownership, Vercel ownership or access
to production secrets. Top-role appointments and changes use an audited trusted
roster process; users cannot elevate themselves.

The local [SQL candidate](../supabase/validation/mec_staff_scope_candidate.sql)
now stores distinct assignments in `staff_scope_assignments_v1` and append-only
changes in `staff_scope_history_v1`. A scope-row-locking trigger enforces a
maximum of two distinct active assignments for machine scopes and preserves a
one-head limit for other scope kinds. Its guarded
`set_staff_scope_head_v1` command takes the scope, expected revision, target head,
explicit `assign` or `revoke` action, reason, command ID and expected signed-in actor.
The actor must currently be an active, unbanned, verified Super Admin or
Student Ambassador.
An identical retry returns the saved revision. A changed payload with the same
command ID fails. Replaying an earlier result never restores an old assignment.

The private guard is available only to trusted database functions. It checks
current account state and takes a scope lock before the business mutation. The
calling function must derive the scope and kind from a protected resource.
Authentication and authorization remain required before any receipt is returned.

| Action | Required authority | Boundary |
| --- | --- | --- |
| Assign, revoke, or hand over duty | Active Super Admin or Student Ambassador | Exact assignment and scope, with a reason and expected revision; trusted roster process and audit trail |
| Prepare estimates and publish rate versions | Assigned Machine or Operations Head | The request and rate belong to the head’s current scope |
| Start machine work or record actual use | Assigned Machine Head | Current scope and accepted estimate revision, with machine safety rules checked separately |
| Verify payment | Assigned head for the work request | Exact final bill, submitted transaction ID, and any required student approval of an increase |
| Create an event | Assigned Event Head | Create within an authorized event scope. No existing event-specific assignment is needed for creation. |
| Publish events or change registration rules | Assigned Event Head | Exact event scope, with capacity and paid-event gates checked independently |
| Accept an estimate or increased final bill | Request owner | Exact estimate or bill revision and explicit consent |

The database derives the actor from the verified session and resolves scope from
the stored resource. Client claims about roles, scope, ownership or authority
never grant access. A generic staff role and project ownership do not grant
head privileges. Keep payment references and personal data out of public
projections and general audit summaries.

## Grow compatibility boundary

Grow's checked-in initial schema defines account-wide `base_role` and
`system_role` values, including `machine_head` and `operation_head`.
The shared profile migration instead checks the deployed account role set
`student`, `lab_admin`, and `super_admin`. Neither representation
establishes an assignment to a specific resource. Do not translate a legacy
head label into permission to act on every machine or request.

Use approved resource identifiers on both clients. The Grow tools table has
individual catalog IDs and categories, but a category alone does not identify
a room or establish who is responsible for a machine. Map existing catalog
entries to approved scopes before enabling assignment, and leave unmapped
resources unavailable for staff mutations.

## Proposed handover behavior

Use one stable authority row per scope as the transaction lock. Staff mutations
lock that row before the affected request, rate or event. Top-role mutations
take the same lock, verify the expected revision and update the assignment and
audit event atomically. For operations spanning multiple scopes, lock scopes in
stable identifier order. Recheck active account and current assignment after
acquiring the lock, before returning a command receipt or writing data.

An action that acquires the scope lock first may finish before revocation. An
action that acquires it after revocation must fail without side effects. Handover
preserves the existing request state, accepted quote, bill and audit trail.
Revocation alone leaves open work awaiting reassignment. A revoked head cannot
replay an old command to read a private receipt or advance work.

This candidate restricts deleting a profile while it is assigned as a head.
Super Admin or Student Ambassador must explicitly revoke that assignment first so the
revision and audit stay complete. Account deletion integration must explain and
complete this step. The audit retains actor and head identifiers, and its
retention/anonymization must be reconciled with account deletion before release.
The candidate [rollback](../supabase/validation/mec_staff_scope_rollback.sql)
requires removal of dependent APIs first.

The focused PostgreSQL 16.1 disposable runtime passed `--staff-scope`, including
the machine two-head capacity race, competing approvals, revocation, history
and rollback. Evidence:
`artifacts/database-runtime/runtime-1793797213056-19d61bd1.json`. It separately
passed the event-draft/read suite:
`artifacts/database-runtime/runtime-1793796860829-c4109916.json`. These runs
validate the local candidates only. A subsequent portable PostgreSQL 17.11 run
passed `--staff-scope-shared`, applying the revised candidate to Grow's synthetic
shared-profile fixture and rolling the transaction back. Evidence:
`artifacts/database-runtime/runtime-1793802240924-0349fdcc.json`. See
[runtime provenance](quality/pg17-runtime-provenance-2026-11-04.md). This is not
a faithful live-schema replay or exact minor-version parity with shared PG17.6.
Live Supabase API and Next.js/Flutter journeys remain release gates.

Independent review found no direct API table access for ordinary members, but
the candidate does not record who appointed or revoked a Student Ambassador.
The Lab opening-permission roster likewise lacks appointment/revocation history
in its candidate. Before staff or Lab-core activation, connect these rosters to
an explicitly audited trusted process or add a reviewed append-only audit path
with actor, time and reason. The named roster maintainer and backup are still
outstanding. Do not infer that infrastructure audit logs provide this evidence.

Website CI now includes a required `staff-authority-sql` job on Ubuntu 24.04.
It runs the minimal-schema permission, concurrent-session and rollback checks,
the Lab roster's banned/unverified admission denials, and the private event-draft
rehearsal. The current workflow installs PostgreSQL 17 from the official PGDG
repository after checking its signing-key fingerprint. GitHub's
[pinned runner inventory](https://github.com/actions/runner-images/blob/799bcd0daf03c14c460e2662bcc9ca94a4a8aaa8/images/ubuntu/Ubuntu2404-Readme.md)
documents that database runtime. Missing binaries or a failed/skipped SQL job
fail the Required gate. Workflow YAML was checked locally. Hosted execution
remains pending because this work is local. The full shared-profile rehearsal
requires the sibling Grow source and remains a local check.

| Owner | Dependency | State and evidence | Next action |
| --- | --- | --- | --- |
| Main | Assignment and scope guard | Local implementation, sequential and two-session SQL checks passed | Integrate the reviewed resource catalog and client flow |
| Independent security reviewer | Candidate, permissions, retries, deletion, concurrency | No ordinary-member table access found. P2: top-role and Lab-core roster changes lack candidate-level audit history. | Resolve roster audit path and review the exact installation plan |
| Main | Grow shared profile compatibility | Revised candidate passed focused PG16.1 tests and the synthetic shared-profile fixture on PG17.11. | Rehearse faithful deployed schema; verify Supabase JWT/API and Flutter callers |
| Owner and main | Resource roster and deletion workflow | Two-head assignment history and concurrency candidate are present; roster audit/maintainer and backup remain unresolved. Active-head deletion requires revocation/handover. | Name the verified roster maintainer and backup, map scopes, agree audit anonymization and trusted roster logging |

## Acceptance before release

### Trusted roster intake

The owner may supply each person's email and position, plus machine scope for
Machine Heads, and identify the roster approver and backup. Keep the actual
roster and account identifiers outside this public repository and GitHub issues.
An email is a lookup aid, not authorization by itself: resolve it to the exact
verified account UUID, show the proposed position/scope for review, and bind the
appointment to that UUID. A missing or unverified account stays pending; do not
create an account or grant authority based on user-editable metadata.

For each effective appointment or revocation, retain the target UUID, position,
scope, approving actor, timestamp, reason, previous revision and command receipt
in the reviewed trusted audit path. Reused email addresses must not inherit an
old appointment. The intake list supplies no Supabase, GitHub or hosting rights.
Preparing this mapping does not authorize installing unreviewed live SQL.

### Release checks

- Verify the authoritative machine, room, service and event scope catalog.
- Verify an assigned Event Head can create a draft in scope, while a caller
  without that assignment or acting outside the scope is denied.
- Verify unrelated heads, inactive accounts, anonymous callers and ordinary
  students cannot use staff operations or view private staff records.
- Verify both top-level application roles can perform approved assignments;
  neither can self-elevate or use application authority to access infrastructure
  credentials.
- Verify the database rejects a third distinct active Machine Head for one
  machine scope and allows either active assignee to act.
- Exercise revocation and handover against concurrent staff writes using two
  database sessions. Verify retry behavior and stable audit attribution.
- Review the shared migration and rollback with both Next.js and Flutter, then
  exercise a genuine Super Admin assignment and scoped head action in isolation.


## Confirmed role and assignment decisions

Student Ambassador and Super Admin are separate roles with the same
administrative powers, including staff assignment, revocation and handover.
The current SQL candidate recognizes both roles and supports multiple Machine
Head assignments, but remains validation-only pending the shared-profile and
roster-audit gates. Authorization must use trusted server-managed appointments, never a
display label or user metadata.

A machine scope can have two assigned Machine Heads. Either current assignee
can approve work or booking requests for that machine. Focused disposable tests
cover independent revocation and concurrent assignment/approval. An approval still applies to the exact
request and revision.

Web, Tech, Patent & Documentation, and Design Heads each get a separate
dashboard with access scoped to their own team's records. Those roles do not
inherit Machine, Operations, or Event Head authority.
