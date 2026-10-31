# Vercel delivery

Rechecked 31 October 2026. The public repository `MEC-IDEALAB/IDEALAB-MEC-WEB` is connected to the Vercel project `idealab-mec-web` on the personal Hobby team `navaneethvvinods-projects`. A production deployment exists and Vercel reports it as Ready, but requests to `https://idealab-mec-web.vercel.app/` currently return Vercel `404 NOT_FOUND`.

## Current 404 investigation

Vercel's build log for production commit `7f75d06` shows that `next build` succeeded and generated the `/` route. The project settings were configured with Framework Preset `Other`, so Vercel's static output default selected `public/`; that directory has no `index.html`. This matches the live 404 response. The application now carries a versioned [Vercel config](../vercel.json) that selects the `nextjs` framework and leaves output handling to Vercel's Next.js integration. The correction is not verified on a Vercel deployment yet; check the PR preview before merging and confirm the production domain after the merge.

The build log also confirms Vercel selected Node `24.x` because the package declares `"node": ">=24 <25"`, despite the project setting showing `26.x`. The selected runtime matches the CI and local release baseline.

## CI and deployment flow

GitHub Actions runs Website CI for pull requests, pushes to `main`, and merge queues. It runs lint, typecheck, boundary tests, dependency audit, production build and Chromium acceptance journeys. The [manual Vercel preview workflow](../.github/workflows/vercel-preview.yml) is separate from Git-triggered deployments: it runs only from `main`, requires an eligible plan declaration and Vercel credentials, repeats acceptance checks, and deploys without `--prod`. It does not deploy production.

The project is already connected to GitHub. Vercel Git integration creates deployments for pushes and pull requests. Review the Vercel status for the exact commit alongside GitHub Actions. A successful `Ready` status confirms that Vercel built something; it does not confirm that the application route is served correctly. Confirm `/` and public routes return application HTML before calling the preview verified.

The preview workflow pins Vercel CLI `65.4.0`, matching the CLI recorded in the live build logs. It provides `VERCEL_TOKEN` through the process environment rather than a command-line argument. The workflow still requires the owner to configure `VERCEL_PLAN` and the three Vercel secrets in GitHub Actions; those repository settings have not been independently inspected here.

## Analytics and privacy

The application includes the pinned `@vercel/analytics` and `@vercel/speed-insights` packages in the current branch. The telemetry component runs only in Production and only on `/`, `/lab`, `/projects`, `/events`, and `/explore`; it drops private, unknown, dynamic, malformed and cross-origin events, removes query strings and fragments, and sanitizes route labels. The site also uses `Referrer-Policy: origin`, preventing full same-origin paths or queries from being sent as analytics referrers. Authentication, onboarding, member paths, local development and Preview deployments are excluded. The test suite covers these filters.

The Vercel project still needs Web Analytics and Speed Insights enabled in its dashboard. After the integration is merged and deployed, visit a public page and check the Network panel and Vercel dashboard. Vercel documents that data appears only after the feature is enabled, the component is deployed, and visitors generate page views or performance measurements: [Web Analytics setup](https://vercel.com/docs/analytics/quickstart), [Analytics privacy](https://vercel.com/docs/analytics/privacy-policy), [Speed Insights setup](https://vercel.com/docs/speed-insights/quickstart), and [Speed Insights privacy](https://vercel.com/docs/speed-insights/privacy-policy).

## Project settings and production boundary

| Setting | Required value |
| --- | --- |
| Repository | `MEC-IDEALAB/IDEALAB-MEC-WEB` |
| Root directory | `.` |
| Framework | Next.js; enforced by `vercel.json` |
| Node.js | 24.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Next.js framework default; do not override to `public/` |

Keep `ENABLE_MEMBER_PLATFORM=false`, `ENABLE_MEMBER_PLATFORM_TEST=false`, `ENABLE_DESIGN_PREVIEW=false`, `ENABLE_LAB_OPENING_VALIDATION=false`, `ENABLE_OWN_VISITS_VALIDATION=false`, `ENABLE_WORK_REQUEST_INTAKE=false`, and `ENABLE_PROJECT_CORE=false` in production until their backend contracts are approved. The production account integration is source-disabled. Do not add validation-project keys to Vercel. Shared Grow database permissions, Flutter compatibility, cross-client auth journeys, and operational flows remain release gates.

Local Supabase validation uses `http://127.0.0.1:3015` and exact `/auth/confirm`, `/auth/callback`, and `/auth/recovery/callback` callbacks. A validation project's keys are accepted only by the local development runtime. Configure production email delivery, shared callbacks, and the shared Grow database contract only after their separate security review and release approval. Keep tokens and keys in provider secret stores, never in source, issues, or workflow output.

## Verification record

Before merging the framework correction, inspect GitHub CI and Vercel's PR preview for the exact PR head. Confirm the deployment serves `/`, `/lab`, `/projects`, `/events`, and `/explore` successfully and that an unknown path returns the app's designed 404. After the merge, verify the production alias is served by the new deployment. Analytics remains unverified until the dashboard toggles are enabled and a public page view is observed. No successful public production route response has been established yet.
