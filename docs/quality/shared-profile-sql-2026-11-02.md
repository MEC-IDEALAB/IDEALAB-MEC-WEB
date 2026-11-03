# Shared profile SQL verification — 2 November 2026

The revised local candidate uses existing Grow IDs, users.role and inactive/ban
state. It preserves non-NULL legacy registration reservations, creates the
reviewed whitespace/ICU unique index, and refuses normalized duplicates without
clearing data or creating admission. Raw uniqueness remains present.

The existing seven-account live Grow project was not used for positive fixtures
or profile writes. A temporary live ICU aggregate returned only two legacy
reservations, zero normalized duplicate groups and ICU version 153.121, then
rolled back. The older blanket-blocker negative test is historical and does not
describe the revised duplicate-only preflight.

## Actual disposable results

Node 24.22.1 with portable PostgreSQL 17.6 passed the fixed-file runner
`scripts/shared-profile-db-validation.mjs`. The
[source-bound evidence](../research/shared-profile-local-pg17-2026-11-02.json)
records SHA-256 for the runner and all seven SQL inputs.

The fixture emulates only the minimal Auth catalog/UID behavior. Synthetic
identities end in example.invalid; these are not real Supabase accounts or
provider-issued sessions. Actual SQL assertions exercised:

- Candidate catalog/grant/RLS/getter shape and fixed search paths.
- Missing identity, unverified/anonymous/inactive denial.
- Verified current-caller repair of a missing profile.
- Six-field save/readback, derived completion and stale-revision rejection.
- Rejected role injection, direct authority writes, private email/claim reads
  and cross-owner account visibility.
- Preserved legacy reservation save without automatic admission.
- Generic normalized save/claim conflict and collision accounting.
- Explicit declaration, later-statement admitted readback and lost-response retry.
- Auth-trigger fixture provisioning, metadata injection denial, confirmed email
  synchronization and role/ban/revision preservation.
- Trusted service-role index maintenance; tests caught a missing pure-normalizer
  EXECUTE grant, now limited to that function while private data remains denied.
- A separate normalized-duplicate migration branch aborts and rolls back its DDL.
- Original snapshot, installation and pristine rollback restore original account
  data, 19-column schema, ACLs, policies and RLS; a separate local database trial
  commits installation before rollback in a later transaction on the same held
  connection. A further committed-install trial reconnects through a fresh admin
  connection and restores from the private persisted catalog/fingerprint baseline.
  The baseline stores no raw profile rows, Auth passwords, tokens or sessions;
  API roles cannot read or write it. These are disposable operational rehearsals,
  not live rollbacks.
- Missing-snapshot rollback and rollback after populated new profile data are
  refused. The refusal preserves the new data and installed contract.
- Two independent connections observably contend on one account row; the stale
  concurrent save returns conflict without replacing the winning revision.
- Two independent accounts observably contend on the same registration value;
  exactly one claim succeeds, the loser retains its saved number/revision and
  records one generic collision, and no pending claim remains.
- Deferred pending-claim checks, full transaction rollback, wrong-password denial,
  fresh loopback identity and stopped/removed scratch cluster.

Early failures were corrected in fixture role boundaries and later-statement
readback. The final suite passed; no failure was suppressed or claimed as pass.

## Runtime provenance and boundaries

Used the [PostgreSQL-linked EDB portable archive](https://www.postgresql.org/download/windows/),
version postgresql-17.6-1-windows-x64-binaries.zip, with vendor-published
[SHA-256 provenance](https://github.com/EnterpriseDB/edb-installers/issues/744):
`d378882abd001a186735acd6f6ba716bca6ccd192e800412d4fd15ed25376b3e`.
The exact hash was checked before extracting/executing. The ignored local
runtime creates no Windows service and changes no existing database installation.

The SQL runner uses the existing private-directory ACL helper, generated local
credentials, explicit loopback connection settings and fixed sibling Grow SQL
paths. It accepts no existing database URL, credentials or arbitrary SQL path.
Successful runs clean up their owned cluster only after verifying shutdown.

Local locale C / ICU153.14 differ from Grow en_US.UTF-8 / ICU153.121. These
tests are useful SQL evidence, not full locale parity, real Supabase Auth,
PostgREST schema exposure, Storage, email delivery, Google sign-in, client
cutover or real Supabase concurrency acceptance. Rollback accepts either its
original TEMP snapshot on the same held connection or the reviewed, owner-bound
private persisted baseline from a fresh admin connection. Both modes require
explicit maintenance state, refuse after client activity and deliberately restore
the legacy permission weaknesses. Keep clients
offline and prefer a data-preserving forward fix after any writes. New-object
schema-drift checks are partial: the rehearsal is limited to the reviewed
pristine no-intervening-change runbook, not arbitrary later rollback. The candidate was uninstalled at this disposable verification checkpoint. It was
later installed with specific owner approval; see the
[installation report](shared-profile-installation-2026-11-02.md). Hosted production
auth remains disabled.

## Reproduce locally

Use Node 24 and the already verified PostgreSQL17 binary directory:

```powershell
$env:IDEALAB_PG_BIN = 'F:/kannan/projects/IDEALAB/idealab-mec-web/.local/tools/postgresql-17.6-1/pgsql/bin'
npm run test:shared-profile-sql
```

The optional command is not added to public CI because that runner does not
provide these verified native binaries or real backend services.
