# Request overlap attempt — not verified

The rollback-only scripts `mec_work_request_overlap_a.test.sql` and
`mec_work_request_overlap_b.test.sql` were dispatched concurrently through the
Supabase connector against the approved isolated project on 23 October 2026.
They derive the existing approved test identity without reading its private
profile or changing Auth/admission. A submits, holds its transaction eight
seconds, then rolls back. B requires at least three seconds waiting before its
submission returns. An independent metadata observation checks named sessions.

Observed result: A returned its successful rollback marker. B failed the
`observed submission wait` assertion. The activity observation returned no named
sessions. This does **not** establish overlapping transactions, lock exclusion,
or a database defect: connector dispatch may serialize or the observation may
have missed execution. The failed harness condition is retained, not counted as
a passing concurrency check. No repeated attempt was made through the same path.

A fresh aggregate query afterward confirmed zero requests, command receipts,
request events and archives. No committed fixture was retained. The test does
not prove committed receipt replay or head/cancel races even when overlap is
observed. Sequential retry and head-marker checks remain separate passed checks.

Next: use a reviewed harness with two actual simultaneous database connections,
bounded timeouts and observable blocking. Do not extract private database
credentials or substitute fabricated identities. Genuine browser acceptance
also remains blocked independently by Local browser use access.
