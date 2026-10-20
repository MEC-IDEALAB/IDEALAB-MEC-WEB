# Onboarding preview verification

**Run date:** 2026-10-21

**Base commit:** `c56665ba890c236f868be9f727200cbc58f8cea3` (`feat(onboarding): define six-field student profile`).
**Verification target:** working-tree focus-timing correction and decision-document updates based on that pushed source; hosted rerun is pending.
**Target:** Production Next.js build served on loopback with `ENABLE_DESIGN_PREVIEW=true`; the disabled-feature route was checked separately. No shared Supabase account or user data was used.

## Result

The six-field onboarding design preview passes the local browser acceptance journey. It validates required fields, moves keyboard focus to the error summary after React commits the error UI, links each missing field to its input, and reports preview-only completion without a persistence claim. It captures current study year with exactly Year 1–8 options, keeps institution free text, describes institution-scoped roll-number uniqueness, and states self-edit/privacy as planned policy rather than established behavior. Optional profile enrichment is deferred from initial onboarding per the owner's latest decision. The route is `noindex,nofollow` and returns 404 when its feature flag is disabled.

The no-JavaScript case fills the six controls with synthetic values and activates the preview-check button. The URL remains unchanged and the browser records no request after activation. The preview component has no HTML form, input submission names, network client, storage access, or database action. Screenshot inspection covered 320 px light mode and 1440 px jet-black dark mode; mobile vertical scrolling is expected for the six-field page. These checks establish only the behavior of this non-persistent preview.

## Checks

| Check | Result |
| --- | --- |
| Node runtime | Pass; bundled Node.js `v24.19.0` satisfies the package engine |
| `npm run lint` | Pass on current working tree |
| `npm run typecheck` | Pass on current working tree |
| `npm run test:boundaries` | Pass, 16 tests |
| `npm run build` | Pass; production build includes `/design/onboarding` |
| `npm run test:acceptance` | Pass; current year choices, required validation, no storage, no-JavaScript/no-request, feature-disabled 404, responsive light/dark checks, and existing public/member-preview journeys |
| `node scripts/check-docs.mjs` | Pass; 14 Markdown files and 63 local links on the final working tree |
| Screenshot review | Pass; 320 px light and 1440 px jet-black dark versions inspected for overflow and form layout |
| Independent security review | Pass for the non-persistent preview boundary and no-JavaScript request assertion; the current review also checked planned-policy wording and the single-stage scope. |
| Hosted Website CI on base `c56665b` | Failed at the focus assertion before the summary focus callback completed ([run 39490312810](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39490312810)); this exposed a real timing race. |
| Hosted Documentation CI on base `c56665b` | Pass ([run 39490312814](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39490312814)). |
| Current hosted Website / Documentation CI | Unverified for the focus-timing correction; rerun after the correction is pushed. |

Browser screenshots from the acceptance run are available locally under `artifacts/acceptance/onboarding-preview-320-light.png`, `onboarding-preview-1440-dark.png`, and the other generated viewport variants. At 320 px the page has no horizontal overflow; the phone layout uses vertical scrolling by design.

## Not verified / release gates

- Signup, email confirmation, Google OAuth, account recovery, and the real onboarding save flow remain disabled and unverified.
- This preview does not establish that a user is authenticated, affiliated with an institution, or authorized for lab operations.
- The live `grow-idealab` schema and policy review found schema/migration drift, broad profile access/grants, no trusted Auth profile-provisioning path, and a global roll-number constraint conflicting with the confirmed institution-scoped rule. No live DDL, account creation or user-row mutation was performed.
- The Supabase connector cannot currently re-read Auth provider settings; a prior dashboard read reported email autoconfirm enabled. Treat verification configuration as unverified until checked through an authorized settings interface.
- Cross-app storage for current study year, institution, department and scoped roll uniqueness requires a reviewed migration. Do not map current study year into legacy graduation/batch `end_year`.
- A reviewed forward migration, explicit approval, cross-app mobile/web compatibility, scoped negative authorization tests, and real acceptance journeys are required before enabling production onboarding or member access.
