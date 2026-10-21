# Onboarding preview verification

**Run date:** 2026-10-21

**Base commit:** `c56665ba890c236f868be9f727200cbc58f8cea3` (`feat(onboarding): define six-field student profile`).
**Verification target:** code revision `ca08645bf6e129698d413270707389033abf38dd`. The report and other decision documents are subsequently updated with its check results.
**Target:** Production Next.js build served on loopback with `ENABLE_DESIGN_PREVIEW=true`; the disabled-feature route was checked separately. No shared Supabase account or user data was used.

## Result

This recorded browser run targets the earlier multi-institution onboarding draft. Its historical assertions covered required-field validation, focused error summaries, Year 1–8 choices and a non-persistent preview. The owner later narrowed the pilot to MEC students in both clients, replaced free-text institution with a read-only canonical MEC value, and added a self-declaration; this earlier run does not verify those later rules. The current preview source shows five editable fields plus the canonical institution, a registration-number format hint and an explicit MEC self-declaration. It still makes no persistence, availability or independent eligibility claim. Use the latest source/revision checks in the GitHub issue tracker for current UI acceptance; the revision and commands recorded below are historical evidence for the earlier preview.

The no-JavaScript case fills the six controls with synthetic values and activates the preview-check button. The URL remains unchanged and the browser records no request after activation. The preview component has no HTML form, input submission names, network client, storage access, or database action. Screenshot inspection covered 320 px light mode and 1440 px jet-black dark mode; mobile vertical scrolling is expected for the six-field page. These checks establish only the behavior of this non-persistent preview.

## Checks

| Check | Result |
| --- | --- |
| Node runtime | Pass; bundled Node.js `v24.19.0` satisfies the package engine |
| `npm run lint` | Pass on the working tree for verified source `ca08645` |
| `npm run typecheck` | Pass on the working tree for verified source `ca08645` |
| `npm run test:boundaries` | Pass, 16 tests |
| `npm run build` | Pass; production build includes `/design/onboarding` |
| `npm run test:acceptance` | Pass; current year choices, required validation, no storage, no-JavaScript/no-request, feature-disabled 404, responsive light/dark checks, and existing public/member-preview journeys |
| `node scripts/check-docs.mjs` | Pass; 14 Markdown files and 63 local links in the onboarding-preview verification tree |
| Screenshot review | Pass; 320 px light and 1440 px jet-black dark versions inspected for overflow and form layout |
| Independent security review | Pass for the non-persistent preview boundary and no-JavaScript request assertion; the current review also checked planned-policy wording and the single-stage scope. |
| Hosted Website CI on base `c56665b` | Failed at the focus assertion before the summary focus callback completed ([run 39490312810](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39490312810)); this exposed a real timing race. |
| Hosted Documentation CI on base `c56665b` | Pass ([run 39490312814](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39490312814)). |
| Hosted Website CI on corrected source | Pass, including full Chromium acceptance, retained browser evidence and required gate ([run 39491072209](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39491072209)). |
| Hosted Documentation CI on corrected source | Pass ([run 39491072246](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39491072246)). |

Browser screenshots from the acceptance run are available locally under `artifacts/acceptance/onboarding-preview-320-light.png`, `onboarding-preview-1440-dark.png`, and the other generated viewport variants. At 320 px the page has no horizontal overflow; the phone layout uses vertical scrolling by design.

## Not verified / release gates

- Signup, email confirmation, Google OAuth, account recovery, and the real onboarding save flow remain disabled and unverified.
- This preview does not establish that a user is authenticated, affiliated with an institution, or authorized for lab operations.
- The live `grow-idealab` schema and policy review found schema/migration drift, broad profile access/grants and no trusted Auth profile-provisioning path. Its raw global roll-number constraint does not enforce the MEC pilot's case/space-normalized claim rule and cannot prove ownership of the first claim. No live DDL, account creation or user-row mutation was performed.
- The Supabase connector cannot currently re-read Auth provider settings; a prior dashboard read reported email autoconfirm enabled. Treat verification configuration as unverified until checked through an authorized settings interface.
- Cross-app storage for current study year, canonical MEC institution, department, registration claim and self-declaration requires a reviewed migration. Do not map current study year into legacy graduation/batch `end_year`.
- A reviewed forward migration, explicit approval, cross-app mobile/web compatibility, scoped negative authorization tests, and real acceptance journeys are required before enabling production onboarding or member access.
