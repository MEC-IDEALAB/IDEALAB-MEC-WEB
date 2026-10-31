# Validation migration ledger audit — 31 October 2026

## Scope and current project state

This is a read-only audit of Supabase metadata and migration text fingerprints for
`idealab-mec-validation` (`gvvqlfachzbufstzoiwi`). Supabase currently reports it
as `ACTIVE_HEALTHY`, PostgreSQL 17.11, in `ap-south-1`. Its migration listing
contains 19 entries. The project is an isolated validation environment, not the
shared Grow production database.

The separate `grow-idealab` project currently reports `INACTIVE` on PostgreSQL
17.6. The latest schema inventory in this repository dates to 23 October and
reported two migrations and unsafe shared profile permissions. A fresh
migration-list request timed out while the project reported inactive, so the
current Grow migration ledger could not be re-read. No resume was attempted.

No database DDL or application data was changed. No application rows, Auth
identities, tokens, or user records were queried. The migration comparison
returned only version/name, statement count, normalized statement length, and
MD5; it did not return raw SQL bodies or user data.

## Issue #18 validation migration mapping

The six project-create entries each contain one stored SQL statement. Local
candidate files live under `supabase/validation/`; their timestamps do not match
the versions recorded by the database.

| Database version / name | Local candidate | Local LF chars / MD5 | Stored LF chars / MD5 |
| --- | --- | --- | --- |
| `20261030221518` `isolated_project_create_intent_v1` | `20261031103000_isolated_project_create_intent_v1.sql` | 22492 / `38b59e7338651d29a9761d24b26e61dc` | 22493 / `901e8ff2ea17d7b2cc778d025f0f52e2` |
| `20261030221714` `isolated_project_create_intent_fk_index_v1` | `20261031114500_isolated_project_create_intent_fk_index_v1.sql` | 1446 / `0e67fad24bd633f4376e944caf88f377` | 1447 / `2e96ddd26fc605d743ece9dd3c847448` |
| `20261030223441` `isolated_project_create_generation_v1` | `20261031133000_isolated_project_create_generation_v1.sql` | 11116 / `95440838a4727f3bbfe78c0b74e17760` | 11123 / `640e64ce7a3c323d97cfde4b171c341a` |
| `20261030225748` `isolated_project_create_write_gate_v1` | `20261031140000_isolated_project_create_write_gate_v1.sql` | 13899 / `1ae1cad5be03750ed99f650949cbe0dd` | 13900 / `7829d0125d7ea31b872b87841434abff` |
| `20261030232930` `isolated_project_create_expected_actor_v1` | `20261031153000_isolated_project_create_expected_actor_v1.sql` | 1679 / `7b0851488f1221c1f453fd00b9d156a6` | 1678 / `268aa01ae23d238f15f8694db6d6b0fd` |
| `20261030235730` `isolated_project_account_bound_mutation_v1` | `20261031170000_isolated_project_account_bound_mutation_v1.sql` | 1579 / `4630346bae6e9106cb3b00b53ae6fc5e` | 1578 / `b98f2c0586f080cfc451b778a06caef6` |

Both local files and stored SQL were normalized to LF before computing lengths
and MD5 values. All six pairs remain different. This proves the candidates are
not byte-identical to the applied statements; it does not prove that the
differences change behavior. An independent reviewer reproduced the ledger
mapping and hash comparison. No migration was applied to produce this report.

## Migration workflow gate

The repository root has no standard `supabase/config.toml` or
`supabase/migrations/` directory. The existing validation SQL directory is not
a canonical CLI migration history, and the six local candidates are not exact
copies of the applied statements. Do not move them into a shared production
migration chain or treat the isolated project as a clean zero-state baseline.

Before further DDL, establish the documented [Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows),
link only to the explicitly approved validation project, reconcile an
authoritative schema baseline and migration history, verify the linked target
and inspect a target-specific `supabase db push --dry-run`. Keep Grow paused
until its schema, grants, RLS, Flutter clients and rollback plan can be reviewed
in a safe environment. No production migration or account activation is
approved by this audit.
