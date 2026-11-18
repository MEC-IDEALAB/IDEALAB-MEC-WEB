# Phase 1 database validation — 18 November 2026

## Scope and safety

Shared project `huftzhfqnnslvnfzvbex` was inspected read-only. No shared
production DDL, RPC, role, or data mutation was performed. Legacy Grow migrations
003–008 were not replayed. The index candidate and rollback were executed only
against the disposable synthetic PostgreSQL cluster managed by
`node scripts/db-runtime.mjs`.

## Fresh shared-project observations

- The performance advisor returned 8 `unindexed_foreign_keys` findings at
  `2026-11-18T09:35:52.100Z`.
- The strict `pg_catalog` query at `2026-11-18T09:36:21.175729+00:00` found 9
  foreign keys without a valid, ready, live, non-partial covering index.
- The extra strict finding is `public.tool_bookings.tool_id`. Its existing
  B-tree and GiST indexes are status-filtered partial indexes. The exact
  deployed advisor implementation/version was not verified, so this record
  documents the discrepancy without assigning cause to a confirmed advisor bug.
- The read-only migration ledger query at `2026-11-18T09:36:19.796921+00:00`
  returned four rows: `20260503073726`, `20260503073744`,
  `20261102083307`, and `20261102130200`. This does not establish complete
  schema provenance.
- Sanitized findings, timestamps, index metadata, and ledger rows are in
  [shared FK telemetry](../research/shared-fk-telemetry-2026-11-18.json).

## Candidate and disposable rehearsal

The dedicated
[candidate](../../supabase/validation/shared_fk_indexes_v1_candidate.sql) and
[rollback](../../supabase/validation/shared_fk_indexes_v1_rollback.sql) cover
the 9 strict catalog gaps. They are review artifacts only and remain
uninstalled. Candidate SHA-256:
`a3bb68ec57de2310e4f53cd71afaeef9720e6097b988f61b281345a4fc1e574a`.
Rollback SHA-256:
`b12bb675afce9ae0ad71038088088666aff82dfa58601277ea8f84f53e3b178b`.

Executed on 18 November using Node `v24.19.0` and PostgreSQL `17.6`:

```powershell
$env:IDEALAB_PG_BIN=(Resolve-Path 'F:\kannan\projects\IDEALAB\idealab-mec-web\.local\tools\postgresql-17.6-1\pgsql\bin').Path
node scripts/db-runtime.mjs --shared-fk-indexes
```

The command exited `0`; the runtime reported `result: passed`. The exact
structured transcript is preserved in
[the rehearsal output](../research/shared-fk-rehearsal-2026-11-18.json).
Observed assertions passed:

- Fresh candidate application and idempotent second application.
- Nine valid candidate indexes; the `tool_id` FK has a full B-tree index.
- Idempotent rollback; candidate indexes absent afterward.
- Unrelated indexes and the original partial `tool_id` index survive rollback.
- Ownership, project-intent, FK-baseline, name-collision, stale-telemetry,
  atomic-failure, and changed-index rollback guards behave as expected.
- Grants, RLS, constraints, and fixture rows are unchanged by the index
  candidate/rollback.
- Disposable cluster stopped and removed.

## Not established / next gate

This was a synthetic topology rehearsal, not a full restore of the shared
schema, performance benchmark, or production installation. The candidate needs
independent SQL/security review and a fresh target check before any separately
authorized installation. Full migration provenance and reconciliation of
objects absent from the four-row ledger remain open. No production change is
authorized by this evidence.
