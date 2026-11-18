# Password recovery session contract — validation implementation

Website password recovery is default-off. The local reader/callback/form/action
boundary is implemented and the consumption API is installed only in isolated
validation. See [current implementation and evidence](quality/recovery-integration-2026-11-05.md).
Real provider acceptance and shared production approval remain outstanding.

## Evidence

- Supabase's [JWT claims reference](https://supabase.com/docs/guides/auth/jwt-fields)
  documents the recovery authentication method and the session ID claim.
- Metadata-only inspection of the isolated validation project found
  `auth.sessions` identifiers and user ownership, and
  `auth.mfa_amr_claims` session, authentication method and timestamps. No
  session rows, tokens or personal data were read.
- The installed auth SDK derives its callback `redirectType` from the local
  PKCE verifier storage. That value alone is not a verified authorization claim.
- A real email recovery has not been completed in the validation project, so
  the actual recovery claim shape and provider behavior are not established.

## Candidate flow and trust boundaries

1. A recovery link is requested and exchanged using the provider's supported
   PKCE flow. The callback verifies the resulting user and a cryptographically
   verified session claim. A client-supplied account ID or local redirect type
   must never confer recovery authority.
2. A private server-side or database operation checks that the verified JWT
   identifies the current user and live session, and includes a fresh recovery
   authentication method. Exactly one transaction atomically consumes the
   session's recovery authority; ordinary login, expired, revoked, switched,
   malformed and already-consumed sessions fail closed.
3. Only after successful consumption does the site request the Auth password
   update. The database and Auth update are separate transactions: a rejected
   or uncertain update after consumption requires a fresh recovery link. Never
   report that a failed response proves the password remained unchanged.
4. Clear the local session after a confirmed update and require sign-in again.
   Do not log session tokens, email addresses, recovery links or passwords.

## Protected workspace session scope

Before the member loader reads an account profile, it compares the signed session
claims with the current user returned by `auth.getUser()`. A session whose AMR
contains `recovery` is sent to `/reset-password`; an unavailable or mismatched
claim observation does not load the member profile. This keeps recovery sessions
out of `/app`, `/account-access` and their server actions even after the short
window for submitting the password reset expires. Onboarding and public-profile
draft actions independently reject non-normal sessions before reading profile
data. An expired recovery session can use the account-bound local sign-out action
on the reset page before requesting a fresh link. The reset form still requires
the separate fresh recovery-authority check and one-use database receipt.

This is a source-level guard with fixture coverage. The deployed provider's AMR
shape and a real recovery session have not been accepted in the browser, and
hosted recovery remains disabled. Public pages remain available; this rule
restricts authenticated member access until the recovery flow finishes and clears
the local session.

The proposed website check alone does not prevent a bearer-token holder from
calling Supabase Auth directly. Before release, inspect and test the provider's
password-change policy and all enabled sign-in methods, including Google-only
and password accounts, against the actual deployed Auth version. A setting
must not be assumed to cover a method until it is verified.

## Acceptance before enabling recovery

- Verify real isolated email delivery, PKCE exchange and verified claim shape.
- Test ordinary password, OAuth and any enabled OTP or magic-link sessions;
  none may obtain website recovery authority without the intended flow.
- Test account and session switches, expiry, revoked sessions, malformed or
  forged claims and duplicated or concurrent consumption with independent
  connections. Test a lost Auth response and the fresh-link retry path.
- Independently review schema, grants, retention and direct Auth bypasses, then
  test the real browser → website → database → Auth flow with controlled users.
- Coordinate a reviewed shared-backend migration, provider configuration,
  compatible Grow release and rollback before any production activation.

No candidate migration or Auth configuration change is implied by this record.

## Disposable validation evidence — 5 November 2026

The [consumption SQL candidate](../supabase/validation/mec_recovery_consumption_candidate.sql)
checks the synthetic recovery claim against the current account, session and
database authentication method. Run `node scripts/db-runtime.mjs --recovery-consumption`
with the configured PostgreSQL 17 binary directory. The PG17.11 run
`runtime-1793833554150-972399c6.json` passed malformed, expired, switched and
replayed claim checks, receipt access checks and a two-connection race with
exactly one successful consumption. The scratch cluster was removed.

The provider's actual claim and revocation behavior, receipt retention,
independent review and browser integration remain open. Recovery stays disabled.

## Upstream provider cross-check — 5 November 2026

At Supabase Auth commit `d7955e9eb54003c4abbd7808e774c810d5d3e6cc`,
verification carries the authentication method into the PKCE flow, token
issuance records it on the session, and JWT AMR timestamps come from the
claim row's update timestamp. The website candidate checks the signed AMR
timestamp and the database claim's creation time separately. This prevents a
refreshed claim from extending the original database recovery window.
[Verification source](https://github.com/supabase/auth/blob/d7955e9eb54003c4abbd7808e774c810d5d3e6cc/internal/api/verify.go)
· [Session source](https://github.com/supabase/auth/blob/d7955e9eb54003c4abbd7808e774c810d5d3e6cc/internal/models/sessions.go)

The same upstream revision has a current-password requirement that exempts
recovery sessions. A receipt in the website database does not change that Auth
session classification. Check the deployed version and settings, then test
direct provider updates with ordinary and consumed recovery sessions before
release. Treat an unexpected successful direct update as a release blocker
until the actual session lifecycle and provider controls are reviewed.
[Password update source](https://github.com/supabase/auth/blob/d7955e9eb54003c4abbd7808e774c810d5d3e6cc/internal/api/user.go)

## Function owner and lock-wait verification

Read-only catalog inspection on 5 November found that the shared project's
`postgres` role is a nonsuperuser with BYPASSRLS and table SELECT and UPDATE on
the three required Auth relations. The inactive validation project still needs
its own catalog check before any installation.

PG17.11 artifact `runtime-1793837623647-70134fac.json` records a passing
rehearsal with a nonsuperuser function owner, the captured privilege shape and
Auth table RLS enabled. The harness observed a recovery request waiting on a
session lock until expiry, then verified denial and no receipt. The candidate
rechecks freshness after obtaining Auth locks and after inserting the receipt.
Provider behavior and browser acceptance remain open.

The candidate now checks the function owner's Auth privileges before creating
its objects. PG17.11 artifact `runtime-1793838478149-7f59d2fe.json` verifies that
installation fails when the fixture owner lacks the grant needed to lock
`auth.sessions`. The same run passed replay and lock-wait expiry checks with
the expected grants. Read-only inspection also confirmed the shared project's
required Auth column types.

The [pre-use rollback](../supabase/validation/mec_recovery_consumption_rollback.sql)
locks the receipt table before checking whether removal is safe. PG17.11
artifact `runtime-1793839080864-9475102e.json` verifies that rollback removes
the candidate before first use and refuses once a receipt exists. After use,
turn off recovery entry points and retain receipts pending a reviewed retention
and recovery plan.
