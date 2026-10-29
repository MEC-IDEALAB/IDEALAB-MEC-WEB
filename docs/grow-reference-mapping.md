# Grow reference mapping — 27 October 2026

The website is a standalone repository at `IDEALAB/idealab-mec-web`; the sibling
`IDEALAB/Grow` folder contains the Flutter app. The Grow screens are a design and
flow reference, not evidence that their sample controls or direct database
access are ready for the website.

| Surface | Grow reference | Website layout and actions | Remaining work |
| --- | --- | --- | --- |
| Home | `Grow/lib/features/home/presentation/screens/rc5_home_screen.dart`: identity card, quick actions and activity cards | Greeting and profile shortcut → Visit, Requests, Projects, Events → lab state and own visits → next events → recent projects and request entry | The next-events read is installed and SQL-tested in isolation; shared-backend rollout and authenticated rendering of this new section remain open. |
| Lab | `Grow/lib/features/akathalam/presentation/screens/akathalam_screen.dart` and `Grow/lib/features/lab/presentation/screens/lab_screen.dart` | Core-reported opening history → own visit state → visit guidance → Requests, Borrowing, Events, Visits and Projects → upcoming programme and facilities links | Borrowing and inventory are not connected. Isolated visit/opening flows need cross-user and shared-client acceptance. Grow's fixed hours and placeholder facility chips are not current lab policy. |
| Profile | `Grow/lib/features/profile/presentation/screens/rc5_profile_screen.dart` and its `digital_id_card.dart` | Private member card → full name, email, phone, registration, department, year and institution → profile editing → separate registration management → Settings | Profile changes use the guarded isolated account contract. Shared production permissions and cross-client compatibility remain a release gate. A QR code is not treated as proof of check-in. |
| Settings | `Grow/lib/features/profile/presentation/screens/rc5_profile_screen.dart` settings sheet | Device appearance control → link to profile details and registration; Sign out is available in the Profile navigation | Notification/privacy preference editors are not connected. Do not reproduce Grow's unavailable controls as functioning settings. |

The website preserves the approved MEC pilot's six required profile fields;
Grow's older three-field editor marks phone and roll optional. Existing admitted
students edit their details with **Save changes** and are not told they must
repeat admission. If the account still needs admission, the form explains that
the declaration follows the profile save. Changing an accepted registration
claim remains a separate action.

Grow's direct `public.users` and `lab_sessions` calls are not a substitute for
server authorization. The website uses guarded routines in the isolated
validation project; the production Grow schema has separate permission and
client-compatibility issues. Current evidence and release gaps are tracked in
[account readiness](account-readiness.md), [backend readiness](backend-readiness.md)
and [release readiness](release-readiness-2026-10-23.md). Payment, staff review,
inventory, event registration and other unfinished workflows remain explicit.

This reference review inspected source only. It did not read private member
records, change Grow, write to a database or establish a production release.

## Verification

After moving the complete standalone repository beside Grow, Git reported the
same branch and 215 modified/untracked entries as before the move; the `.git`
directory, local environment file, lockfile, source, assets and database
scripts remained present. This is a same-volume folder move, not a fresh clone.

On Node 24.22.1, current-source lint, TypeScript, 108 boundary tests and the
normal production build passed. Before the subsequent next-events integration,
the isolated acceptance build and public/design-preview Chromium suite passed
at five widths in light and dark, including the new keyboard focus check for
invalid request links. An independent read-only review identified and rechecked
the legacy-draft recovery cases. Real account creation, email delivery,
operational writes and the newly adjusted authenticated Profile and next-events
layouts were not tested by that browser suite. Previous isolated Google and
onboarding evidence remains documented separately in [account readiness](account-readiness.md).
