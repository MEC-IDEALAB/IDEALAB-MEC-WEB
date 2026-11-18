# Shared auth client verification — 2 November 2026

Local work remains unpushed and undeployed. The owner-approved shared profile migration is now installed; see the
[installation report](shared-profile-installation-2026-11-02.md).
Public name is IDEALAB MEC, with compatible account/package/callback identifiers.

## Changes and independent review

Flutter signup checks email-provider policy before account creation, requires
confirmation and keeps temporary signup events away from the normal native
client. Review found that pinned GoTrue 2.20.0 automatically joins the same
project BroadcastChannel on web. Raw-client signup now explicitly refuses the
Flutter-web platform at both action and factory. This is a native pilot boundary;
it does not disable the separate Next.js website signup implementation.

Signup, callback exchange, cleanup, password login and Google login share a
process-wide main-isolate lock. Existing-session checks prevent account replacement.
Callback cleanup records the exact callback session in memory and refuses to sign
out a switched or unowned account. Tests exercise both callback/login orderings,
PKCE contention and cleanup after account switching. Independent source review
accepted fixes for all three reported races within this native main-isolate scope.
A pending confirmation is not silently overwritten or described as fixed by reload.

## Actual checks

- Full local Flutter suite: 355 passed. Full Flutter analyzer: no issues.
- Narrow Home header: 320px with administrator controls passes without overflow.
- Website lint, TypeScript and all 152 boundary tests passed.
- Optimized website acceptance build and real local Chromium public acceptance passed:
  responsive/theme/auth-card states, keyboard/accessibility snapshots, motion,
  loader, assets, security headers and PWA/offline boundaries.
- Documentation check: 67 files and 331 local links passed.

[Source-bound local evidence](../research/shared-auth-client-local-2026-11-02.json)
contains hashes of the reviewed auth files and selected identity/website files.
The full Flutter suite finished before the final confirmation-screen message-only
clarification; full analyzer checked that clarification. The focused auth rerun after that clarification passed all 112 tests.

## Not established by these checks

Fixtures and source review do not verify real Supabase Auth sessions, email
receipt, Google provider exchange, device callbacks, persistence after process
restart or cross-client end-to-end behavior. Email confirmation configuration is
independently verified as enabled, while SMTP delivery remains unconfigured and
unverified. Shared migration installation passed; coordinated client/provider acceptance is pending.
Recovery remains disabled. Storage privacy, operational workflows, hosted release
and signed Android release are separate unfinished gates.
