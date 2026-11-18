# Future-table default privilege review

Issue #4 remains the canonical tracker. This is a finding and disposable behavior probe, not an approved migration or live fix.

## Observed live metadata

The [read-only default ACL capture](../research/shared-default-acls-2026-11-04.json) records public-table defaults owned by `postgres` and `supabase_admin`. Both grant anon/authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and MAINTAIN. The installed first permissions patch revoked the four extra privileges on 19 existing tables only. It did not change future-object defaults.

RLS does not constrain TRUNCATE. These grants prove privilege inheritance; they do not prove that PostgREST directly exposes TRUNCATE or establish a reachable API exploit. No live truncate or permission-write attempt was made.

## Disposable proof

`node scripts/db-runtime.mjs --default-acl-probe` passed on PostgreSQL17.11. Evidence: `artifacts/database-runtime/runtime-1793807688212-7c15ec94.json`. Two synthetic creator roles model the captured default ACL behavior. Forced-RLS reads hide the fixture rows, while the inherited TRUNCATE succeeds in a rollback-safe subtransaction. After schema-scoped narrowing, future tables deny the four extra privileges and deny TRUNCATE, while ordinary DML ACLs, service-role rights, existing table grants, non-public defaults and function/sequence defaults remain unchanged. The entire probe rolls back and the owned cluster is stopped and removed.

The synthetic superuser can prepare both creator roles; that is not evidence that the live inspection role has provider-owned maintenance authority.

Independent review confirmed the probe assertions. It compares sequence/function default ACL metadata, rather than creating those object types after narrowing, and does not seed a conflicting global PUBLIC-grant case. An operational candidate must still test its own authority/global-default preflight and rollback; this probe is not that candidate.

## Authority and correction boundary

Read-only role metadata shows `postgres` is nonsuperuser and not a member of `supabase_admin`; `supabase_admin` is a provider superuser. Do not attempt to elevate the inspection role or silently skip an owner scope. A reviewed owner-specific candidate must verify creator authority, baseline defaults and absence of conflicting global grants before changing schema-scoped defaults. Preserve DML, service-role, sequence/function defaults and private schemas. The provider-owned scope needs an authorized platform path if it cannot be changed by the application migration owner.

Meanwhile, every proposed public-table migration must explicitly revoke unwanted inherited rights and prove the resulting ACLs in its disposable tests. Do not apply migration003 unchanged or assume a newly created table inherits only ordinary DML. No production candidate has been installed or approved by this report.
