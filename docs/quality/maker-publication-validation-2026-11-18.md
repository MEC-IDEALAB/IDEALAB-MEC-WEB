# Maker publication candidate validation — 18 November 2026

## Scope

The revised maker-publication candidate, rollback and SQL acceptance script were
run only on the repository's disposable PostgreSQL 17.6 cluster. The harness
used synthetic shared-account, staff-roster and maker-profile fixtures. It read
the repository's `20261102130200_shared_profile_contract_v1` migration; legacy
Grow migrations 003–008 were not replayed. No Supabase API or shared project was
accessed, and the scratch cluster was stopped and removed.

## Command and result

```powershell
$env:IDEALAB_PG_BIN=(Resolve-Path 'F:\kannan\projects\IDEALAB\idealab-mec-web\.local\tools\postgresql-17.6-1\pgsql\bin').Path
node scripts/db-runtime.mjs --maker-publication
```

Captured at `2026-11-18T14:53:06.799Z` with Node `v24.19.0` and PostgreSQL
`17.6`. The command exited `0` and reported `result: passed`. The structured
transcript is preserved in
[maker-publication-runtime-2026-11-18.json](../research/maker-publication-runtime-2026-11-18.json)
(file SHA-256
`A0D7F825A23639AADDE414B98BBAE024256405D8C587993EC3587DAEA84C35B0`).

Source hashes observed by the harness:

- Candidate SQL: `76e0b1708d5a59c76690594daab8ae77370bef091e516ba90f45456655579681`.
- Rollback SQL: `d0f1c017c8e9ae0ea3a01d8503210a8994ed392341234a9217621d7c41a84d88`.
- Acceptance SQL: `4668abb826464932bad4faa8edcd015fb06ff78ef9b3c8e8da7337230820f04b`.
- Shared profile fixture migration: `492fbccba41ac6db03836b2ab62b1a5e9d7349a278d0670f032e8b2daad297b0`.

## Observed checks

All harness assertions passed: isolated scratch identity and wrong-credential
denial; transaction and fixture rollback; private draft, publish, withdrawal
and takedown transitions; no anonymous profile resolver; atomic pre-use rollback
and fail-closed missing-marker behavior; ACL/audit identifiers; denial for null
admission and missing mutation marker; one winning concurrent publication (two
lock waiters, statuses `conflict` and `saved`); refusal to roll back after use,
including after fixture deletion; and scratch-cluster removal.

## Limits

This synthetic rehearsal does not prove compatibility with the complete shared
schema, live RLS behavior, anonymous endpoint rate limits, cache invalidation,
provider authentication, Grow application behavior or production suitability.
The public resolver remains absent and the source feature gate remains disabled.
Independent review and the documented cross-client, shared-schema and MEC
approval gates are still required; no production installation is authorized by
this test.
