# Real own-visit read checkpoint

Target: isolated `idealab-mec-validation` only, 22 October 2026. User requested
Home/Lab/Profile UI and backend completion; this is one completed read slice,
not completion of the full operational pages.

## Authority and source

Read-only production catalog inspection confirmed the six existing Grow
`lab_sessions` columns, UUID/default timestamps and users FK. Production's
own-session policies do not enforce the newer verified/admitted contract and
its direct update contract is broader than checkout. No production change or
production record read/copy occurred. The isolated project previously contained
only users and the private admission tables.

The [architecture contract](../own-visits-contract.md) was implemented with forced
RLS, verified active owner access, admitted Student/trusted-staff gating and a
bounded invoker RPC. Independent review found no disclosure/bypass; its exact
13-field profile preflight finding was fixed before installation. Legacy null
timestamps and multiple open visits fail closed and have explicit parser tests.

Migration `isolated_own_visits_read_v1` applied with the 12 permission/catalog
assertions in the same operation. The same assertion suite then passed again
inside BEGIN/ROLLBACK. Post-check: zero visit records, forced RLS true, anonymous
RPC denied, authenticated table writers denied, existing completed profile intact.
No false visit or fabricated Auth fixture was inserted.

## Checks

| Check | Result and limits |
| --- | --- |
| Independent source review | Owner policy is nonrecursive; private records remain owner-bound; no API writers |
| SQL suite | 12 catalog/negative-role assertions passed; does not prove nonempty cross-owner or eligibility scenarios |
| Parser/unit boundaries | Full Node 24 suite: 64 passed, including five own-visit tests |
| Lint | Passed after replacing forbidden control-character regex with explicit code checks |
| Build/TypeScript | Passed |
| Real authenticated browser | `/app`, `/app/lab`, `/app/visits` show successful empty own-visit state and isolated-workspace label |
| Responsive | Three routes × 320/390/768/1366: 12 observations, no horizontal overflow |
| Security advisor | No new table finding; existing two intentional private deny-direct INFO notices and existing leaked-password protection WARN remain |

One test launch via `node --run` inherited Node 20 from shell PATH and failed
TypeScript loading. Explicit Node 24 invocation of the full test list passed all
64. This was an environment invocation failure, not a substituted test pass.

Rendered proof: [live own-visit history](../../artifacts/acceptance/live-own-visits-read.png).
The successful empty read is real database integration; it does not prove a
nonempty history or check-in/out workflow. No personal fields are in the proof.

## Remaining work

Await approved IST visiting hours and outside-hours behavior before enabling
check-in/out. Add server-derived timestamps, atomic active-session enforcement,
idempotency, audit and genuine acceptance. Second-account ownership/eligibility,
nonempty history, trusted-staff, limits/order and shared Flutter activation remain
unverified. Events, project membership, borrowing and occupancy counts require
their own reviewed contracts. No global occupancy count is inferred from own rows.

Profile already reads/saves through the separately verified owner contract.
Current web UI is Grow-inspired, but the shared production rollout and all
operational services are still incomplete. No push, merge, paid resource or
deployment was performed.

Existing password-security advisor remediation:
[Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
