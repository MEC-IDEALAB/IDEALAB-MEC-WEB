# Events read dependency — 23 October 2026

The programme list and detail source are implemented. The reviewed read contract
is installed **only** in idealab-mec-validation as `isolated_event_read_v1`.
Production events, participants, provider settings and policies were not changed.
This does not complete WEB-006 registration, capacity, payment, attendance or
Events Head workflows.

| Owner | Dependency | State | Output/evidence | Review/QA | Next action |
| --- | --- | --- | --- | --- | --- |
| Main + source reviewer | Current shared schema | Verified read-only metadata | Live event_date/venue schema, RSVP uniqueness but no payment/status columns | No participant/event rows read | Shared policy/grant reconciliation before rollout |
| Main | SQL candidate | Installed in isolation | Forced-RLS table, no raw API grants; guarded private reads and invoker wrappers | Candidate and installed rollback suites passed | Real session/browser read acceptance |
| Main | Events frontend | Implemented locally | Status filters, bounded cards, detail facts, truthful empty/unavailable/missing states | 97 boundary tests, full ESLint and production build including TypeScript passed | Responsive/keyboard/detail browser checks |
| Independent reviewer | Authorization and disclosure | No introduced blocking defect found | Exact fields, current member predicate, nullable status/type, no tickets/counters/arbitrary remote images | Existing shared SELECT boundary remains weaker than MEC-ready access | Separate reviewed shared migration |
| Main | Live website | Running on loopback port 3015 | Current production build started successfully | Browser tool still reports Local browser use disabled | Resume browser acceptance after access is restored |

The SQL suite checks forced RLS and API grants, fixed function search paths,
public invoker/private guarded routines, sessionless and second-unadmitted
identity denial, successful empty list, 20+3 seek pagination with tied dates,
descending UUID tie order, exact status filters, cancelled visibility, legacy
null enums, safe detail fields, missing detail, invalid status and partial cursor.
Managed fixtures roll back. Only the existing admitted Student identity was used
for positive reads; a genuine trusted staff read remains unverified.

Installation used an explicit outer transaction. After the candidate, tests ran
inside a savepoint which was rolled back before commit, retaining the contract
without fictional programme entries. Fresh metadata confirmed the migration,
zero event rows and unchanged totals of two Auth accounts/two profiles. The
suite then passed again against the installed contract, with another rollback.

Anonymous HTTP checks against the restarted current build returned 307 to
`/sign-in?notice=session` with private/no-store for both Events list and a detail
URL; the public homepage returned 200. This verifies anonymous route protection,
not an authenticated member or rendered card journey.

The current security advisor returned one informational RLS-without-policy entry
for the new deny-raw Events table and the existing leaked-password warning:
[Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No new advisor warning/error was returned. Earlier advisor counts for private
objects are separate historical snapshots, not this result.

The first full-test invocation accidentally launched PATH Node 20 through
Node 24's `--run`, failing on TypeScript extensions. Running the package's exact
test file list directly with the bundled Node 24 passed all 97 tests. That
environment failure is not counted as a successful run. No test service or
simulated successful response replaces the required browser journey.

Images, live event imports, RSVP, fees, capacity and staff publishing are not
enabled. Null status/type is shown as unspecified rather than promoted to an
upcoming workshop. Descriptions are rendered as escaped plain text. Full
registration and trusted staff requirements remain in [the contract](../events-contract.md).
No current-source push, hosted CI, merge or deployment was performed.
