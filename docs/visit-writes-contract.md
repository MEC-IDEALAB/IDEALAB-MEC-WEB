# Own visit transitions — isolated implementation

The owner replaced fixed visiting hours with core-controlled opening. This
continues the [own-read contract](own-visits-contract.md) and
[opening contract](lab-opening-contract.md), using the existing Grow-compatible
`public.lab_sessions` entity only in `idealab-mec-validation`. Shared Grow,
Flutter, other accounts and production settings remain unchanged.

## Behavior and boundaries

An active ready verified member can check in with a purpose while the current
recorded lab status is Open. Closed, unknown or unavailable status cannot create
a visit. One active visit per member is enforced by a partial unique index.
Checkout targets the exact owned visit and remains allowed after lab closure.
Core closing does not fabricate member checkouts. Attendance grants no machine
authority. Profile completion/admission and trusted staff paths remain as in the
existing member guard; opening duty is not required for attendance.

The versioned check-in/out RPCs accept only purpose/command UUID or exact visit
UUID/command UUID. The server derives actor and timestamps; no client clock,
role or user ID is accepted. Purpose is trimmed on website input, required,
at most 1,000 Unicode code points and 2,000 UTF-16 code units, with no control
characters except tab/newline/carriage return. The database validates its own
boundaries and stores the exact accepted request for retry comparison.

The private command ledger is keyed by caller and command UUID. Profile
`FOR UPDATE` serializes same-member commands and existing supported profile
mutations. Readiness is rechecked after acquiring that lock. A recorded command
is checked before current lab state, and its stored outcome is returned only
when action/purpose/requested visit match. Applied and unchanged outcomes are
recorded, so retrying an old check-in cannot create a later visit. Checkout
never resolves to a different currently active visit. Conflicting command reuse
and foreign/missing visit IDs return generic failures without disclosure.

New check-in holds the opening singleton `FOR SHARE` while inserting attendance.
Core Open/Close holds it `FOR UPDATE`; those operations serialize. Both follow
profile-before-singleton order, without locking the opener's profile afterward.
Checkout requires no opening lock. Timestamps are database-derived, with checkout
bounded below by its check-in time to handle clock rollback.

Private definer helpers intentionally cross denied raw-table boundaries after
current-caller authorization. Public wrappers run as invoker; raw attendance and
command writes remain denied to API roles. No service key enters the website.
Auth checks are point-in-time; privileged direct claim changes must honor the
profile-lock protocol. The isolated unique-index preflight requires the known
empty attendance baseline; it cannot silently reconcile legacy production rows.

## UI and acceptance

Visits holds the purpose/check-in form or current-visit checkout. Home/Lab show
current own status and link there. Lost responses say to refresh before retrying;
recorded outcomes never infer that an old visit remains active. Input survives
failure, pending actions disable resubmission, errors receive focus and saved
feedback focuses the current status. All records are explicitly labeled as
isolated tests; no test journey claims physical attendance.

| Owner | Dependency | State | Required evidence / next action |
| --- | --- | --- | --- |
| Main | Existing read/opening contracts | Installed only in isolated project | Versioned SQL, server action, Visits UI |
| Read-only reviewer | Candidate and known lock order | Source review passed; Unicode mismatch fixed | Production boundary review remains |
| Main | Approved isolated test account | Real browser passed | Closed UI, check-in, reload, close-then-checkout |
| Main | Test cases | 75 boundary / 22 catalog / 27 rollback checks passed | Actual overlap and cross-owner acceptance remain |

Shared rollout additionally requires coordinated Flutter writer changes and
legacy active-visit reconciliation. Sequential SQL-role fixtures cannot prove
browser auth or simultaneous-session behavior.

See [actual evidence and retained test state](quality/own-visit-writes-2026-10-22.md).
# Account-switch protection

The local visit form includes the account that rendered it, and the server
compares that value with the freshly verified member before making a visit RPC.
This prevents an old tab's check-in purpose being applied to a different signed-in
account. The form value is a consistency check, not database authorization; the
RPC still derives ownership from the verified session. Focused boundary tests
pass, while a real two-account browser/action test remains outstanding.
