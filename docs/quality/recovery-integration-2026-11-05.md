# Recovery boundary and isolated installation

This is a local implementation and isolated-validation checkpoint. Hosted login
and recovery remain disabled. Shared production SQL was not changed.

## Website boundary

The request-scoped reader in `src/lib/recovery-authority.ts` uses verified
`getClaims()` observations around a live `getUser()` call. It requires a stable
account/session, confirmed nonanonymous identity and fresh recovery AMR within
ten minutes. It rejects ordinary login, OAuth-only sessions, malformed claims,
future/expired timestamps and duplicate recovery AMR. Duplicate rejection is a
conservative rule pending real provider claim-shape verification.

The callback checks authority after PKCE exchange. Reset-password enables its
form only for that authority. Submission binds both the displayed account and
session, then requires an explicit successful consumption receipt before asking
Auth to update the password. Rejected or uncertain consumption prevents the
update. An uncertain Auth response requires a fresh link and never claims that
the password remained unchanged. Local session cleanup follows either update
outcome; cleanup failure is explicit.

Recovery is default-off. `ENABLE_RECOVERY_VALIDATION=true` permits only the pinned
isolated project in development with a loopback HTTP callback. Shared-local,
Vercel, Render, production and remote origins remain denied. The optional
`.next-recovery` build directory is isolated and ignored. Development request
logging is disabled; a nonsecret query-marker probe confirmed the marker was
absent from the local server logs.

## Validation installation

- Target: `gvvqlfachzbufstzoiwi`, isolated validation.
- Migration: `20261105172121_mec_recovery_consumption_v1_validation`.
- Candidate: `supabase/validation/mec_recovery_consumption_candidate.sql`.
- Candidate SHA-256: `34caca1041fc2c09ade2e9d17d478ee7797430bb9cc2c7c2efa91eb69f08e3c4`.
- Installation used an explicit transaction with three-second lock and
  fifteen-second statement timeouts.
- Independent review found no blocker for isolated installation. Live preflight
  confirmed the owner grants and private-schema usage required by the candidate.
- Post-install catalog checks confirmed pinned function search paths, no
  anonymous/service-role execution and forced RLS with no member receipt DML.
  A live rollback test as the authenticated role denied missing identity.

The PG17.11 disposable run
`artifacts/database-runtime/runtime-1793898824359-74d6e087.json` passed missing
grant/private-schema-usage denials, two-connection single winner, expiry after
lock waits, pre-use rollback and refusal to remove consumed receipts. It stopped
and removed its scratch cluster. No real Auth identities were fabricated.

## Evidence and remaining acceptance

Lint, TypeScript and 204 boundary tests pass. The optimized acceptance build and
public browser checks verify the disabled public paths separately. Independent
review also reran eleven configuration tests successfully. These checks do not
establish real email delivery, recovery AMR/revocation behavior, provider password
updates or direct Auth behavior after website consumption.

Automatic approval review blocked launching the isolated recovery test server;
the tool reported only `blocked by policy`. No recovery email was sent and no real
password was changed. Complete the provider journey before activation.

The manual helper `scripts/live-auth-acceptance.mjs` opens an ephemeral browser
and prints fixed check labels without recording credentials, session state,
screenshots or page contents. It does not submit student details. Two attempts
did not complete private sign-in and are failures, not acceptance. Opening the
owner's normal Chrome profile was also blocked by automatic review; the owner
was given the local sign-in link for private manual use.

After any real receipt is consumed, disable recovery entry points rather than
running the pre-use rollback. Receipt retention and provider-wide session policy
need review before shared deployment.

Local checkpoint `3485a5c7c4ae16bcfca6f0d02b4664c92bc649f8` on
`backup/website-auth-recovery-20261105-a15c6c59` preserves 25 explicitly reviewed
files. Git-object comparison verified the captured files, and the original staging
index and working branch were preserved. This is a scoped recovery checkpoint,
not a full-worktree snapshot, published PR or release. Final current-source
public browser acceptance also passed; real provider/member acceptance remains
unverified.

## Recovery-session workspace restriction — 15 November 2026

The member-account loader now checks the signed session AMR against the current
`auth.getUser()` identity before requesting `get_own_profile_v1`. Recovery-marked
sessions are routed to `/reset-password`, including stale recovery markers whose
ten-minute password-update authority has expired. Missing, expired, malformed or
identity-mismatched claim observations do not load a member profile. The existing
fresh recovery-authority and one-use receipt checks still control password update.

Focused recovery authority/session/update tests passed 24/24; public-profile,
recovery action and expired-session tests passed 17/17. The full
`npm run test:boundaries` suite passed 218/218. The final local state also passed
`npm run lint`, `npm run typecheck`, `npm run test:proxy`,
`node scripts/check-docs.mjs` (109 files / 506 links),
`npm run build:acceptance`, `npm run test:acceptance`, and `git diff --check`.
Browser acceptance includes CSP, accessibility, reduced-motion and offline
checks but uses no live account or recovery session. Real provider AMR shape,
email delivery, PKCE exchange and password update remain unverified. Hosted
recovery remains disabled; no shared or production database was modified.

The final recovery-session change also guards onboarding profile-save and MEC
claim actions, plus the optional public-profile draft action, before their first
profile RPC. A stale reset session can clear only its currently verified local
account cookies and continue to the fresh-link form. Direct action fixtures cover
denied recovery reads/mutations and account-bound local cleanup. The current
source verification results are recorded in
`docs/quality/security-audit-review-2026-11-15.md`.
