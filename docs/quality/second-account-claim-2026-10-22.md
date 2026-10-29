# Second-account registration conflict — 22 October 2026

The owner reported a generic declaration failure while testing another login.
Only aggregate isolated metadata was inspected: two verified Auth accounts, two
completed profiles, one current registration claim, zero pending claims, one
account with one recorded conflict. One unadmitted profile's normalized number
matches the existing current claim. No email, name, phone, registration text,
Auth ID or session was emitted. Production was not queried or changed.

This is expected enforcement of one normalized registration number per account,
not rejection of the LMDL prefix. The test-account request should have explained
that another login for the same student cannot complete a second claim. A genuine
cross-member journey requires another consenting MEC student with their own
accurate details. Do not make up numbers, remove the first claim, force admission,
or promote the second account to staff just to satisfy a test.

The existing failure copy only suggested retrying later. It now explains the
one-account rule and directs someone who already onboarded to sign out and use
that account. It still does not disclose a number holder or distinguish occupied
numbers from other non-acceptance cases. This response has its own `not_claimed`
UI state, so it does not suggest a stale-profile reload for an unchanged conflict.
The declaration form prevents native reset of its controlled number/checkbox;
errors preserve the entry and do not silently change an explicit declaration.

Eight SQL-role assertions replayed the existing failed declaration inside an outer
rollback using its saved values without outputting them. They passed: generic
non-acceptance, unchanged profile/revision, no admission grant, unchanged current
claim count, no pending claim and LMDL validator acceptance. These are managed
SQL-role regression checks, not a new browser declaration or second admission.
Eight registration boundary tests pass, including generic reuse guidance and
absence of claim-holder/format/collision-limit disclosure. No privilege/schema
change, claim deletion or permanent fixture update was made.

A further ten SQL-role assertions used that existing unadmitted account and
passed: own profile remains readable but unadmitted; visit reads return no rows;
check-in/out and opening mutations deny; opening/project reads deny; the actual
other project detail and project creation deny. All effects rolled back. This
proves admission guards for a real second identity, not admitted cross-owner
membership/approval or a browser login test.

Home/Lab also now reuse the guarded `mine` projection for up to three recently
updated own projects. The owner approved nine Machine intake categories and four
Operations categories plus required service/title/description and optional
technical detail, time and references. The member draft uses those categories;
older sample drafts remain readable and require a current service before review.
Preview sample data stays labeled. This does not enable online request submission,
prove availability, set prices/stock or create scoped head authority.

Final current-source checks: 85 boundary tests, full ESLint, production build
including TypeScript, and documentation/link validation passed. A read-only
independent review found no blocking privacy/reset/legacy-draft issue; its request
for an isolated-project note on Home/Lab cards was implemented. Genuine signed-in
Chrome confirms the project card on Home and Lab at four widths (360/390/768/1440)
in two themes: 16 observations, no horizontal overflow. Browser request-form
checks confirm all nine Machine and four Operations choices, required empty
service validation/focus, CNC review copy, category reset on type change and
optional technical hints. No draft was saved, deleted or submitted in these checks.
The declaration's new error presentation awaits the owner's own next interaction;
the agent did not re-attest through the browser or capture private number fields.

Sanitized Lab evidence: `artifacts/acceptance/lab-recent-projects.png`.
The final local production server remains on port 3015. No new push or deployment.
