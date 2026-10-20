# IDEALAB MEC website

Next.js and TypeScript website for IDEA Lab at Model Engineering College. Public institutional content and a signed-in platform share one intended Supabase backend with the existing Flutter client.

**Status:** local foundation, not a production-ready V1. Public branding/layout, existing-account sign-in source, protected member routes and browser-only request drafts exist. Live identity/profile/permissions and operational workflows remain acceptance gates. Sample catalog entries are design examples, not verified services, stock or prices.

The owner prioritized UI and GitHub setup first. The current review phase covers the public UI, sample draft preview and access-denial states. Shared-account activation is disabled by default with `ENABLE_MEMBER_PLATFORM=false`; live member, permission and operational acceptance must pass before activation. A frontend foundation PR is not the full V1 release.

## Project layout

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
npm run dev
```

The server binds to `127.0.0.1`. Backend activation is off by default; sign-in is disabled and protected routes inaccessible. For local design review, set `ENABLE_DESIGN_PREVIEW=true` and open `/design/request`. After the shared-service acceptance gate, its public URL and publishable/legacy anon key belong in an ignored `.env.local` with explicit member activation. Never supply a service-role key. Production credentials, member data, payment proofs and test-session tokens must not enter source, logs or issues.

## Verification

```sh
npm run lint
npm run typecheck
npm audit --audit-level=high
npm run build
npx playwright install chromium
npm run test:acceptance
```

The browser acceptance script starts a real local production server and checks the public journey, responsive widths, assets, menu, configuration state, signed-out route denial, error route, security headers and reduced motion. It does not simulate authenticated success or verify live backend/RLS workflows. Live account/member/staff acceptance remains required before enabling/releasing those services. See [delivery plan](docs/delivery-plan.md).

## Product and delivery records

- [Requirements](docs/requirements.md)
- [User/staff flows and wireframes](docs/experience.md)
- [Architecture and backend compatibility](docs/architecture.md)
- [Delivery plan and task status](docs/delivery-plan.md)
- [Content and asset provenance](docs/content-sources.md)

Target repository: `MEC-IDEALAB/IDEALAB-MEC-WEB` (private). Vercel is the selected hosting provider; deployment/account/domain setup and full production acceptance are separate unfinished steps. GitHub's hosted check results must be inspected on the current revision; a workflow file alone does not establish a pass or branch protection.
