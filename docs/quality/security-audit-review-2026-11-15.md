# IDEALAB MEC website security audit review — 15 November 2026

## Scope

Reviewed the supplied security findings against the current local website source
and recorded a bounded recovery-session fix. This is not a live penetration test,
shared-database audit, Grow review, or hosted deployment assessment. Hosted member
and recovery access remain fail-closed. No production or validation database,
provider settings, Grow files, GitHub state, or deployment were changed.

## Finding disposition

| Audit finding | Current assessment | Evidence and next step |
| --- | --- | --- |
| Shared `public.users` grants, broad reads and Grow direct writes | **Historically reported; current database state unverified.** The website release gate does not secure the shared database from other clients. | The latest live read is recorded as blocked by hibernation / `28P01` in `phase1-validation-and-parity-2026-11-15.md`. Do not revoke grants or author SQL until current grants, RLS policies, table grants, client compatibility and migration provenance are read and rehearsed in isolation. Grow compatibility remains a separate required review. |
| Application / edge auth rate limits and CAPTCHA | **Application-layer limiter not found; platform controls unverified.** This does not establish that there is no rate limiting: Supabase Auth publishes endpoint limits, and Vercel WAF limits are configured separately. | Check current Supabase Auth limits and Vercel WAF rules in the approved validation/hosting configuration. Add an application limiter only with an approved atomic shared design. CAPTCHA enablement and public launch remain an operations decision. [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/rate-limiting). |
| Recovery session can enter member pages before password reset | **Fixed in local source; hosted/provider behavior unverified.** Recovery AMR is checked before member profile loading and before onboarding/public-profile profile RPCs. Expired reset sessions have an account-bound local sign-out route to request a fresh link. | See `src/lib/recovery-authority.ts`, `src/lib/member.ts`, `src/app/account-access/actions.ts`, `src/features/profile/public-profile-actions.ts`, `src/app/reset-password/page.tsx`, and `src/app/auth/actions.ts`. Fixture tests cover stale recovery AMR, blocked direct action reads/writes, account/session binding, and local cookie cleanup. Confirm actual Supabase AMR shape, recovery email, PKCE exchange, and reset behavior in the isolated validation environment before considering release. |
| Registration-number pre-claim / ID squatting | **Known limitation under the approved self-declaration policy; not changed.** The flow does not prove registration-number ownership against an MEC roster. | Preserve the approved self-declaration decision. Before production activation, MEC must define the genuine-claim dispute, recovery, and staff-resolution process. Roster verification would change the accepted policy and is not inferred by this audit. |
| CSP `style-src 'unsafe-inline'` and missing report endpoint | **CSP claim is misstated.** `style-src` uses the per-request nonce; the existing `'unsafe-inline'` allowance is limited to `style-src-attr`. CSP reporting is absent and is a monitoring improvement, not proof of an exploit. | `src/lib/security-headers.ts` and `scripts/security-headers.test.mjs` retain the nonce policy and its test. No CSP policy was weakened or changed. Evaluate reporting separately, and preserve the current script nonce and accessibility acceptance invariants. |
| Public-repository PII and Vercel telemetry consent | **Needs separate repository/deployment verification.** No full public-repository PII scan or deployed telemetry inspection was performed in this review. Current source review found no telemetry component mount; hosted state remains unverified. | Keep telemetry unmounted until MEC approves the consent notice and behavior. Run a dedicated secret/PII scan over repository history and current tracked files before public release; review results without copying sensitive values into reports. |

## Local corrective change and verification

Recovery-marked sessions are restricted until the reset completes and local
session cleanup occurs. The same rule is enforced in server actions that can be
called without rendering their page, so routing alone is not the protection.
Expired sessions can clear the verified account's local auth cookies through an
explicit action; a failed cookie cleanup remains visible and does not claim
success.

Local evidence on the current source revision:

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test:boundaries` — 218/218 passed, including recovery action and
  expired-session cases.
- Focused recovery suites — 24/24 recovery authority/session/update cases and
  17/17 public-profile plus direct-action/expired-session cases passed.
- `npm run test:proxy` — passed for the configured validation proxy using no
  account credentials or live Supabase session.
- `node scripts/check-docs.mjs` — 109 documentation files and 506 local links
  passed.
- `npm run build:acceptance` — passed on Next.js 16.4.2.
- `npm run test:acceptance` — passed the public, responsive, accessibility,
  reduced-motion, offline and auth/recovery layout suite. It explicitly leaves
  live account/provider and member backend journeys unverified.
- `git diff --check` — passed.

No live account, email, database RLS, cross-client Grow compatibility, Vercel WAF,
provider AMR, or hosted recovery journey was tested. No commit, push, merge, or
deployment was performed.
