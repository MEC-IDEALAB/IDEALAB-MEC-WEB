# Vercel delivery preparation

Verified against official documentation on 21 October 2026. No Vercel project, account connection, preview URL, domain or production deployment has been verified. GitHub CI is active; continuous deployment is not connected. The local Vercel CLI also reports that its saved token is invalid; no token value is recorded here.

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

Set `ENABLE_MEMBER_PLATFORM=false` and `ENABLE_DESIGN_PREVIEW=false` in production and ordinary previews. The public foundation needs no Supabase keys. A dedicated design preview may explicitly enable the sample composer; it remains unsubmitted browser data and does not establish member/backend acceptance.

When shared account recovery is approved for a specific environment, set `AUTH_SITE_URL` to that environment's exact HTTPS origin and add its exact `/auth/callback` and `/auth/recovery/callback` URLs to Supabase Auth's redirect allow list. Local development uses `http://127.0.0.1:3015` and the corresponding two callback paths. The recovery callback exchanges Supabase's PKCE code and redirects only to the fixed local reset form; it does not accept a caller-provided return URL. Configure and test email delivery and recovery templates in a safe environment before enabling the member platform. The recovery UI and actions currently remain disabled by the shared member-platform flag; setting callback URLs here does not authorize enabling that flag.

Future backend activation needs verified shared configuration and the identity/permission/operational gates in [architecture](architecture.md) and [delivery plan](delivery-plan.md). Keep secrets in the provider's environment controls, never in GitHub issues, source, screenshots or command output.

## Verification before promotion

Inspect hosted CI for the exact source revision, the actual Vercel build/deployment status and the rendered preview. Repeat the public/access-denial/sample acceptance journeys against that deployment, checking environment isolation and correct asset/font loading. Record its URL, commit and results. A local build or GitHub CI pass does not establish a hosted deployment pass.

Git integration is not configured to wait for GitHub CI. The manual preview workflow runs its own current-source checks before deployment; still inspect the hosted preview and deployment logs. Current GitHub-plan limitations also prevent enforcing branch protection, so review and release gates require manual discipline until supported enforcement is available. No merge or deployment is performed by this document.
