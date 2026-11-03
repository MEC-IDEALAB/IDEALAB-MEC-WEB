# Shared profile installation — 2 November 2026

The owner explicitly approved the reviewed migration during maintenance with
legacy clients kept offline until the updated account flow is verified. Supabase
MCP installed `20261102130200_shared_profile_contract_v1` on the existing shared
Grow/IDEALAB MEC project (`huftzhfqnnslvnfzvbex`). No other project was created,
resumed or deleted in this slice.

## Exact source and scope

Canonical source is `Grow/supabase/migrations/20261102130200_shared_profile_contract_v1.sql`.
Its SHA-256 is `492fbccba41ac6db03836b2ab62b1a5e9d7349a278d0670f032e8b2daad297b0`.
It contains the approved candidate (SHA-256
`ed013ced6cb7ba8f77a9b341814f3ad533d85db338afb24e57e268a5334cdaad`)
with bounded local lock/statement timeout statements prepended. The final saved
file string matches the single submitted query and live migration statement
exactly, including line endings. The server-generated version supplies the
canonical filename. The local Supabase CLI was unavailable; no CLI was installed.
Draft/uninstalled comments within the immutable approved SQL are historical;
this installation record and live ledger establish its current installed state.

The change expands existing users by five profile/version/revision columns,
adds three caller-checked profile/save/declaration APIs, confirmed-identity
provisioning and the normalized registration reservation/claim boundary. Existing
raw reservations are preserved without automatic admission. Client direct account
writes and broad account reads are removed. Profile completion, roles, activity
and admission remain server-controlled. Operational APIs, provider settings and
storage bucket/policy configuration are outside this migration.

## Actual post-install verification

[Recorded installation evidence](../research/shared-profile-installed-2026-11-02.json)
confirms:

- Seven Auth identities, six public profiles, four buckets and one stored object
  remain. Aggregate original profile and selected Auth identity fingerprints
  match the pre-install snapshot; existing role counts are unchanged.
- No profile was auto-admitted or activated into the new contract.
- Catalog/RLS/function/grant checks and missing-identity getter/save/claim denials
  pass in a rollback transaction. No fake Auth identities or user fixtures were
  inserted and no existing profile was edited for these checks.
- Public HTTP probes reject the private schema (406/PGRST106), anonymous getter
  (401/42501) and anonymous profile reads (401/42501).
- Independent catalog review confirms forced owner RLS, intended column grants,
  no API writes, private baseline/claims/counters denial, fixed function search
  paths, explicit RPC callers, enabled Auth triggers and normalized unique index.

The private persisted baseline contains catalog metadata and aggregate comparison
fingerprints, without raw profiles, Auth passwords or session/token records.
Disposable SQL trials previously verified pristine rollback after reconnect;
no live rollback was performed. Any rollback restores legacy permission weaknesses,
requires clients offline and refuses intervening profile/claim changes. Prefer
forward fixes after client activity.

## Client and release state

The ignored website development configuration now selects the shared-local
account contract. Uninstalled operational features are off. A loopback-only local
Next.js development server is running at http://127.0.0.1:3015. This is not a hosted
release. Production member access remains rejected in website source even when
environment flags are supplied. Flutter's shared account route remains separately
gated and does not enter the legacy operational shell.

Real Google/password/email signup, confirmation delivery, native callback/device
persistence, onboarding, cross-owner and cross-client acceptance remain unverified.
SMTP delivery is not configured. Storage privacy and operational workflows remain
unfinished. Installation is a backend security/integration milestone, not a claim
of production-ready authentication.

Local HTTP smoke checks after the developer cutover: sign-in and signup return
200 with IDEALAB MEC branding and configured account controls; unauthenticated
`/app` redirects to sign-in; a denied OAuth callback returns to sign-in. A direct
Google authorization preflight returns 302 to accounts.google.com. Its final
local return allowlist and credential exchange are not verified by that redirect.
The owner was asked to complete the private Google journey; no credentials,
codes, callback links or browser session data were requested.
## Reported Google callback mismatch — 2 November 2026

The owner attempted the real shared-local Google flow and reported Google
`400 redirect_uri_mismatch`. A fresh authorization preflight confirms the provider
receives `redirect_uri=https://huftzhfqnnslvnfzvbex.supabase.co/auth/v1/callback`.
This URI must be an exact Authorized redirect URI on the matching Google Web
OAuth client. Retain existing redirect entries. This is separate from the
website's final `/auth/callback` allowlist in Supabase. The connected tools do not
provide authenticated Google Cloud client-settings control, so no Google Cloud
setting was changed. The genuine provider journey is failed, not passed.

References: https://supabase.com/docs/guides/auth/social-sign-in/auth-google and
https://developers.google.com/identity/protocols/oauth2/web-server#authorization-errors-redirect-uri-mismatch
## New Google Cloud client recheck — 2 November 2026

The owner pasted the same public ID for Android and Web. A fresh live Supabase
Google authorization request instead selects Web client
`834760182446-p0ph8bhoq1mj31q9pc8knkdfjg5mug6t.apps.googleusercontent.com`.
The owner-supplied ID ending `f3dqdfan707b7pc04diejm7sh7qcvn4t` remains labelled
Android by the owner; its Google Cloud client type/package/certificate are not
independently inspected. No duplicate ID was installed as two client types.

The configured Web flow sends the exact shared Supabase callback and the next
Google response redirects to `/v3/signin/identifier`, without the previous
redirect mismatch or invalid-client indication in that preflight. This verifies
entry to Google's login page, not private account login, consent, code exchange,
Client Secret validity, final website return or onboarding.

Live read-only recheck: project ACTIVE_HEALTHY; email provider and Google enabled;
email confirmation required; owner profile/save/declaration APIs installed;
forced account RLS and no direct authenticated account UPDATE. Existing account,
profile and stored-object counts are unchanged. All four buckets remain public;
storage privacy is still unresolved. No further database migration was installed.

Only the ignored Flutter environment's GOOGLE_WEB_CLIENT_ID value was updated to
match Supabase's selected Web client. The app uses a --dart-define at build time;
.env is not automatically loaded and no build or deployed client was updated.
No Client Secret, password or session token was requested or inspected.

The owner requested Supabase's project display name IDEALAB MEC. Live metadata
still reports grow-idealab. The connected plugin exposes project reads but no
project-name update, and authenticated browser control is unavailable. The pending
dashboard action is Settings > General > Project name. Preserve the existing
project reference/URL and actual managed PostgreSQL database name postgres.
