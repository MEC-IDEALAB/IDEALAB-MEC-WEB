# IDEALAB MEC website

Next.js and TypeScript website for IDEA Lab at Model Engineering College. Public institutional content and a signed-in platform share one intended Supabase backend with the existing Flutter client.

**Status:** local development; V1 is not production-ready. Public pages, protected member routes, account flows and several guarded operational slices exist. Google sign-in and onboarding have been tested in the isolated validation project; email/password delivery, shared Grow permissions and full operational journeys remain acceptance gates. Sample catalog entries are design examples, not verified services, stock or prices. See [account readiness](docs/account-readiness.md) and [release readiness](docs/release-readiness-2026-10-23.md).

The owner prioritized UI and GitHub setup first. The current review phase covers the public UI, sample draft preview and access-denial states. Shared-account activation is disabled by default with `ENABLE_MEMBER_PLATFORM=false`; live member, permission and operational acceptance must pass before activation. A frontend foundation PR is not the full V1 release.

## Project layout

The standalone website is at `F:\kannan\projects\IDEALAB\idealab-mec-web`. The Grow Flutter app is its sibling at `F:\kannan\projects\IDEALAB\Grow`; each is a separate Git repository.

- `src/app`: Next.js routes, layouts and server actions.
- `src/components`: reusable branding, navigation and controls.
- `src/features`: module-specific UI and logic.
- `src/lib`: configuration, server session and member access.
- `public/brand`: official logo assets, documented provenance.
- `scripts`: actual acceptance checks and explicit GitHub setup helper.
- `.github`: CI, issue template and PR template.
- `docs`: requirements, architecture, flows, wireframes and delivery evidence.

## Local development

Use Node 24 and the committed npm lockfile.

```sh
npm ci
npm run dev -- --port 3015
```

The server binds to `127.0.0.1`. Port 3015 matches the configured isolated validation callbacks; a different port needs matching Auth callback configuration. Backend activation is off by default; sign-in is disabled and protected routes inaccessible unless an explicitly approved environment is configured. For local design review, set `ENABLE_DESIGN_PREVIEW=true` and open `/design/request`. Public URL and publishable/legacy anon key belong in an ignored `.env.local` with explicit member activation. Never supply a service-role key. Production credentials, member data, payment proofs and test-session tokens must not enter source, logs or issues.

## Verification

```sh
npm run lint
npm run typecheck
npm audit --audit-level=high
npm run build:acceptance
npx playwright install chromium
npm run test:acceptance
```

`build:acceptance` compiles a reserved `.invalid` Supabase URL and dummy publishable-key fixture because Next.js inlines `NEXT_PUBLIC_` variables at build time. The member gate stays off by default, and the acceptance suite never submits credentials or contacts that host. The browser suite starts a real local production server and checks the public journey, responsive widths, assets, menu, disabled and configured recovery states, signed-out route denial, security headers and reduced motion. It does not simulate authenticated success or verify live backend/RLS workflows. Run `npm run build` separately for a normal production build. Live account/member/staff acceptance remains required before enabling/releasing those services. See [delivery plan](docs/delivery-plan.md).

## Product and delivery records

For isolated native SQL runtime preparation, an optional `npm run test:db-runtime`
command starts and removes only a fresh scratch cluster. It requires an existing
PostgreSQL installation and never accepts a shared database URL. Its success is
not Supabase Auth, RLS or migration acceptance. See [database validation](docs/database-validation.md).

- [Requirements](docs/requirements.md)
- [User/staff flows and wireframes](docs/experience.md)
- [Color, component and motion standard](docs/design-system.md)
- [Current UI audit and authentication gate](docs/ui-audit.md)
- [Architecture and backend compatibility](docs/architecture.md)
- [Delivery plan and task status](docs/delivery-plan.md)
- [Content and asset provenance](docs/content-sources.md)

Target repository: `MEC-IDEALAB/IDEALAB-MEC-WEB` (private). Vercel is the selected hosting provider; deployment/account/domain setup and full production acceptance are separate unfinished steps. GitHub's hosted check results must be inspected on the current revision; a workflow file alone does not establish a pass or branch protection.
Deployment preparation: [Vercel settings and account requirements](docs/deployment.md).
