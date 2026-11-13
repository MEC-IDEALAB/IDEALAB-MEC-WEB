# Core-controlled opening — isolated verification

Scope: [opening contract](../lab-opening-contract.md), local uncommitted source
on `codex/modern-brutalist-home`, isolated project `gvvqlfachzbufstzoiwi`.
Shared Grow is unchanged. No production migration, push or deployment occurred.

## Passed

- Independent read-only exploration found no existing trusted core/opening
  contract. The candidate uses an explicit private opening capability, not
  client metadata or a Machine Head role inferred from the owner's example.
- Independent review caught a membership race; full readiness is now rechecked
  after profile/capability locks. Raw label bounds were aligned with the parser.
- Isolated migration `isolated_core_lab_opening_v1` applied successfully, with
  the same transaction running 30 catalog/sessionless-role assertions. A repeat
  of those assertions passed in a rollback transaction.
- The owner explicitly authorized one existing-account test capability. The
  account remains Student. No Auth identity, other core position, production
  assignment, student attendance or imported record was created.
- Sixteen SQL-role assertions passed and rolled back: opposite transitions,
  revision increments, read-after-write, retry, stale command conflict, command
  reuse conflict, unchanged status, later retry returning current revision,
  invalid input/overflow, and revoked-capability read/mutation boundaries.
  This suite uses the approved existing test owner as a managed SQL-role fixture;
  it is not independent browser authentication evidence.
- Actual existing Chrome login performed Open → Close → Open → Close, then
  reloaded. Status and history persisted. After the keyboard correction a
  further Open → Close passed: the new heading received focus and the saved
  live-region message remained. Six genuine isolated test transitions are kept
  as test history. No physical lab status is claimed.
- Home, Lab and Visits rendered at 320, 390, 768 and 1366 px in both themes:
  24 fully rendered observations, no horizontal overflow, correct persisted
  closed state, buttons inside viewport and 52 px high. Initial measurements
  before streaming/resize settled were discarded and repeated after visible
  status plus accessibility readiness checks.
- Independent UI review found feedback reset/focus loss and missing wrapping
  for long labels. Controls now preserve identity, focus the updated heading
  after success or error feedback after failure, and wrap the latest summary.
- Current-source Node 24 optimized build and TypeScript passed after these
  changes. Full ESLint and all 69 boundary tests passed before the final focus
  correction; targeted ESLint passed after that correction. The five new
  opening boundary tests are part of that suite. Documentation validation passed
  and `git diff --check` reported no whitespace defects.
- Safe screenshots: `artifacts/acceptance/core-lab-opening-history.png` and
  `artifacts/acceptance/core-lab-opening-phone.png`. No private email, phone,
  registration number, token or password is included.

## Limits and next work

The 16 SQL checks are sequential, not proof of simultaneous transactions.
Two different real core accounts, actual simultaneous open/close, concurrent
profile-revocation behavior and inactive/unverified role fixtures remain
unverified for this new RPC. The lock contract was independently reviewed.
Auth verification is point-in-time; direct privileged claim changes must respect
the documented profile lock protocol. Foreign-key retention needs production
deletion/anonymization review.

Student check-in/out writers remain disabled. Their next implementation must
atomically enforce current opening status, server timestamps, one active visit,
owner-only checkout and safe retries. Existing Flutter writers must be reconciled
before shared rollout. Broader staff/assignment administration is deferred as
requested; no assignment-management API was introduced.

Post-change security advisor: five INFO findings for intentionally deny-direct,
forced-RLS private tables without client policies (three new plus two existing).
The existing leaked-password-protection warning remains; see
[Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
There were no new warning/error-level advisor categories.

## Security candidate follow-up — 4 November 2026

An independent source review found that the installed isolated candidate did not
check an active `auth.users.banned_until` value. [Supabase documents](https://supabase.com/docs/guides/auth/managing-user-data)
that a temporary ban blocks sign-in but does not revoke already-issued sessions,
so the RPC boundary needs its own live Auth check. The local candidate now checks
and locks the caller's Auth row before the member/profile/capability checks; its
status-read functions are marked volatile so the row lock is honored. Rollback-
only SQL assertions were added for active-ban read/write denial, unchanged
revision/history, and continued access after an expired ban. The existing
idempotency replay revision behavior was retained because it matches the current
contract and test.

Verification is incomplete: `node --test scripts/lab-opening.test.mjs` passes
(6 client-boundary tests), and `git diff --check` passes for the candidate, but
the revised SQL assertions were not executed. No local PostgreSQL, Docker or
Supabase CLI runtime is available; the isolated validation project is paused
while the IDEALAB MEC project is active. This is a local, uninstalled source
candidate only. Do not deploy or claim the finding remediated in a database until
the SQL suite and ban/update concurrency check pass in a disposable validation
database.
