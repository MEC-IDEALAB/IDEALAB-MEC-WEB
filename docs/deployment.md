# Vercel delivery preparation

Verified against official documentation on 21 October 2026 and the connected hosting accounts on 23 October 2026. Vercel account access works, but a scoped project lookup for `MEC-IDEALAB/IDEALAB-MEC-WEB` returned no project. Render has no IDEALAB web service in its connected workspace; its unrelated service was left untouched. No preview URL, domain or deployment is available, and continuous deployment is not connected. The local Vercel CLI also reports that its saved token is invalid; no token value is recorded here.

## Account prerequisite

The source repository is private and organization-owned. Vercel's [Hobby plan does not connect projects to Git repositories owned by GitHub organizations](https://vercel.com/docs/limits#connecting-a-project-to-a-git-repository), and its [use is limited to personal, non-commercial projects](https://vercel.com/docs/plans/hobby). The institution's plan and eligibility have not been verified, so do not deploy this project under Hobby. A manual GitHub Actions workflow using the Vercel CLI is prepared as a preview-only path; it becomes dispatchable after it reaches the default branch, does not require Vercel's Git integration and never deploys to production. The CLI route does not waive Vercel plan terms. Do not start a paid plan or trial as a setup side effect.

After the reviewed workflow is present on the default branch, dispatch [Manual Vercel preview](../.github/workflows/vercel-preview.yml) from `main`; other refs are rejected. First verify that the institution's Vercel account is eligible for this use and set the repository variable `VERCEL_PLAN` to `pro` or `enterprise`. Configure the GitHub Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. The workflow reruns lint, typecheck, boundary tests, dependency audit, documentation checks, production build and Chromium acceptance. It pulls the Vercel Preview environment, refuses deployment unless both `ENABLE_MEMBER_PLATFORM` and `ENABLE_DESIGN_PREVIEW` are explicitly `false`, then runs the Vercel build and preview deployment. It contains no production-deploy command. The variable, secrets and Vercel project are not configured or verified in the current environment.

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
| Production branch | `main`, once reviewed application source is merged |

Vercel supports Node 24 and manages minor/patch updates within that major; a local patch pin does not pin Vercel's runtime patch. See [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) and [build/root-directory configuration](https://vercel.com/docs/builds/configure-a-build).

The initial `main` commit contains planning/governance only. Application source is in draft PR #14. Do not treat importing the current planning-only default branch as a successful application deployment. After reviewed application delivery, connect the selected repository to the eligible team and verify the exact deployed commit. Vercel distinguishes the production branch from preview branches; see [Git branch deployment behavior](https://vercel.com/docs/git#preview-branches).

## Environment boundary

Set `ENABLE_MEMBER_PLATFORM=false`, `ENABLE_MEMBER_PLATFORM_TEST=false`, `ENABLE_DESIGN_PREVIEW=false`, `ENABLE_LAB_OPENING_VALIDATION=false`, `ENABLE_OWN_VISITS_VALIDATION=false`, `ENABLE_WORK_REQUEST_INTAKE=false` and `ENABLE_PROJECT_CORE=false` in production and ordinary previews until each shared backend gate is separately approved. Lab opening and visit operations currently have no production contract and enforce their own pinned-validation feature gates. Website production account integration is additionally rejected in source; no environment variable can enable it. The shared Grow user-table policies must be reviewed and migrated, Flutter compatibility verified, and cross-client security journeys passed before the source gate is changed. The public foundation needs no Supabase keys. A dedicated design preview may explicitly enable the sample composer; it remains unsubmitted browser data and does not establish member/backend acceptance.

When shared account recovery is approved for a specific environment, set `AUTH_SITE_URL` to that environment's exact HTTPS origin and add its exact `/auth/confirm`, `/auth/callback` and `/auth/recovery/callback` URLs to Supabase Auth's redirect allow list. Local validation uses `http://127.0.0.1:3015` and those three callback paths. The recovery callback exchanges Supabase's PKCE code and redirects only to the fixed local reset form; it does not accept a caller-provided return URL. Configure and test email delivery and recovery templates in a safe environment before enabling the member platform. Setting callback URLs here does not authorize enabling production member access.

Future backend activation needs verified shared configuration and the identity/permission/operational gates in [architecture](architecture.md) and [delivery plan](delivery-plan.md). Keep secrets in the provider's environment controls, never in GitHub issues, source, screenshots or command output.

## Connected-hosting recheck — 29 October 2026

The connected Vercel account was rechecked for the exact `MEC-IDEALAB/IDEALAB-MEC-WEB` Git repository and returned no matching project. An existing project named `web` could not be verified as belonging to this repository, so it was not used. The connected Render workspace contains only the unrelated `LINKER` service backed by `NAVANEETHVVINOD/UNOFFICAL`; it was left untouched. No website deployment or new hosting resource was created. The current local source still needs a reviewed GitHub delivery and hosted checks, and Vercel plan eligibility, project credentials, environment variables and preview behavior remain unverified.

## Verification before promotion

Inspect hosted CI for the exact source revision, the actual Vercel build/deployment status and the rendered preview. Repeat the public/access-denial/sample acceptance journeys against that deployment, checking environment isolation and correct asset/font loading. Record its URL, commit and results. A local build or GitHub CI pass does not establish a hosted deployment pass.

Git integration is not configured to wait for GitHub CI. The manual preview workflow runs its own current-source checks before deployment; still inspect the hosted preview and deployment logs. Current GitHub-plan limitations also prevent enforcing branch protection, so review and release gates require manual discipline until supported enforcement is available. No merge or deployment is performed by this document.
