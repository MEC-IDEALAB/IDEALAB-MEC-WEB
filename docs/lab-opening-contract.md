# Core-controlled lab opening

Owner decision, 22 October 2026: availability follows actual core opening and
closing, without fixed hours. Members see who opened/closed and the recorded
times. Separate duty periods can occur on one day. Broader staff operations are
out of scope. The owner authorized lab opening/closing permission for their
existing account only in `idealab-mec-validation`; this does not promote their
Student role or grant a Machine Head position in Grow.

## Architecture and acceptance

Production has no core assignment or lab-opening entity. Existing production
profile role grants are not a suitable new authority boundary. Keep production
read-only. Add private isolated capability assignments, a singleton revision lock
and an append-only transition journal. No client can read/write these raw tables
or self-assign permission. Assignment management UI remains out of scope.

Versioned member RPCs expose only status, decimal-text revision, the caller's
management capability and up to 20 recent changes containing action, display
name, duty label and server timestamp. No email, phone, registration or raw
profile records are disclosed. Empty history means **not recorded**, not closed.
Unavailable stays distinct from both. The private function checks current
verified identity and ready active membership; mutation additionally checks a
current explicit lab-opening assignment. Neither client metadata nor account
role alone grants this capability.

Open/close locks the singleton, verifies the expected revision and writes one
transition atomically. The actor and time come from the database. A UUID command
key supports retries without duplicate transitions; reusing it with another
actor/action is rejected. Concurrent stale writes return conflict; repeated
same-state changes do not append history. An initial explicit Close records a
real closed declaration. There is no automatic end-of-day closure, fabricated
schedule, automatic student checkout or machine access. Other authorized core
members can close a session; each actor is preserved in history.

Student attendance is a separate entity. Its [guarded writers](visit-writes-contract.md)
are now installed in isolation, using current opening state; shared Flutter
integration and production rollout remain gated. An open lab is not machine-operation permission. Member screens refresh
status automatically while visible and offer manual refresh; they show when the
status was loaded rather than promising a realtime subscription.

| Owner | Work | State / evidence | Next action |
| --- | --- | --- | --- |
| Main | Contract, SQL, UI | Implemented and installed only in isolated project | Student attendance integration next |
| Read-only explorer | Existing core authority | No trusted production core/status contract | Keep production unchanged |
| Independent reviewer | Privilege, race and disclosure review | Race and UI findings corrected | Recheck production-specific boundaries before rollout |
| Main | Tests and real browser | [Actual evidence](quality/core-lab-opening-2026-10-22.md) | Two-core/concurrency acceptance remains |

No production deployment, shared-role change or actual physical opening is
implied by transitions in the explicitly labeled isolated workspace.

Both status reads and the mutation action now require `ACCOUNT_ENVIRONMENT=validation`, the pinned validation backend, and `ENABLE_LAB_OPENING_VALIDATION=true`. The isolated flag is false by default and must remain false in production and standard previews; enabling the generic member flag alone is not sufficient.

Membership is rechecked after profile/capability locks. Existing supported
profile/claim writers lock the same profile row. The current local SQL candidate
also checks `auth.users.banned_until` and locks the Auth row before profile,
capability and state locks; this serializes the opening RPC with ban changes.
Direct privileged claim edits must follow the profile locking contract. Journal
foreign keys retain actors and therefore prevent deletion of referenced profile
rows; production retention/anonymization needs review.

## Auth-ban review update — 4 November 2026

Independent review found that a still-accepted JWT could reach the isolated
opening RPC after its Auth user had an active temporary ban. The local candidate
now denies banned identities on status reads and transitions, and the SQL
regression script covers active-ban denial, unchanged state/history, and access
after an expired ban. The candidate is source-only: its SQL regression was not
re-run because this workspace has no local PostgreSQL/Supabase runtime and the
isolated validation project is paused. No production database was changed.
# Account-switch protection

The local opening and closing form is bound to the account that rendered it.
The server compares that account with the freshly verified member before the
opening RPC; the RPC remains responsible for checking duty authority. Focused
boundary tests pass. A real two-account browser/action test remains unverified.

## Approved V1 attendance closure — 4 November 2026

The earlier statement that there is no automatic student checkout described
the initial opening-only slice and is superseded for the approved V1 attendance
contract. Lab opening and closure are explicit, audited actions by any verified
active Lab core member; one core member may open and another may close. There
is no fixed hours or holiday calendar.

Opening, check-in and closure serialize through the authoritative Lab state. A
closed Lab rejects check-in. One active session per member is enforced. When an
authorized close is recorded, the same transaction checks out all active
sessions at that exact server timestamp. Replaying the same close cannot create
duplicate history or change the checkout time. Lost responses and reconnects
must reload the server result rather than inventing a local success. A member
may request a correction; staff corrections are a separate audited record and
never overwrite the original close/checkout event.

The elapsed-time reminder is in-app only while the web app remains open; closing
the browser stops reminders. Recorded Lab closure still ends the session. This
does not claim operating-system push delivery. Public visitors see counts;
signed-in members see current names, subject to MEC approval. Utility status is
timestamped and becomes Unknown when stale.

The validation candidate now closes active sessions at the exact recorded close
timestamp in the same transaction. Manual checkout and closure acquire locks in
the same order, and tests cover both serialization orders, retries and exact
timestamps. `node --check scripts/db-runtime.mjs` and `git diff --check` pass.
The focused `--lab-opening` disposable test passed on portable PostgreSQL 17.11:
`artifacts/database-runtime/runtime-1793804415897-82e5e60d.json`. It exercises
concurrent opening, exact close timestamps, duplicate-close retries,
check-in/close serialization and both manual-checkout/closure orderings. The
cluster stopped and was removed. This uses synthetic accounts, not live Auth.
Independent review also found that Lab-core permission grants/revocations have
no candidate-level history; use the approved audited roster process or add a
reviewed append-only record before activation. Real core/member browser E2E and
correction-flow acceptance remain outstanding. No production schema or session
was changed.
