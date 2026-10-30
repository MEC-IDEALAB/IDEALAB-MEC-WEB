# Grow reference and current account check

22 October 2026; local website only. No production schema, parent Flutter source,
GitHub push or deployment changed.

## Design implementation

Current Grow source inspected: `rc5_home_screen.dart` (identity link, compact
four actions and activity hierarchy), `akathalam_screen.dart` (visit feature
and institutional section), `rc5_profile_screen.dart` and `digital_id_card.dart`
(member identity above account details/settings). Website now includes a compact
Home identity shortcut and four actions, a visit-focused Lab feature plus
institution links, and a private member card above Profile details and editors.
The user-approved Home / Lab / Profile top navigation remains.

No Grow hardcoded Wi-Fi/power claim, invented handle/QR, visitor count, booking,
event record or admin authority was copied. Unconnected services retain factual
states. The Profile card is a private account view, not proof of student identity.

## Actual checks

| Journey | Result |
| --- | --- |
| Blank create-account form | Rejected by native required email validation; email focused; no account creation |
| Signup → sign-in card and blank sign-in | Navigation worked; blank login rejected with email focus |
| Current profile wizard final Review | All three prior-step fieldsets hidden but enabled; all six named controls and revision present |
| Real unchanged-profile save | Submitted through actual signed-in server action; measured database revision 5 → 6, complete active profile remains, current claim 1 and pending 0 |
| Sign out | Returned to sign-in; navigating to `/app` denied the signed-out session |
| Google sign-in | Existing approved Google account selected; real callback returned to `/app` and rendered quick actions without repeating onboarding |
| Home/Lab/Profile responsive | Four widths (320/390/768/1366) × three pages × dark/light: 24 observations, no horizontal overflow |
| Lab feature contrast | Screenshot caught gray/white text on blue; corrected to accent ink; browser measured body contrast approximately 9.0:1 in dark mode |
| Temporary browser draft cleanup | Exact approved title verified in request hub; app deletion confirmed; empty-draft state and deletion notice observed |
| Source quality | Targeted ESLint, 36 auth/profile/claim boundary tests, production build and TypeScript passed |
| Independent review | Current UI guards, labels, responsive controls and truthful service states accepted |

An initial reviewer report about disabled prior-step fields was stale and withdrawn.
Current wizard SHA-256 `8b4045e6673b0b0635ad49033e88b9ab25e13d07c555ecd2e02cb2d5418db289`
uses pending-only disabling. The actual database save confirms this source works.

Local-only screenshots (generated under the ignored `artifacts/acceptance/`
folder and intentionally not committed): `grow-inspired-home-phone.png`,
`grow-inspired-lab-phone.png`, and `grow-inspired-lab-desktop.png`.
No email, phone, registration number, credential or session was captured.

## Profile detail visibility follow-up — 23 October 2026

The protected owner-only Profile page now displays all six saved account fields
in a responsive private-details grid: email, phone, MEC registration number,
institution, department and study year. Existing server-loaded profile data is
the sole source; the page performs no new query or broader read. Profile editing
and the separate MEC claim form remain collapsed until requested. Node 24.19.0
TypeScript, full ESLint, all 100 boundary tests and the optimized Next build
passed. The running local site on port 3015 now serves that build; HTTP checks
returned 200 for the public homepage and redirected an unauthenticated profile
request to sign-in. The local browser is disabled in Work settings, so this
update has not received a fresh signed-in visual acceptance or screenshot.

## Pending genuine email journey

Email/password signup, confirmation, password login and recovery have not passed
a genuine positive journey. The create-account form is open for private password
entry. The owner asked the agent to create the account, but browser credential
rules require the owner to enter and submit the new password; no password was
generated, entered, read or recorded. No fabricated Auth row or confirmation bypass
was used. Existing Google login does not establish email/password acceptance.

Second-account isolation, conflicts/concurrency, shared Flutter compatibility,
operational workflows and hosted release checks remain open. The full public
regression passed before these latest UI additions; this change has focused real
browser checks and does not claim a new full-suite run.

## Browser access recovery and wider current-source checks — 23 October 2026

The earlier local-browser-disabled note reflects the previous check. Browser
access is now available again. The signed-in local member pages were read at
320, 390, 768 and 1366 px: Home, Lab and Profile showed no horizontal overflow;
the Profile detail grid displayed only its six field labels in the evidence,
using one column on phone widths and two columns on tablet/desktop. No new
profile/account values were captured and no data-changing controls were used.
See the [focused member and database evidence](member-pages-browser-2026-10-23.md).

The current Node 24 source check also passed optimized build, TypeScript,
ESLint, 100 boundary tests and the real-browser public/auth acceptance suite.
That suite uses an isolated `.invalid` Supabase configuration and cannot
substitute for positive email/password or recovery delivery. Live request
submission/cancellation, second-member access and shared production compatibility
remain unverified.
