# Shared event baseline — read-only, 3 November 2026

Supabase MCP reported `huftzhfqnnslvnfzvbex` active/healthy on PostgreSQL 17.6;
`gvvqlfachzbufstzoiwi` validation was inactive. The queries inspected only
catalogs, grants, policy expressions, trigger metadata and function signatures.
No event/member rows, credentials or payment content were read. No SQL writes,
project status changes or account settings changes were performed.

| Shared relation | RLS | Forced RLS | API-role write grants present |
| --- | --- | --- | --- |
| `public.events` | Enabled | No | anon, authenticated, service_role |
| `public.rsvps` | Enabled | No | anon, authenticated, service_role |

A grant alone does not establish a permitted anonymous write: RLS also applies.
The current relevant policies are:

- Event insertion checks a global `lab_admin`/`super_admin` role through
  `public.users`, without the new scoped Event Head assignment.
- Event selection checks `auth.role() = authenticated`.
- RSVP insertion and selection check only `auth.uid() = user_id`; the insertion
  policy does not express capacity, event audience, fee, admission or cutoff rules.

No non-internal triggers were reported on these two relations. A limited
`pg_proc.prosrc` scan for event/RSVP table words reported no relevant public writer
body. This is not an exhaustive dynamic-SQL/privileged-routine audit and does not
prove that every possible writer has been identified.

These observations confirm that the local event candidate's legacy-write
preflight must refuse this shared baseline. Do not install it by dropping or
weakening that check. Coordinate reviewed table/routine permissions, updated
Flutter callers and member read/write APIs, then verify genuine authenticated
flows before activation. See [Event Studio delivery](../event-draft-delivery.md).
