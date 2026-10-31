# Vercel delivery

Current production check — 31 October 2026: `main` is at `7e4891ff1f7e40e4af51623d20ac0cb7c334fbfb` after PR #29. The public repository `MEC-IDEALAB/IDEALAB-MEC-WEB` is connected to the Vercel project `idealab-mec-web` on the personal Hobby team `navaneethvvinods-projects`. The latest production deployment `dpl_287xsdd3daiiywUPwXiHfRa5krtA` is Ready, and its primary alias `https://idealab-mec-web.vercel.app/` serves the website. This is a personal-team project; no IDEALAB-owned Vercel team is available to the connected account.

## 404 root cause and fix

Before the fix, production commit `7f75d06` built the `/` route, but the Vercel project was configured with Framework Preset `Other`. Vercel selected the static `public/` output directory, which has no `index.html`, causing the 404. PR #28 added a versioned [Vercel config](../vercel.json) with `framework: nextjs`, merged as `c6f6772`. The new deployment serves Next.js route functions. Direct production requests now return HTTP 200 for `/`, `/lab`, `/projects`, `/events`, `/explore`, and `/sign-in`.

The build log also confirms Vercel selected Node `24.x` because the package declares `"node": ">=24 <25"`, despite the project setting showing `26.x`. The selected runtime matches the CI and local release baseline.

## CI and deployment flow

GitHub Actions runs Website CI for pull requests, pushes to `main`, and merge queues. It runs lint, typecheck, boundary tests, dependency audit, production build and Chromium acceptance journeys. The [manual Vercel preview workflow](../.github/workflows/vercel-preview.yml) is separate from Git-triggered deployments: it runs only from `main`, requires an eligible plan declaration and Vercel credentials, repeats acceptance checks, and deploys without `--prod`. It does not deploy production.

The project is already connected to GitHub. Vercel Git integration creates deployments for pushes and pull requests. Review the Vercel status for the exact commit alongside GitHub Actions. A successful `Ready` status confirms that Vercel built something; it does not confirm that the application route is served correctly. Confirm `/` and public routes return application HTML before calling the preview verified.

The preview workflow pins Vercel CLI `65.4.0`, matching the CLI recorded in the live build logs. It provides `VERCEL_TOKEN` through the process environment rather than a command-line argument. The workflow still requires the owner to configure `VERCEL_PLAN` and the three Vercel secrets in GitHub Actions; those repository settings have not been independently inspected here.

## Analytics and privacy

The application includes the pinned `@vercel/analytics` and `@vercel/speed-insights` packages in the current branch. The telemetry component runs only in Production and only on `/`, `/lab`, `/projects`, `/events`, and `/explore`; it drops private, unknown, dynamic, malformed and cross-origin events, removes query strings and fragments, and sanitizes route labels. The site also uses `Referrer-Policy: origin`, preventing full same-origin paths or queries from being sent as analytics referrers. Authentication, onboarding, member paths, local development and Preview deployments are excluded. The test suite covers these filters.

Web Analytics and Speed Insights dashboard activation and data collection have not been verified. Enable the features, visit a public page, and check the Network panel and Vercel dashboard before reporting metrics. Vercel documents that data appears only after the feature is enabled, the component is deployed, and visitors generate page views or performance measurements: [Web Analytics setup](https://vercel.com/docs/analytics/quickstart), [Analytics privacy](https://vercel.com/docs/analytics/privacy-policy), [Speed Insights setup](https://vercel.com/docs/speed-insights/quickstart), and [Speed Insights privacy](https://vercel.com/docs/speed-insights/privacy-policy).

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

PR #28's exact head `299df43` passed Website CI, Documentation CI, the required gate and Vercel Preview. The protected PR preview served `/`, `/lab`, `/projects`, `/events`, `/explore`, and `/sign-in`. Its production deployment ID was `dpl_DqgbuySPL4DMuvWbn6iEFwS6dYZH`; the current deployment is recorded below. Analytics dashboard collection remains unverified.

## Current production route and PWA recheck (31 October 2026)

The exact-head GitHub runs for current `main` passed: [Website CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/41225623591) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/41225623592). Vercel inspection shows deployment `dpl_287xsdd3daiiywUPwXiHfRa5krtA` is Ready/Production, includes the public `idealab-mec-web.vercel.app` alias and builds Next.js route handlers. The Vercel project settings still display Framework Preset `Other`; the committed `vercel.json` override is effective in the current deployment.

Direct HTTPS GETs to `/`, `/lab`, `/projects`, `/events`, `/explore`, `/sign-in`, and `/sign-up` returned HTTP 200 with application titles and no `x-vercel-error` header. A Chromium browser loaded the production homepage, title, navigation and content. An arbitrary unknown route returned HTTP 404 without a Vercel error header; custom 404 presentation was not reviewed. A unique deployment URL opened the Vercel login page, consistent with deployment protection; use the public production alias above.

The user-reported Vercel request ID `bom1::bpw9h-1793466099286-d8407eb7c6fc` contains timestamp `2026-10-31T17:01:39.286Z`, shortly after production deployment `dpl_99Go92ukd7VEtYMZhbRCsa43eAXt` was created. Vercel inspection of that earlier deployment listed no build outputs. The current deployment contains Next.js page handlers, and the public alias now returns the application. The actual URL that produced the user's report was not supplied, so the timing and build evidence strongly match the earlier missing-output failure but do not identify its host conclusively.

Hosted PWA checks also passed for the current public HTTPS alias: it is a secure context, `/manifest.webmanifest` returns 200 with standalone display and root start URL, the declared 192 px and 512 px PNG icons return 200, and the root-scoped service worker is activated and controls the page. This verifies hosted delivery, not an OS install prompt, home-screen launch or Android APK. See the [PWA delivery record](pwa-delivery.md).
