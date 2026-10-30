# Isolated work request intake — 23 October 2026

This supersedes the installation and retention status in the
[earlier candidate checkpoint](request-intake-candidate-2026-10-22.md).
It does not establish production readiness or a completed staff workflow.

| Owner | Dependency | State | Output/evidence | Review/QA | Next action |
| --- | --- | --- | --- | --- | --- |
| Main | Approved services and form | Source implemented | Student submit, own list/detail, pre-review cancellation and device drafts | 93 boundary tests, lint and production build passed before the subsequent Home/Lab copy correction; focused lint and TypeScript passed after that correction | Verify current rendering after browser access returns |
| Main | Exact isolated project | Installed only in idealab-mec-validation | Migration ledger contains `isolated_work_request_intake_v1`; private forced-RLS tables and guarded RPCs | 65 catalog assertions passed in the installation transaction | Genuine browser acceptance |
| Main | Existing isolated identities | Rollback SQL passed | Validation, submission/retry/conflict, history, pagination, cancellation and unadmitted denial | Transition suite passed; six owner-isolation assertions passed | Actual overlapping transactions remain unverified |
| Main | Owner retention decision | Implemented and helper-tested | Fresh anonymous archive ID, service/status and month-level history; private content and original links removed | Nine rollback assertions passed; actual account deletion was not performed | Verify the full deletion lifecycle separately |
| Read-only reviewer | Current SQL and UI/API | No blocking defect found | Authorization, receipts, owner isolation and retention reviewed | Sequential head-marker fixtures do not prove head/cancel races; textarea limits are stricter for supplementary Unicode characters | Preserve stated limits |
| Main | Browser access | Blocked | Tool reports Local browser use disabled despite the owner reporting the setting is on | Genuine submit → detail → reload → cancel has not run | Resume after access takes effect |

The owner chose anonymized lab history after permanent account deletion. The
archive retains no original account/request/command identifiers, free text,
reference links, precise timestamps or retry payload. The helper and trigger
wiring were checked; a real user deletion and its interaction with other domain
foreign keys remain unverified. There is no new account-deletion endpoint.

The isolated migration was installed atomically with catalog checks. Production
`grow-idealab` was not changed. The application flag defaults false; only the
ignored local validation configuration enables it. Server actions and UI also
require the validation environment and Student role. Database admission and
ownership checks are independent of that presentation flag.

A fresh read on 23 October confirms zero request, command-receipt, event and
archive rows after rollback tests. No successful browser submission is implied
by those SQL fixtures. The second real identity is unadmitted and is used only
for denial/managed owner-isolation checks, not positive two-member acceptance.

Security advisors reported 17 informational private-table RLS/no-policy entries
and the existing leaked-password-protection warning. The latter remains open;
see [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Current receiving-head review, assignment, agreed scheduling, manufacturing,
stock, billing, notification delivery and post-review cancellation are incomplete.
Internal claim/review markers protect direct cancellation but have no staff UI
writer. No actual head race or overlapping transaction has been verified. SQL URL checks
are bounded syntax checks, not full browser IDNA/WHATWG equivalence; the rendered
plain-text fallback for a stored browser-unparseable reference remains unverified.

Earlier review/Back checks covered four widths in both themes, without overflow,
while submission was disabled. That screenshot is a draft preview, not online
persistence evidence. Current browser access blocks verification of the enabled
intake and subsequent Home/Lab copy. No application push, hosted CI, merge or
deployment validates this dirty source.

A subsequent [rollback overlap attempt](work-request-overlap-2026-10-23.md)
failed its wait assertion and captured no concurrent sessions. It is not a
passing concurrency test; all four request-domain row counts remained zero.
