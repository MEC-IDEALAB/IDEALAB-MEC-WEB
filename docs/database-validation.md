# Local database validation preparation

The website has an isolated **native PostgreSQL runtime smoke check**. It
creates no application schema and does not connect to the existing Windows
PostgreSQL service or shared Supabase project. This prepares a local SQL test
route; it does not clear the [shared backend gate](backend-readiness.md) or
approve the [profile contract proposal](shared-profile-contract-proposal.md).

## Run the native smoke check

Use Node 24 and an existing PostgreSQL installation, with `postgres`, `initdb`,
`pg_ctl` and `psql` in the specified absolute directory. No tool is downloaded,
installed or upgraded automatically. For the verified Windows installation:

```powershell
$env:IDEALAB_PG_BIN = 'C:/Program Files/PostgreSQL/16/bin'
npm run test:db-runtime
```

The command refuses to accept an existing database address, data directory or
application SQL. In a fresh directory under ignored `artifacts/database-runtime`,
it creates a separate cluster, uses a random administrator name/password, binds
only to IPv4 loopback on an available port, disables Unix sockets and requires
SCRAM authentication. It removes inherited `PG*` client settings and runs `psql`
with startup files disabled and an explicit host/port/database/user/passfile.

On Windows, the helper requires an empty, current-user-owned scratch directory,
rejects reparse-point ancestors, sets a protected DACL granting only that user
inherited FullControl, then verifies the ACL and emptiness before any password
file is written. It does not change ownership or ACLs on the workspace parent,
existing service or existing database. POSIX scratch directories/password files
use private creation modes.

The smoke check verifies the connected data directory and loopback endpoint
before running a temporary-table transaction. It rejects a wrong credential,
checks the transaction result and rollback, stops only its generated cluster,
and confirms that server is stopped before removing its own marked directory.
It writes a sanitized, uniquely named JSON result under the artifact directory.
Missing prerequisites or failed assertions exit unsuccessfully; they are not
reported as skipped passes. If shutdown/ownership cannot be verified, the
directory is preserved for inspection instead of being recursively removed.
An uncatchable process kill can interrupt cleanup, so inspect that exact run
directory and its server status before any manual cleanup.

## Verified result and limits

For the Lab roster contract, run `node scripts/db-runtime.mjs --lab-presence`
with the same PostgreSQL binary setting. This fixed mode applies the checked-in
roster fixture, candidate and assertions inside a rollback transaction on the
disposable cluster. It checks API grants, denial without a caller identity,
student admission, or an Auth-banned account, and the roster projection for an
admitted caller. It also checks that the count stays accurate when the name list
is capped at 30. It uses synthetic identities and does
not verify Supabase Auth, PostgREST or the shared Grow schema.

For the staff assignment candidate, run `node scripts/db-runtime.mjs --staff-scope`
with the same setting. This applies a minimal synthetic account schema and
checks assignment, handover, revocation, stale revisions, role denial and audit
history inside a rollback transaction. It verifies the rollback removed those
objects, then installs the synthetic fixture only into that disposable cluster
to test real overlapping connections. Both revocation orderings and simultaneous
command retries are checked. The pre-use rollback must reject retained records,
then succeeds after this harness clears its synthetic records. Shared Auth,
PostgREST and Flutter compatibility still require separate verification.

The `--staff-scope-shared` mode requires PostgreSQL 17 and the sibling Grow
checkout. It applies Grow's shared profile SQL before the staff candidate,
then runs the same sequential permission fixtures. The fixture adds only
synthetic accounts and the Auth ban column used by this check. Everything runs
in a rollback transaction. The [recorded results and fingerprints](research/staff-scope-local-2026-11-03.json)
capture this scope alongside the minimal-schema concurrency runs.

On 21 October 2026, Node **24.19.0** and the existing PostgreSQL **16.1** binaries
passed private-directory, own-cluster identity, wrong-credential denial,
transaction/rollback and stop/removal checks. The fresh database used UTF8 and
the `C` locale. The [sanitized result](research/local-pg-runtime-2026-10-21.json)
is copied from the actual successful run. Earlier probe failures were corrected;
their generated clusters were stopped and removed. During setup, automatic
approval review rejected a separate removal command for an empty test folder
with “blocked by policy”; no credential was written in that folder.
The ACL helper also rejected the project root in a negative check, and the
root directory's security descriptor was unchanged. Junction-swap and abrupt
process-kill fault injection were not exercised.

This is **runtime preparation**, not an application security or migration test.
The recorded shared project uses PostgreSQL 17.6 and `en_US.UTF8`, so this smoke
run does not establish version/collation parity, normalized uniqueness, RLS,
profile provisioning or migration/recovery correctness. There is no Supabase
Auth, PostgREST, Storage or Google provider in this native cluster. No Auth
schema or member session was simulated. The command is optional local tooling,
not a successful application/backend job hidden inside the public CI gate.

Before migration acceptance, settle first-claim ownership and the remaining
technical field rules, independently review the actual SQL, and test it on the
approved target version and locale. Real Auth/Data API, account privacy,
concurrent saves and both Next.js/Flutter journeys remain required. Do not copy
the parent's unreconciled historical migrations into this cluster and call that
production compatibility.

## Primary references

- [PostgreSQL initdb](https://www.postgresql.org/docs/16/app-initdb.html)
- [PostgreSQL pg_ctl](https://www.postgresql.org/docs/16/app-pg-ctl.html)
- [PostgreSQL password files](https://www.postgresql.org/docs/16/libpq-pgpass.html)
- [PostgreSQL database collation metadata](https://www.postgresql.org/docs/16/catalog-pg-database.html)


## Shared migration history recovery - 4 November 2026

Read-only catalog and migration ledger on the shared IDEALAB MEC project recovered the original May DDL as [initial schema](research/shared-ledger-20260503073726.sql) and [RLS policies](research/shared-ledger-20260503073744.sql). These are historical evidence outside the migration directory. Both November migration files in Grow match the respective live ledger fingerprints.

The May account role check permits student, core_team, op_head and faculty. The current live check permits student, lab_admin and super_admin. The four recorded migration bodies alone do not explain that change. Reconcile the intervening schema drift against an approved disposable baseline before any shared rollout. No migration was run.


Disposable PostgreSQL 17.6 replayed both recovered May ledger entries using synthetic Auth objects and created eleven public tables. The live catalog has nineteen public tables. November hardening refused the reconstructed baseline at its table/ACL fingerprint check. Evidence: runtime-1793780574226-85d98bbd.json. Next: prepare a reviewed schema-only baseline from the deployed catalog and compare grants before rehearsal. No shared database writes.


The [public catalog snapshot](research/shared-public-catalog-2026-11-04.json) records 19 table privilege summaries, 187 column descriptors, 71 constraints and 60 policies. It contains no application rows and is not a restorable schema archive. In particular, authenticated INSERT on project_members remains granted. The policy checks only that the inserted user_id equals auth.uid(), while the role constraint accepts admin and lead. Require a guarded join decision and negative transaction tests before project activation. No live write was attempted.


The disposable May replay reproduced a self-assigned admin insert into a synthetic private project using the observed authenticated INSERT grant. Revoking that grant denied a second direct insert and preserved the existing row. Evidence: `artifacts/database-runtime/runtime-1793781133038-f3c9b7af.json`. This is a local privilege probe. A shared migration still needs guarded replacements for legitimate Grow and web membership writes. The isolated project candidate expects those legacy tables to be absent and cannot be applied as written.


Project baseline parity: after modeling the observed stage-to-status rename, the disposable May replay matched all captured columns and constraints for projects and project_members, including the clubs foreign key. The direct membership write probe still reproduced the authorization gap on that shape. Evidence: `artifacts/database-runtime/runtime-1793781860884-e874380b.json`. This comparison does not cover full deployed policies, indexes, defaults, triggers or other tables. A shared candidate must extend existing tables and initialize control records for existing projects before guarded reads are enabled.

## Extended metadata checkpoint — 4 November 2026

A read-only catalog pass confirmed 19 public tables and three private profile-contract tables, including table owners, ACLs and RLS flags. It also captured 203 public/private function signatures, result types, owners, ACLs and definition hashes in [function fingerprints](research/shared-function-fingerprints-2026-11-04.json). Extension functions are included in that count. The [inspection query](../supabase/inspection/shared_function_fingerprints.sql) is separate from migrations and returns no function bodies or member records.

Grow migration `003_profile_ecosystem.sql` defines the eight extra profile tables seen in the live catalog. This is a candidate explanation for the difference from the recovered May schema, not proof of deployment. Defaults, indexes, triggers, exact function bodies and dependencies still need comparison before a faithful disposable baseline exists. Hashes alone cannot restore a database. Separate the current installed state from the pre-hardening ACL state expected by the November migration preflight; do not replay today's hardened grants as its original input.

### Shared backup restore acceptance

The [local PostgreSQL 17 restore rehearsal](quality/sql-ci-rehearsal-2026-11-04.md) exercises the archive workflow with fixture data. The shared backup drill remains open. On 5 November the shared project reported `ACTIVE_HEALTHY` on PostgreSQL 17 and the validation project reported `INACTIVE`.

1. The database owner records the approved backup source, disposable restore target, operator, access boundary, retention window and recovery objectives. Confirm the source and destination are distinct. Keep the target disconnected from production clients, callbacks and outbound integrations during the drill.
2. Verify which backup options are available in the project. If using a logical export, follow the provider procedure for roles, schema and data. Keep the archive encrypted in approved storage with restricted access. Record the timestamp, versions and artifact checksums in the private evidence register. [Supabase CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
3. Restore to the disposable target and record elapsed time and restore errors. Compare the four migration mappings, schema, grants, RLS, function ownership and execution permissions against the captured baseline. Check owner access and cross-account denial using authorized test identities. Use aggregate results in release evidence.
4. Verify the recovery inventory separately for Auth configuration, provider and sender setup, secrets and Storage objects where in scope. The database backup contains Storage metadata. Object recovery needs separate evidence. [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
5. Have the recovery owner review the measured recovery time and backup age against the approved objectives. Record the result, outstanding gaps and disposal of restored data under the approved retention rules. Keep dumps, credentials and identifiable records in the private evidence boundary.
The next read-only pass captured 94 default-expression fingerprints, 59 index-definition fingerprints and 10 noninternal trigger fingerprints, including relevant Auth triggers. See [structural fingerprints](research/shared-structural-fingerprints-2026-11-04.json) and the [inspection query](../supabase/inspection/shared_structural_fingerprints.sql). The snapshot includes state flags and function references while the query emits normalized comparison rows. Neither returns expression bodies or user data. Differences are investigation leads, not permission to change the shared database; PostgreSQL-version formatting differences must be resolved before claiming parity.

### Application table metadata capture

Use the [read-only table catalog query](../supabase/inspection/shared_application_table_catalog.sql)
from an approved SQL session. It captures table and column ACLs, policy
permissiveness, defaults, indexes, constraints and triggers for the application
schemas without reading rows. Keep the result in the approved private restore
evidence store. The query does not substitute for the backup or for collecting
the referenced roles, functions, extensions and managed Auth dependencies.

On 14 November, the query's aggregate result matched the isolated validation
catalog at 23 relations and 158 columns. Shared SQL access returned `28P01`;
a new shared capture is pending valid read-only access.

The [restore dependency inventory](../supabase/inspection/shared_restore_dependencies.sql)
collects schema and default ACLs, extensions, relevant roles and memberships,
and application-owned Auth trigger definitions. Its aggregate validation
returned three schemas, five extensions, six relevant roles and three
Auth triggers on 14 November. Compare the shared result with the retained
catalog and function fingerprints when SQL access is restored.

The [aggregate routine inventory](../supabase/inspection/application_routine_inventory.sql)
reported 42 private and 27 public application routines on isolated validation,
all with explicit ACLs. It counted 36 private security-definer routines and
none in public. These counts describe the validation catalog. Compare the
existing routine fingerprints against the private backup or reviewed migration
source for the shared restore rehearsal. Definition export by the connector was
rejected by automatic approval review.
