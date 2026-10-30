# Own visit reads — isolated architecture slice

This records the earlier read-only slice. Isolated check-in/out writers are now
installed separately; see the [write contract](visit-writes-contract.md) and
[actual verification](quality/own-visit-writes-2026-10-22.md).

Scope: user-requested Home/Lab/Profile backend work. Target only
`idealab-mec-validation`; shared Grow remains read-only. No copied production
records, new Auth identity, visit creation or fabricated attendance.

Use the existing Grow `public.lab_sessions` entity and inspected production
columns/defaults/FK: id, user_id, checkin_time, checkout_time, purpose, created_at.
The isolated project did not contain this table. Preserve nullable legacy shape;
a malformed/null check-in timestamp becomes unavailable in the consumer, never
an empty history. No historical record is silently rewritten.

The new bounded `get_own_lab_visits_v1()` has no user-ID argument. It runs as
the caller, uses an empty search path, and reads up to 20 owner rows with open
visits first and deterministic timestamp/id ordering. It exposes no created_at,
other users' purpose/attendance, or occupancy count. Table RLS checks owner,
current verified nonanonymous identity, active own profile and either admitted
Student or trusted staff. No API insert/update/delete grant exists.

The website rechecks `requireMember` before invoking the read, validates exact
owner-bound rows and keeps unavailable distinct from a successful empty result.
Home/Lab show own visit status; Visits shows bounded history. Test workspace data
is explicitly labeled separately from live Grow records. Multiple open records
are ambiguous and unavailable rather than selecting one silently.

The owner replaced fixed visiting hours with [core-controlled opening](lab-opening-contract.md).
Check-in/out remains dependent on atomic current-open enforcement, server
timestamps, one-active-visit enforcement and idempotency. Events,
projects and bookings remain separate contracts; this read cannot confer their
permissions or claim full Lab completion.

Release requires actual same-account reads and meaningful cross-owner/identity
denials in addition to catalog checks. Shared migration must reconcile legacy
rows, grants and supported Flutter clients before activation. Do not replay the
old production policies or widen raw session reads to obtain visitor counts.

Source: [candidate SQL](../supabase/validation/mec_own_visits_read_candidate.sql),
[SQL checks](../supabase/tests/database/mec_own_visits_read.test.sql).

Own visit reads and check-in/out actions require `ACCOUNT_ENVIRONMENT=validation`, the pinned validation backend, and `ENABLE_OWN_VISITS_VALIDATION=true`. This flag is false by default and must remain false in production and standard previews until a separately reviewed production contract exists.
