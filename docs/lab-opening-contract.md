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
profile/claim writers lock the same profile row. Auth email/session verification
is a current check, not a serialized lock against every possible administrator
Auth mutation. Direct privileged claim edits must follow the profile locking
contract. Journal foreign keys retain actors and therefore prevent deletion of
referenced profile rows; production retention/anonymization needs review.
# Account-switch protection

The local opening and closing form is bound to the account that rendered it.
The server compares that account with the freshly verified member before the
opening RPC; the RPC remains responsible for checking duty authority. Focused
boundary tests pass. A real two-account browser/action test remains unverified.
