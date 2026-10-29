# Next-events read — 27 October 2026

Home and Lab use a bounded read for the next three records marked upcoming.
The database filters out past starts and orders by start time and ID ascending;
the existing full programme retains its descending pagination. The UI reports
empty and unavailable separately and does not imply registration or payment.

The candidate in `supabase/validation/20261027163627_isolated_next_events_v1.sql`
was generated with the official Supabase CLI 2.122.0 release (tag commit
`5afad870388552d0198087d27037da7ac745ba2b`; downloaded archive checksum verified).
The validation project identity was checked externally before application.
The candidate and `supabase/tests/database/mec_upcoming_events.test.sql` were
executed together in one explicit transaction, with fixture assertions inside a
rolled-back savepoint. The installed migration ledger records version
`20261027163627`, name `isolated_next_events_v1`. The tests were then rerun in
a separate transaction and rolled back.

The checks covered catalog privileges, empty results, sessionless and
unadmitted denial, past/cutoff dates, ascending order and tied IDs, the three-item
limit, exact projection and fixture cleanup. A post-install check found zero
Events rows, no anonymous wrapper execution, authenticated wrapper execution,
no authenticated direct Events SELECT, a public invoker and private definer.
Independent review found no blocking defect in the candidate/test arrangement.
Inactive/unverified/staff cases rely on earlier tests of the shared guard and
were not independently retested here. No shared Grow production change was made.

The validation security advisor still reports informational RLS-without-policy
findings for deny-raw tables and a warning that leaked-password protection is
disabled. See [the linter explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No new table or raw table grant was added by this migration.

The frontend parser enforces the bounded, cursor-free, upcoming-only projection;
an error or malformed response renders unavailable rather than an empty result.
Current-source Node 24.22.1 lint, TypeScript, 108 boundary tests and normal
production build passed. An authenticated browser journey for the new Home/Lab
section remains unverified.
