# Onboarding preview verification

**Run date:** 2026-10-21

**Repository base:** `6174443` (`Harden web CSP and Supabase session cookies`) plus the onboarding preview working-tree changes.
**Target:** Production Next.js build served on loopback with `ENABLE_DESIGN_PREVIEW=true`; the disabled-feature route was checked separately. No shared Supabase account or user data was used.

## Result

The six-field onboarding design preview passes the local browser acceptance journey. It validates required fields, moves keyboard focus to the error summary, links each missing field to its input, and reports preview-only completion without a persistence claim. It labels the field as current year of study and institution as free text, reflecting the owner's latest decisions. The route is `noindex,nofollow` and returns 404 when its feature flag is disabled.

The no-JavaScript case fills all six fields with synthetic values and activates the check button. The URL remains unchanged and the browser records no request after activation. The preview component has no HTML form, input submission names, network client, storage access, or database action. These checks establish only the behavior of this non-persistent preview.

## Checks

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run test:boundaries` | Pass, 16 tests |
| `npm run build` | Pass; includes `/design/onboarding` |
| `npm run test:acceptance` | Pass; includes onboarding validation, no-storage, no-JavaScript/no-request, feature-disabled 404, responsive light/dark checks, and existing public/member-preview journeys |
| `node scripts/check-docs.mjs` | Pass; 14 Markdown files and 62 local links |
| Independent security review | Pass for the no-JavaScript submission issue; reviewer confirmed that the follow-up zero-request assertion closes the remaining test-coverage gap |

Browser screenshots from the acceptance run are available locally under `artifacts/acceptance/onboarding-preview-320-light.png`, `onboarding-preview-1440-dark.png`, and the other generated viewport variants. At 320 px the page has no horizontal overflow; the phone layout uses vertical scrolling by design.

## Not verified / release gates

- Signup, email confirmation, Google OAuth, account recovery, and the real onboarding save flow remain disabled and unverified.
- This preview does not establish that a user is authenticated, affiliated with an institution, or authorized for lab operations.
- The live `grow-idealab` schema and policy review found schema/migration drift, broad profile access/grants, no trusted Auth profile-provisioning path, and a verification-setting conflict. No live DDL, account creation, or user-row mutation was performed.
- Validation limits and cross-app storage for current study year and free-text institution remain open; do not map the study-year value into the legacy graduation/batch `end_year` column without a reviewed contract.
- A reviewed forward migration, explicit approval, cross-app mobile/web compatibility, scoped negative authorization tests, and real acceptance journeys are required before enabling production onboarding or member access.
