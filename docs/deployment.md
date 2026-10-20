# Vercel delivery preparation

Verified against official documentation on 20 October 2026. No Vercel project, account connection, preview URL, domain or production deployment has been verified. GitHub CI is active; continuous deployment is not connected.

## Account prerequisite

The source repository is private and organization-owned. Vercel's Hobby Git integration does not support that combination; an eligible Pro or Enterprise team is required. Private-repository commit authors must also have the appropriate Vercel team membership/login connection. Preserve the chosen private repository. Do not start a paid plan or trial as a setup side effect. See [Vercel Git deployment requirements](https://vercel.com/docs/git#deploying-private-git-repositories).

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

Future backend activation needs verified shared configuration and the identity/permission/operational gates in [architecture](architecture.md) and [delivery plan](delivery-plan.md). Keep secrets in the provider's environment controls, never in GitHub issues, source, screenshots or command output.

## Verification before promotion

Inspect hosted CI for the exact source revision, the actual Vercel build/deployment status and the rendered preview. Repeat the public/access-denial/sample acceptance journeys against that deployment, checking environment isolation and correct asset/font loading. Record its URL, commit and results. A local build or GitHub CI pass does not establish a hosted deployment pass.

The Git integration is not configured here to wait for GitHub CI. Do not assume deployment implies passing checks. Current GitHub-plan limitations also prevent enforcing branch protection, so review and release gates require manual discipline until supported enforcement is available. No merge or deployment is performed by this document.
