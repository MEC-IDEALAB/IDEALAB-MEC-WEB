# Vercel delivery preparation

Rechecked on 31 October 2026. Website foundation PR #19 is merged to `main` at `f0d8ab0ad3084f6cc4e8727d9e07686f9105faf0`; exact-head and main-commit Website/Documentation CI passed. Vercel has no project linked to `MEC-IDEALAB/IDEALAB-MEC-WEB`, and project creation returned HTTP 403. The local Vercel CLI has no saved credentials. Render has no IDEALAB web service in its connected workspace; its only listed service is the unrelated LINKER service. No preview URL, domain or deployment is available, and continuous deployment is not connected.

## Account prerequisite

The source repository is private and organization-owned. The only connected Vercel team returned is the personal team `navaneethvvinod's projects`; the connector does not expose its plan. Vercel's [Hobby plan does not connect projects to Git repositories owned by GitHub organizations](https://vercel.com/docs/limits#connecting-a-project-to-a-git-repository), and its [use is limited to personal, non-commercial projects](https://vercel.com/docs/plans/hobby). The institution's plan and eligibility have not been verified, so do not deploy this project under Hobby. Project creation returned HTTP 403. Use an eligible institutional Pro/Enterprise team with the required GitHub organization/repository access; do not make the repository public or start a paid plan/trial as a setup side effect.

A manual GitHub Actions workflow is already on `main` as a preview-only path; it does not require Vercel's Git integration and never deploys to production. It still requires a valid Vercel project and credentials configured by the account owner, and the CLI route does not waive Vercel plan terms.

After the account owner verifies an eligible institutional plan and configures the repository variable `VERCEL_PLAN` (`pro` or `enterprise`) and GitHub Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`, dispatch [Manual Vercel preview](../.github/workflows/vercel-preview.yml) from `main`; other refs are rejected. The workflow reruns lint, typecheck, boundary tests, dependency audit, documentation checks, production build and Chromium acceptance. It pulls the Vercel Preview environment, refuses deployment unless both `ENABLE_MEMBER_PLATFORM` and `ENABLE_DESIGN_PREVIEW` are explicitly `false`, then runs the Vercel build and preview deployment. It contains no production-deploy command. The variable, secrets and Vercel project are not configured or verified in the current environment.

## Project settings

| Setting | Intended value |
| --- | --- |
| Source | `MEC-IDEALAB/IDEALAB-MEC-WEB` |
| Framework | Next.js |
| Root directory | Repository root, `.`; the remote repository already contains the standalone website |
| Node.js | 24.x; local/CI baseline is 24.19.0 |
| Install | `npm ci` |
| Build | `npm run build` |
| Output | Next.js framework default; no static-export override |
| Preview workflow branch | `main`; project credentials and plan eligibility are still required |

Vercel supports Node 24 and manages minor/patch updates within that major; a local patch pin does not pin Vercel's runtime patch. See [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) and [build/root-directory configuration](https://vercel.com/docs/builds/configure-a-build).

`main` now contains the merged website foundation and PWA manifest/icon shell. It does not establish a production release: production member authentication remains source-disabled, shared Grow permissions and operational workflows remain gated, and no Vercel deployment exists. Once project creation access and plan eligibility are resolved, deploy a preview from the reviewed source and verify the exact commit and environment before considering any production promotion. Vercel distinguishes the production branch from preview branches; see [Git branch deployment behavior](https://vercel.com/docs/git#preview-branches).

## Environment boundary

Set `ENABLE_MEMBER_PLATFORM=false`, `ENABLE_MEMBER_PLATFORM_TEST=false`, `ENABLE_DESIGN_PREVIEW=false`, `ENABLE_LAB_OPENING_VALIDATION=false`, `ENABLE_OWN_VISITS_VALIDATION=false`, `ENABLE_WORK_REQUEST_INTAKE=false` and `ENABLE_PROJECT_CORE=false` in production and ordinary previews until each shared backend gate is separately approved. Lab opening and visit operations currently have no production contract and enforce their own pinned-validation feature gates. Website production account integration is additionally rejected in source; no environment variable can enable it. The shared Grow user-table policies must be reviewed and migrated, Flutter compatibility verified, and cross-client security journeys passed before the source gate is changed. The public foundation needs no Supabase keys. A dedicated design preview may explicitly enable the sample composer; it remains unsubmitted browser data and does not establish member/backend acceptance.

The pinned `idealab-mec-validation` Supabase project is accepted only by a local
development runtime. Production builds and Vercel/Render runtimes reject it even
if `ACCOUNT_ENVIRONMENT=validation` and the member flag are mistakenly enabled.
This source guard does not authorize deploying the validation project or replace
the shared-database release gate.

When shared account recovery is approved for a specific environment, set `AUTH_SITE_URL` to that environment's exact HTTPS origin and add its exact `/auth/confirm`, `/auth/callback` and `/auth/recovery/callback` URLs to Supabase Auth's redirect allow list. Local validation uses `http://127.0.0.1:3015` and those three callback paths. The recovery callback exchanges Supabase's PKCE code and redirects only to the fixed local reset form; it does not accept a caller-provided return URL. Configure and test email delivery and recovery templates in a safe environment before enabling the member platform. Setting callback URLs here does not authorize enabling production member access.

Future backend activation needs verified shared configuration and the identity/permission/operational gates in [architecture](architecture.md) and [delivery plan](delivery-plan.md). Keep secrets in the provider's environment controls, never in GitHub issues, source, screenshots or command output.

## Connected-hosting recheck — 31 October 2026

The connected Vercel account was checked for the exact `MEC-IDEALAB/IDEALAB-MEC-WEB` repository and returned no matching project. Creating `idealab-mec-web` in the only listed Vercel team returned HTTP 403; `vercel whoami` reported no local credentials. No token was requested or recorded. Render lists only the unrelated `LINKER` service backed by `NAVANEETHVVINOD/UNOFFICAL`; it was left untouched. PR #19 has merged and current-head GitHub CI passed, but no website deployment or new hosting resource exists. Vercel project-creation access and plan eligibility, environment variables and hosted preview behavior remain unverified.

## Verification before promotion

Inspect hosted CI for the exact source revision, the actual Vercel build/deployment status and the rendered preview. Repeat the public/access-denial/sample acceptance journeys against that deployment, checking environment isolation and correct asset/font loading. Record its URL, commit and results. A local build or GitHub CI pass does not establish a hosted deployment pass.

Git integration is not configured to wait for GitHub CI. The manual preview workflow runs its own current-source checks before deployment; still inspect the hosted preview and deployment logs. Current GitHub-plan limitations also prevent enforcing branch protection, so review and release gates require manual discipline until supported enforcement is available. No merge or deployment is performed by this document.
