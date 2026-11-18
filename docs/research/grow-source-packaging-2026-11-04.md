# Grow SQL source reconciliation checkpoint

Canonical tracking remains Grow issue #11 and web issues #4/#13 in Project #1. The [explicit inventory](grow-sql-source-inventory-2026-11-04.json) records 16 SQL dependencies: two already tracked and 14 untracked. Local Grow HEAD is organization commit `a88ce7eb357faa37e0b7b447b8ff43b4050092bc`; the 14 untracked files are absent from that tree. No hosted source-availability claim is made from local test success.

## Recovery and byte identity

Exact-byte recovery branch `backup/grow-sql-source-exact-20261104`, commit `3f6698c4697daad60d69b8c4ad6b37a43286f654`, preserves the 14 SQL files on top of that HEAD. All 14 committed blobs were SHA-256 checked against the inventory. It was assembled with an alternate index and raw blobs; original branch, index and dirty Flutter/Android work were preserved.

The earlier recovery branch `backup/grow-sql-source-reconcile-20261104` at `747230ca0c874b339e9fd75cff3c1e42ba73ee5c` used normal Git filters and is **not** the exact-byte source. Filters removed CR characters from the November profile migration, profile candidate, rollback and rollback checks. In particular, the installed migration's raw SHA256 `492fbccba41ac6db03836b2ab62b1a5e9d7349a278d0670f032e8b2daad297b0` became `08ac21a657767b299319bb7575d08795c2d993d6f6405b01e1d0c483c3d00671`. Preserve this distinction; do not overwrite either recovery reference.

SQL body line endings affect PostgreSQL function-definition fingerprints. An isolated source PR must preserve the intended raw bytes across Windows and Linux checkouts with narrowly scoped file attributes and verify packaged hashes before testing. Do not change global Git configuration or silently normalize the historical installed record.

## Next bounded source PR

Assemble in an isolated checkout from the organization base, selecting reviewed files from the exact recovery/inventory. Exclude unrelated Flutter/UI/Android edits. The two November migration records independently match installed ledger statement hashes, but the remaining candidate/public-profile sources and tests still need scoped security review before publishing.

The architecture guard currently blocks every migration addition. Keep that guard; propose a precise, documented exception for the two approved installed records, bound to their exact hashes, rather than disabling the migration boundary. Review applicable repository rules and execute required source, Flutter and SQL checks before an authorized push. Repo workflows showed no automatic DB installation, but external platform integrations have not been audited.

After the Grow source PR has actual successful hosted checks and independent review, update web CI to a verified revision containing every required dependency. The current `a88ce7eb` pin deliberately fails the new missing-source preflight. No source PR, remote code push, merge, live SQL installation or Vercel production update occurred at this checkpoint.
