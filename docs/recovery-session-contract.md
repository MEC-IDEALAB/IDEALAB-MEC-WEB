# Password recovery session contract — source guard and candidate flow

Website password recovery remains disabled. The current source adds a
fail-closed recovery-session guard to member access, onboarding actions and the
direct password-update action. This source guard is not a complete or
production-approved recovery boundary: there is no atomic, one-time recovery
grant, and the verified provider claim shape has not been confirmed through a
real recovery journey.

## Current source boundary

- `passwordRecoveryConfig()` returns `null`; request forms are disabled, and the
  recovery callback returns 404. Do not enable it by changing a feature flag.
- `inspectMemberSessionScope()` reads verified claims, checks the current user,
  then re-reads claims to detect account/session changes. A recovery AMR keeps
  the session out of member profile reads and onboarding mutations. Unknown or
  inconsistent observations fail closed.
- The password update server action repeats the recovery-scope check directly,
  so calling the action outside the rendered page does not grant a normal login
  password-change authority.
- The reset page may offer a local sign-out for a matching recovery-marked
  account. It does not update the password. Cookie cleanup must succeed before
  the action reports sign-out completion.
- These checks use the website server's Supabase Auth client. They do not
  restrict a bearer token from using provider APIs directly, and do not replace
  database/provider policy or the cross-client contract.

Local tests exercise claim/session parsing, profile-action denial, direct
password-action denial for normal and unverifiable sessions, and account-bound
local sign-out. They do not establish live provider behavior, a real recovery
claim, database replay protection, or production readiness. See the [recovery
guard review](quality/recovery-session-guard-review-2026-11-18.md).

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
   PKCE flow. The callback verifies that the resulting user and cryptographically
   verified session claim identify the same account. A client-supplied account
   ID or local redirect type must never confer recovery authority.
2. A private server-side or database operation checks that the verified JWT
   identifies the current user and live session and includes the intended
   recovery authentication method. Exactly one transaction atomically consumes
   the session's recovery authority; ordinary login, expired, revoked, switched,
   malformed and already-consumed sessions fail closed.
3. Only after successful consumption does the site request the Auth password
   update. The database and Auth update are separate transactions: a rejected
   or uncertain update after consumption requires a fresh recovery link. Never
   report that a failed response proves the password remained unchanged.
4. Clear the local session after a confirmed update and require sign-in again.
   Do not log session tokens, email addresses, recovery links or passwords.

The proposed website check alone does not prevent a bearer-token holder from
calling Supabase Auth directly. Before release, inspect and test the provider's
password-change policy and all enabled sign-in methods, including Google-only
and password accounts, against the actual deployed Auth version. A setting must
not be assumed to cover a method until it is verified.

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
