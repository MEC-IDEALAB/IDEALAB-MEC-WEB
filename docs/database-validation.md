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
