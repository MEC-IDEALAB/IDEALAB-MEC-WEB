# Recovery-session guard review — 18 November 2026

## Status

Local implementation on the isolated `fix/recovery-session-authority` branch.
This review records website source behavior only. It does not approve enabling
password recovery or the hosted member platform. No production database,
provider configuration, Grow source, PR #67 or deployment was changed.

## Implemented scope

- `src/lib/recovery-authority.ts` classifies the current session from verified
  Auth claims, checks the claimed account against `getUser()`, and rechecks the
  same account/session/recovery marker before returning a scope. Missing,
  malformed, expired, anonymous, switched or unverifiable observations fail
  closed.
- `src/lib/member.ts` redirects a recovery-marked session to the reset route and
  prevents unknown session scope from reaching the profile RPC.
- `src/app/account-access/actions.ts` denies profile save and MEC registration
  declaration for recovery-marked or unverifiable sessions before profile RPCs.
- `src/app/auth/actions.ts` requires a recovery-marked session inside the direct
  password-update action and binds the submitted form to the verified account
  shown on the reset page. Its existing feature configuration still returns
  disabled, so this does not activate password changes.
- `src/app/reset-password/page.tsx` can offer account-bound local sign-out for
  a recognized recovery session. The action verifies the current account and
  confirms cookie cleanup before reporting success.
- Three boundary test files cover claim/session checks, onboarding-action
  denial, password-action denial, and recovery-session local sign-out.

## Local verification

Node 24.19.0 checks on this branch:

- `npm run lint` — pass.
- `npm run typecheck` — pass.
- `npm run test:boundaries` — 162 passed, 0 failed.
- Focused recovery tests — 13 passed, 0 failed.
- `npm run test:proxy` — pass. It verified the local validation proxy and
  unauthenticated redirects without credentials or a Supabase session.
- `npm run build:acceptance` — pass on Next.js 16.4.6.
- `npm run test:acceptance` — pass for the public/configuration browser journey,
  responsive layouts, accessibility snapshots and recovery-disabled states.
- `node scripts/check-docs.mjs` — 64 documentation files; 310 local links pass.
- `git diff --check` — pass.
- `npm audit --omit=dev` — 0 vulnerabilities.

The browser suite explicitly leaves real account creation, email delivery,
Google sign-in, recovery-link exchange/password update, real member sessions,
and operational authorization **unverified**.

## Dependency finding affecting hosted CI

Next.js was upgraded from 16.4.2 to 16.4.6 in `package.json` and
`package-lock.json`. The official Next.js advisories identify 16.2.0–16.4.4 as
affected by [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h)
and [GHSA-vc7v-qv4w-wrv8](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8); both list 16.4.5 as patched. This branch uses 16.4.6. A source search found no `use cache`, `unstable_cache` or `next/root-params` use, but the version update removes the advisory finding regardless.

The repository's full `npm audit --audit-level=high` still exits 1 with nine high
findings from the development-only chain
`typescript-eslint → tinyglobby → fdir → picomatch@4.0.7`. The audited
[Picomatch advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), reviewed
17 November 2026, lists no patched release; npm also reports no non-forced fix.
The production dependency audit is clean. This remains a required hosted CI audit
gate and will cause that job to fail while the affected development dependency
is present. No override or unverified patch was added.

## Remaining gates

- Password recovery configuration is hard-disabled and its callback remains
  unavailable. Do not enable it through a flag or deploy setting.
- Complete an approved isolated live recovery journey and verify the actual
  `amr` claim shape, expiry, account/session switching, email delivery and
  password update behavior.
- Design, implement and independently review atomic one-time recovery-grant
  consumption and the provider-direct API bypass boundary before activation.
- Run cross-client compatibility and authorization acceptance against the
  approved shared contract. This branch does not modify Grow.
- Resolve the high-severity development dependency audit without weakening the
  repository's audit gate before treating hosted CI as green.

See the [recovery session contract](../recovery-session-contract.md) for the
complete candidate flow and acceptance requirements.
