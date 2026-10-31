# Shared Grow/Flutter compatibility — current checkout audit

Read-only source and project-status check, 1 November 2026. This records the
current local Grow worktree separately from the older versioned snapshot in
[the 23 October compatibility checkpoint](flutter-compatibility-2026-10-22.md).

## Scope and limits

- Website source: `MEC-IDEALAB/IDEALAB-MEC-WEB`, merged `main` at
  `3bb0893c88060cbab1b0bfdc7d39156564fa0efb`.
- Grow Flutter source: local worktree at
  `F:\kannan\projects\IDEALAB\Grow`, branch
  `codex/fix-remove-unverified-home-content`, HEAD `a88ce7e` tracking
  `origin/rc5-release-candidate`.
- The Grow worktree has extensive tracked and untracked changes across auth,
  routing, profile, projects, requests, tests, CI and docs. It was inspected
  read-only; no Grow files were changed, staged, reset or tested. Findings below
  describe this uncommitted snapshot and are not release evidence for a merged
  Grow revision.
- A current Supabase project list reports `idealab-mec-validation`
  `ACTIVE_HEALTHY` and `grow-idealab` `INACTIVE`. No database tables, user rows,
  Auth settings or migration bodies were queried. Neither project was resumed,
  paused or changed.

## Compatibility code present in the local worktree

The Grow worktree contains new, untracked files for an exact own-profile
contract, validation-only profile reader/writer and focused tests:

- `lib/features/auth/domain/own_profile_contract.dart` parses an exact
  `get_own_profile_v1` response, including the six profile values, role,
  activity, version, revision and MEC-admission state. Parsing does not itself
  authenticate the caller or enforce database access.
- `lib/features/auth/data/validation_profile_reader.dart` is hard-gated to the
  isolated validation-project URL and an explicit build-time flag. Its own
  comment says the reader is not wired into routing and grants no screen access.
- `lib/features/auth/data/validation_profile_writer.dart` serializes only the
  six profile values and calls the validation API; its presence does not prove
  deployment or runtime use.

The modified auth repository and active onboarding/router code were checked for
integration. They still contain direct `public.users` reads/upserts and updates;
the active RC5 onboarding writes `profile_completed` directly, and profile
migration retains a direct `college_roll` update. The new reader/writer are not
called by those paths. The tracked Grow migrations were not modified in this
worktree, so the new RPC contract does not yet have a coordinated migration in
the visible shared source history.

## Release conclusion

The current checkout shows useful prototype work, but it does not establish
shared Grow compatibility, safe production account activation or successful
cross-client acceptance. Keep production member access disabled. Before a
shared rollout, the Grow owner must commit and review the coordinated auth,
router, onboarding and profile changes with their migration; then verify the
matching schema and authorization rules in an approved active environment and
run the Flutter and website journeys against the same account contract.

No live identity, profile, claim, permission or operational record was read or
changed by this audit.
