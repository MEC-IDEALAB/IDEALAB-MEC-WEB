# Applied validation project-create archive — 1 November 2026

## Scope and source

Two read-only queries against `idealab-mec-validation` (`gvvqlfachzbufstzoiwi`) retrieved six selected rows from `supabase_migrations.schema_migrations`, then independently computed each stored statement's UTF-8 byte count and SHA-256 on the database server. No Auth/member/session records were queried. No DDL, permissions, account data or migration-history entries were changed. Current project metadata reports validation active and Grow inactive; neither was resumed or paused.

The exact six statements are stored as data in [the archive](../../supabase/validation/ledger/project-create-applied.json). JSON escapes preserve original CRLF/LF differences inside the SQL strings. The archive is outside `supabase/migrations`, has no executor, and is not a deployable migration chain. It accounts for only six patches of the 19-entry validation ledger; earlier provisioning/profile/API changes and out-of-ledger changes still need a complete reviewed baseline.

## Recorded server fingerprints

| Applied version | Exact UTF-8 bytes | SHA-256 |
| --- | --- | --- |
| `20261030221518` | 22637 | `3e6bed5dcb7d0ccab1b9441a8885accab3cdefa4e1f6722dd629b605b9158292` |
| `20261030221714` | 1448 | `8cd41dc383ad604e7b2fe61482584941da64c4b0eb6500713ff8f5393cb576b7` |
| `20261030223441` | 11123 | `b768f0bb5ce2c665cddaa45b8965d951cc518731deecc431b2ae2817e7654221` |
| `20261030225748` | 13901 | `f0c709a4896055ace4d2088ebcc8f041bd951e39e690dfc510894be0da323205` |
| `20261030232930` | 1678 | `86b551b9e10e956af4f04dabed1ed4b54abe7c5f22c062917e269e2765d411f2` |
| `20261030235730` | 1578 | `ed3a7a770c8bd091f92e5ae5f31ceadc776192d855364388c09bfe55adc55af4` |

The combined payload is 52,365 bytes. The earlier [ledger audit](validation-migration-ledger-audit-2026-10-31.md) compared normalized LF candidate fingerprints. This record preserves the exact stored bytes instead, so lengths and hashes use different conventions. The six old candidate files exist in the separate issue18 worktree and are not tracked on current website main; the new archive preserves the actual installed patches without rewriting either candidate history or database history.

## Local verification and CI

Run from the website root with Node 24:

```powershell
node scripts/check-validation-ledger.mjs
node --test scripts/check-validation-ledger.test.mjs
```

The checker reads only the fixed repository archive and verifies selected project/environment/version/name/order, statement count, exact byte count and SHA-256. It has no database client, network call or SQL execution path and accepts no command arguments. The tests reject changed SQL, line-ending normalization, wrong project/environment, missing/duplicate/reordered records malformed fingerprints and sanitized invalid-JSON feedback. Documentation CI runs both.

This is an integrity comparison with checked-in observation metadata. An attacker who edits both SQL and fingerprints can make a self-consistent archive, so a pass is not authenticity proof or a fresh live-database comparison. Any archive update needs independent review and a new server fingerprint query. Current live schema could also differ from old migration text through later or manual changes; this archive does not assert object parity or production compatibility.

## Work status and next action

| Item | Owner | Dependency | State/evidence | Review/QA | Next action |
| --- | --- | --- | --- | --- | --- |
| Recover six missing applied patch sources | Main | Approved validation read access | Exact statement archive and server hashes collected | Local checker and six negative/positive tests passed | Independent review and hosted docs CI |
| Shared profile cutover | Main + Grow source reviewer | Full schema/RLS baseline and reviewed Flutter changes | Grow still has direct legacy profile writers; validation adapters are not routed | Live cross-client acceptance unverified | Integrate and test isolated profile flow, then plan coordinated production migration |
| Live website Google activation | Main + owner | Shared account contract and provider/callback acceptance | Source-disabled | Production auth unverified | Clear the shared security gates before activation |

The confirmed direction is one production account/database/validation contract for the website and renamed IDEALAB App. The isolated project remains for tests. This source-reconciliation step does not change that direction or clear account activation.

## Official workflow references

The [Supabase local-development workflow](https://supabase.com/docs/guides/local-development/cli-workflows) describes migration history and dry-run comparison. [Migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair) changes history entries; none was run here. A current changelog scan found no change needed for this read-only catalog export. Do not repair, reset, replay or push the archive to make history look aligned.
