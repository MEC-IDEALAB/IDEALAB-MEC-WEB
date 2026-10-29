# Top-navigation regression checkpoint

22 October 2026; Node 24.19.0; dirty local source based on
`0504b41a1427640bd8fcbdeda48423f5ea24c05a`. The same SHA is remote `main`;
read-only GitHub inspection found no open pull request. These working changes
have not been pushed, reviewed in hosted CI or deployed.

Current source hashes (source, scripts, package/lock/config and workflow files)
are recorded in the local-only generated artifact
`artifacts/acceptance/current-source-sha256.json`, intentionally not committed.
No environment files, account values or credentials are included.

| Check | Result | Scope |
| --- | --- | --- |
| `node scripts/build-acceptance.mjs` | Passed | Production build with reserved `.invalid` configuration; no real Auth dependency |
| `node scripts/acceptance.mjs`, first run | Failed | Preview welcome motion timed out after old layout class stopped matching |
| Targeted ESLint and independent source review | Passed | HomeMotion selector now observes the preview shell; public and reduced-motion behavior preserved |
| Rebuilt fixture and full `node scripts/acceptance.mjs`, second run | Passed, exit 0 | Public journey, responsive themes, contrast, no-JavaScript, loader/ticker/card/scroll motion, live reduced-motion cancellation, assets, keyboard, protected-route denial, onboarding/staff/student wireframes, grouped navigation/history, drafts, account/recovery layout and malformed callback boundaries |
| Manual preview workflow review | Passed locally | Initial regression build uses `build:acceptance`, matching normal CI. Actual Vercel preview environment/build/deploy remains separate and unchanged; no dispatch |
| Restore real local build and port 3015 | Passed | Normal build/TypeScript passed; sign-in HTTP 200 with Google control, unauthenticated `/app/lab` redirects 307 to sign-in with private no-store |

Chrome reconnection timed out twice at its focus-emulation command after the
restart; no new credential or profile action was attempted. The retained tab
was listed at `/app`, but its post-restart authenticated DOM was not reverified.
The owner was asked to perform the genuine recovery email/password step privately.
No outcome has yet been reported for that step.

The full suite runs its own browser and feature-gated servers; it does not
borrow the real user's session. It proves neither email delivery/password
exchange nor operational persistence. Genuine isolated Google login, profile
save and declaration acceptance are separately recorded in
[account status](../account-readiness.md).

The test fixture is not deployment output. The manual workflow later pulls the
Preview environment, requires disabled member/design flags, runs the actual
Vercel build and deploys that `.vercel/output` only. Plan, credential and manual
main-ref gates remain intact. This local sequencing correction is not hosted
workflow evidence.

Remaining release acceptance: genuine email/password/recovery, a second genuine
account and concurrency, coordinated Flutter compatibility, production schema
fidelity and authorization, operational workflows and current hosted checks.
