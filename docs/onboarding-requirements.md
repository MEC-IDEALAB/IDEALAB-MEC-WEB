# Student signup and onboarding requirements

Status: product decisions confirmed; implementation and shared-backend activation remain blocked by auth/schema/security reconciliation. This is the website's canonical summary of the mobile onboarding requirements and the latest decisions carried into IDEALAB MEC web.

## Confirmed product decisions

- The initial student pilot is MEC-only in both the website and Grow app. This supersedes unrestricted student admission by any verified email. Email ownership still requires verification; no college-email domain or `.mec`-substring check is invented. See [the MEC admission contract](mec-pilot-admission.md).
- After email ownership is verified, trusted provisioning creates an active ordinary `student` account without a Super Admin account-approval gate. The student separately self-declares current MEC attendance and claims one unique registration number; the pilot does not check college records or independently verify that claim.
- Email verification and onboarding are separate gates: verify first, then complete onboarding before entering the signed-in member experience. Verification proves control of an email address; it does not prove MEC or other institutional affiliation.
- Onboarding requires all six fields: **name, phone, roll number, department, year, and college/institution**. Do not mark the profile complete until the server confirms that the required profile update succeeded.
- The owner clarified that **year means a selected current study year from Year 1–8**. The earlier multi-institution flow used free text; the MEC-only pilot uses one canonical MEC institution value. Current study year remains separate from admission year.
- The pilot uses MEC registration numbers, including the supplied `MDL24CS219` example and `LMDL` lateral-entry prefix. Each normalized MEC number has one claim, independent of institution-label aliases. The approved comparison ignores case and repeated/surrounding spaces while preserving display text. Students self-declare MEC eligibility and that their number was issued to them; one-claim uniqueness does not prove the first claimant owns it. Keep that assurance limit visible and do not label the number verified.
- Required phone input includes `+` and a country code. Existing values are not silently rewritten, and storing a number does not claim SMS verification.
- Students may edit their own required profile details after onboarding within the pilot contract; institution stays canonical MEC, and a registration-number change needs a reviewed claim transition. The required fields remain private by default; no public-directory visibility is implied.
- The web and mobile apps share Supabase Auth and the same member identity. Do not create a second account/profile authority for the website.
- Signup creates an ordinary Student account only. Onboarding must not let a user choose or self-assign an administrator role, an operational head position, or machine/room permissions.
- The owner approved a coordinated Flutter update before shared-backend activation. Generic conflict errors and enforceable limits on repeated saves are accepted despite limited inference that a guessed registration pair may already be occupied; no other profile information may be disclosed.

The ordinary-account provisioning decision applies to student accounts and does not bypass MEC admission. The existing Grow identity policy describes faculty onboarding as invitation-only; the latest answer did not change that policy. A separate professional account type or professional signup path has not been approved here.

## First-time account journey

```text
Public homepage
  -> Sign up with email/password or a configured identity provider
  -> Verify email ownership
  -> Sign in intentionally
  -> Resolve the existing Supabase Auth identity and its single public.users row
  -> Complete name, phone, roll number, department, year and college/institution
  -> Confirm successful server save and profile_completed state
  -> Satisfy the chosen MEC registration-claim admission policy
  -> Enter the signed-in Home
```

An existing verified account follows the same profile-completion gate. Email/password and Google must resolve to the same Supabase identity/profile contract; Google cancellation or provider errors must leave a recoverable email path. A used, expired or invalid verification callback must not create a session. Backend unavailability must render a retryable error, not masquerade as an incomplete profile.

## Screen and interaction requirements

- Keep sign-in and account creation focused on authentication. Make the required onboarding fields a clearly named follow-up step, with visible progress and an explanation of why institutional details are collected.
- Use a phone-first, single-column form with all required fields clearly marked, keyboard-appropriate input types, inline field errors, a focused error summary when submission fails, retained safe input, duplicate-submit protection, and explicit Back/Continue/Save behavior.
- Support interrupted progress and a recoverable retry. The old mobile cache/migration mechanism is not approved as a backend contract; choose a safe draft strategy that does not mark unsaved data complete or leak private data on shared devices.
- The initial web onboarding asks only for the six required fields. Optional profile enrichment (username, bio, interests, skills, goals, avatar/photo, portfolio, experience, volunteering, badges and verification) comes later and is outside this first flow. Do not require exactly five interests or fabricate a verification badge.
- Provide loading, save success, validation, recoverable failure, offline and permission-denied states. Respect reduced motion, enlarged text, visible focus, WCAG contrast and at least 48 dp touch targets. Do not make animation block form completion or navigation.
- Email, phone, roll number, institution, department, year and audit fields are private by default until a field-by-field visibility contract says otherwise. Do not equate an email domain, a roll number, or a profile label with staff verification.

The historical Grow mobile design handoff describes a required identity path for MEC and other students, later optional interests/skills, clear progress/privacy copy, resumable errors, phone and wide layouts, and no invented verification badge. The owner chose to defer the optional mobile enrichment fields from initial website onboarding. The handoff is a design candidate, not evidence that the Penpot canvas is current or that those screens are implemented. The website's visual tokens remain in [design-system.md](design-system.md).

### Mobile source reconciliation

The parent Grow repository contains older policy notes and mobile implementations with fields and behavior that differ from the confirmed web contract. Preserve useful presentation ideas, but do not treat those paths as current cross-platform policy:

| Source | Existing mobile behavior | Web interpretation |
| --- | --- | --- |
| `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md` | The minimum flow lists name, optional phone, optional `college_roll`, then `profile_completed`. | The newer confirmed requirement makes phone and roll required and adds department, year and college/institution. The old minimum does not satisfy onboarding. |
| `lib/features/auth/presentation/screens/rc5_onboarding_screen.dart` | A nine-step draft includes username, bio, interests, skills, role/department, goals and preview; progress is held in device preferences. Completion sets `profile_completed`. | Use the six-field web onboarding first. Defer username, bio, interests, skills and goals to a later profile-editing experience; local draft state alone must never complete the server profile. |
| `lib/features/auth/presentation/screens/profile_setup_screen.dart` | The user selects a role and the screen writes `role` with `profile_completed`. | Do not copy self-selected roles. A new account is an ordinary Student and authority is server-managed. |
| `lib/features/profile/presentation/screens/edit_subpages/rc5_edit_education_screen.dart` | Labels fields “College / University,” “Department / Degree,” and “Graduation Year / Batch”; writes education details and `college_roll` through separate paths. | The owner chose current year of study; the latest pilot now fixes institution to canonical MEC, superseding earlier free-text entry. The old graduation/batch field and `user_education.end_year` must not be reused as current study year without a reviewed cross-app data contract. The old multi-table writes are not an approved atomic contract. |

The current `/design/onboarding` source is deliberately non-persistent. It shows six profile values, with five editable fields and read-only “Model Engineering College,” Year 1–8, privacy-intent copy and linked errors. Phone feedback checks `+` plus digits (up to 15); registration feedback checks `MDL` or `LMDL` plus an alphanumeric suffix without assuming course codes or suffix lengths. A separate MEC student self-declaration is required. This preview does not check phone reachability, full number-format coverage, claim availability, or the declaration against college records. Values remain in page memory; the result makes no save or independent-verification claim. Current-source browser acceptance passed locally.

## Shared data and security boundary

- Supabase Auth remains the identity authority. `public.users` is the operational account/profile-completion row documented by the mobile app; extended profile tables are not an authorization source.
- Provision the Student role and active state through a trusted server/database path. Never accept client metadata, a form value, an email substring, or a client-side default as authority for `role`, `is_active`, or operational positions.
- The current documented mobile minimum-profile flow writes `name`, optional `phone`, optional `college_roll`, and `profile_completed`. The confirmed six-field contract expands that shape; reconcile schema, Flutter and web clients together. Do not write fields into a legacy profile table as a workaround.
- The 21 October 2026 read-only website audit recorded broad `public.users` authenticated read/update behavior affecting sensitive fields, no `auth.users` profile-provisioning trigger, and material drift between the live `users.role` schema and the canonical migration files. A prior dashboard read recorded `email_autoconfirm=true`; the current Supabase tool connection could not re-read Auth provider settings. The live account table does not have institution, department, or current study-year fields. The existing `user_education.end_year` means graduation/batch year and must not be repurposed for current year of study. The live `college_roll` is globally unique; it does not establish the pilot’s normalized one-MEC-registration claim or ownership contract. The earlier multi-institution uniqueness proposal is historical. Therefore, the current signup policy is a product requirement, not proof that production signup is safe or enabled.
- Flutter also reads `users.name` for project-team chips (`lib/features/projects/data/project_repository.dart`) and pending-booking rows (`lib/features/admin/data/admin_repository.dart`). Those cross-user name reads conflict with the private-by-default requirement. Keep names hidden by default; use an optional minimal roster identity for project teams and an assigned-scope server query for booking heads, showing a generic member label when the person has not opted in. Do not create a legal-name exception for the workflow without a separate approved field-visibility decision.
- Website activation remains disabled by default. Do not switch it on until email verification configuration, one-time idempotent profile provisioning, column-level writes, RLS visibility, and Flutter compatibility have a reviewed migration and negative authorization tests.

## Acceptance criteria

1. A verified email can create one ordinary Student identity without invented domain restrictions; student workspace admission requires six complete fields, an explicit MEC self-declaration and one unique registration claim in both clients. The pilot does not verify the declaration against college records.
2. Email signup cannot enter the member app before email confirmation and intentional sign-in. Google and email paths converge on the same existing identity and profile gate.
3. New profile provisioning is idempotent. `role=student`, active state and `profile_completed=false` are assigned by a trusted path, not client input.
4. An incomplete Student profile is routed to onboarding. Home requires the server-confirmed six-field profile and the MEC student self-declaration and unique registration claim; direct links cannot bypass either gate. Preserve existing trusted staff access and inactive restrictions.
5. A backend error remains a visible retryable error; it does not become a successful profile, a false “incomplete” diagnosis, or a client-only completed state.
6. A member can edit only approved own-profile fields. Tests reject role/status changes, cross-user access, and anonymous access to private profile data.
7. Onboarding can be resumed safely, and no optional enrichment, profile badge or operational permission is silently required or granted.
8. The same acceptance journey passes for existing mobile accounts and new website accounts against a production-faithful test environment before shared-backend activation.

## Decisions still needed before field-level implementation

See the [shared profile implementation proposal](shared-profile-contract-proposal.md)
for the recommended existing-row mapping, field/comparison rules, server state
machine, own-profile API, privacy boundary and cross-client rollout. Those
recommendations remain a review candidate until the listed decisions are settled;
they do not change the confirmed product requirements above.

- Final technical length/phone-validation rules, registration-format/course coverage and enforceable duplicate-save limits. The owner accepted self-declared MEC eligibility for the pilot; it is not an independent ownership check. Country-code phone input, case/space comparison, Year 1–8 and MEC-only scope are settled; no institution label or email substring is used as proof.
- The reviewed shared-data mapping for institution, department and current study year, and a reviewed replacement for the current raw global roll-number uniqueness constraint. First inspect existing values using the approved case/space normalization; preserve the existing constraint until a reviewed cutover, and do not broaden uniqueness to multiple institutions because the pilot has one canonical MEC claim scope. Student self-edit is approved for their own required fields; keep all six private by default and reject cross-user edits.
- Project roster display-name opt-in and the requester identity visible to an assigned machine/room head. Until this field-level privacy policy is approved and implemented, use a generic member label in cross-user views.
- Whether a separate professional account path will exist, and which signed-in modules non-MEC participants may use; each event/request still follows its own eligibility contract.
- Which fields a signed-in public profile may show, and the approved versioned Terms, Privacy Policy and Lab Rules/consent record.
- How to preserve existing mobile accounts and partial onboarding data while making phone and roll number required and adding department, current study year and the canonical MEC pilot institution to the documented minimum profile. Migration ordering and legacy schema compatibility need review. The current study-year field must remain distinct from graduation/batch history.
- Actual email confirmation delivery, provider callback configuration, Google new/existing-account behavior, and the exact production browser/device acceptance account.

## Source reconciliation

The parent Grow workspace has useful upstream context in `docs/01_Product/PRODUCT_DECISION_DELTA_2026-09-17.md`, `docs/01_Product/AUTH_IDENTITY_POLICY.md`, `docs/02_Product/PROFILE_ECOSYSTEM_DECISION_GATE.md`, `docs/03_Database/AUTH_PROVIDER_RELEASE_CHECKLIST.md`, `docs/03_Database/ROLE_AND_POSITION_CONTRACT.md`, `docs/03_Database/BACKEND_SECURITY_BASELINE.md`, and historical design notes under `.local/recovery/2026-10-16/original-primary-docs/`.

These sources disagree in age and authority. The product decision delta allowed any email domain for eligible signed-in participants; the latest owner decision now restricts the student pilot to MEC in both clients with a registration-number claim. Email ownership remains required, and no domain is invented. The profile decision gate's older `name` plus optional `phone`/`college_roll` rule is superseded by the six required fields. Historical `product_architecture.md` says Google-only and requires profile photo, username, bio and exactly five interests; those requirements conflict with current email-plus-Google auth and the compact minimum profile, so they must not be implemented as mandatory onboarding. Historical SharedPreferences migration notes describe implementation exploration, not a source-of-truth backend contract.

Current website status and evidence are maintained in [requirements.md](requirements.md), [experience.md](experience.md), [architecture.md](architecture.md) and [ui-audit.md](ui-audit.md). This document records requirements; it does not claim working signup, live database writes, approved production SQL, or a passing real-account journey.

## Password-recovery UX status

The website has a responsive, noindex password-request page and a separate
new-password page. It uses generic request feedback, a fixed-origin PKCE
callback, session-verified password changes, visible password controls, and
the same direct light/dark toggle as the account screens. These actions remain
disabled with the shared member-platform flag. Local Chromium and configuration
fixtures validate layouts and rejection boundaries only; delivery, provider
allowlisting, recovery exchange and password update against a real shared
account are still unverified. See [deployment setup](deployment.md#environment-boundary).
