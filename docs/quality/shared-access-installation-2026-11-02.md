# Shared access patch installation — 2 November 2026

The owner explicitly approved the first scoped security patch. Supabase MCP
installed `shared_access_hardening_v1` on `grow-idealab`
(`huftzhfqnnslvnfzvbex`) at migration version `20261102083307`.

The canonical source is
`Grow/supabase/migrations/20261102083307_shared_access_hardening_v1.sql`.
It uses one atomic DO statement with baseline/function/column-ACL drift guards
and local timeout settings. Setting statement_timeout inside the running DO does
not establish a guaranteed 20-second wall-clock deadline for that statement;
future executions needing that guarantee must set it before issuing the DO.
The installation statement is byte-equivalent
after trimming outer whitespace to the statement stored in the live ledger.
The original [ACL/config snapshot](../research/shared-access-original-acls-2026-11-02.json)
and explicit Grow rollback candidate remain available; rollback is not automatic.

## Scope and actual verification

- Removed TRUNCATE, TRIGGER, REFERENCES and MAINTAIN from anon/authenticated
  on exactly 19 reviewed public tables.
- Pinned `get_user_role` and `set_updated_at` to `pg_catalog`; function bodies
  retain their original fingerprints.
- Denied anonymous/public execution of the role helper while retaining
  authenticated and service_role execution.
- Repeated the scoped candidate checks and temporary-table timestamp trigger
  against the installed state. A missing-identity helper invocation was denied.
- Compared effective SELECT/INSERT/UPDATE/DELETE, all public/storage policies,
  RLS flags, role distribution and aggregate account/profile/object counts with
  the immediate pre-install baseline: identical.
- Confirmed seven Auth accounts, six profile rows and one stored object.
- Confirmed the live ledger now has three migrations.
- Independent read-only post-install review confirmed the same effective grants,
  function settings and canonical/stored SQL parity (one statement, 3,662 bytes,
  MD5 `37356e044ead2b84bfd8e57ea4ee91be`).

[Sanitized installation and verification evidence](../research/shared-access-installed-2026-11-02.json)
contains tool results and boolean outcomes. No account field values, files,
credentials or provider tokens were read or recorded. The preceding atomic-form
trial was rolled back; this installation is a committed, separately approved change.

## Advisor result and remaining release limits

The function-search-path and anonymous-role-helper warnings are no longer
reported. Remaining advisor items are:
- [Extension in public schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public):
  existing `btree_gist`; relocation is outside this patch.
- [Authenticated SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable):
  intended caller-role helper access is retained; this warning is not suppressed.
- [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection):
  still reported disabled; Auth configuration was not changed.

This patch does not fix unrestricted account-row reads, writable authority
columns, missing profile/onboarding APIs, bucket policy mismatch or public media
visibility. Those remain tracked in the
[shared configuration ledger](../shared-backend-configuration-2026-11-02.md).
No genuine provider sign-in, email delivery, existing-session refresh or
both-client acceptance was exercised by this permissions patch.
