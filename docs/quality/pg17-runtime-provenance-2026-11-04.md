# Portable PostgreSQL 17 test runtime

On 4 November 2026, the local test host had only PostgreSQL 16.1 and no Docker. A portable PostgreSQL 17.11 runtime was obtained to exercise the existing PG17-only disposable fixtures.

- Official distribution entry: [PostgreSQL Windows downloads](https://www.postgresql.org/download/windows/).
- Publisher archive page: [EDB PostgreSQL binaries](https://www.enterprisedb.com/download-postgresql-binaries?lang=en).
- The page's Windows 17.11 link used file ID `1260616` and redirected to `https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip`.
- Downloaded archive size: 381,531,864 bytes.
- Locally measured SHA-256: `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`. This is an integrity fingerprint of the downloaded artifact, not an independently published vendor checksum.
- `postgres.exe --version` reports PostgreSQL 17.11. Authenticode reports the executable unsigned; provenance rests on the official publisher HTTPS download, not an executable signature.
- Only `pgsql/bin`, `pgsql/lib` and `pgsql/share` were extracted into the new, excluded `.local/tools/postgresql-17.11-5` directory after validating every extraction target stayed within it. Existing tools were preserved.

No Windows service was installed and the PostgreSQL 16 installation was not changed. The existing harness creates private loopback scratch clusters, runs synthetic fixtures, then stops and removes those clusters. It never accepts a live database URL. PostgreSQL 17.11 testing does not prove exact minor-version parity with the shared project's recorded 17.6 runtime, nor does it prove live Supabase Auth, API or Flutter compatibility.
