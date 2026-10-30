# Password recovery session contract — candidate

Website password recovery is disabled. This document is a design candidate, not
an implemented or production-approved security boundary.

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
