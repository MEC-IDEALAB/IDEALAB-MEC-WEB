# Work request intake — isolated student contract

Requirements WEB-008/009/010/017. Owner decisions on 22 October approve nine
Machine categories (laser cutting, 3D printing, CNC, cup printing, T-shirt printing,
3D design, laser design, lathe, woodwork) and four Operations categories
(components, ICs, electronics tools, hardware). Service/title/description are
required. Technical detail, preferred IST date/time and up to five HTTP(S) links
are optional; the head may clarify technical details before approval.

This extends intake beyond the device-local draft. A submitted request is a
durable private record, not a booking, approved job, stock allocation, price,
payment, task or queue entry. Existing `tool_bookings` is not reused. Grow's
current Work Request provider is unavailable and its legacy fabrication-only
model is not a database contract. Canonical shared rollout requires coordinated
Flutter adaptation and authorization; only isolated validation is in scope here.

## Data and trust boundary

`idealab_private.work_requests_v1` holds generated id, owner FK, kind/service id, title,
description, technical text, preferred timestamp, links, status, revision and
server timestamps. Service keys follow `request-services.ts`. Technical text is
optional in one contextual field: quantity/material/dimensions for Machine,
item/quantity/purpose for Operations. The field is limited to 2,000 characters;
quantity is descriptive text rather than an inventory allocation. Blank optional
text is stored as an empty string.
Empty preferred time is null; browser local input is explicitly interpreted as
IST and normalized to a timezone-bearing instant, never the server/browser zone.

Internal nullable claim/review timestamps protect the direct-cancel cutoff. This
slice has no staff assignment/claim/review writer and does not infer a head from
role, email, category or client metadata. A future staff transition must use the
same request-row lock and append attributable history in its own reviewed
transaction. Client requests cannot set these fields or status/revision/owner.

Private command receipts bind owner + command UUID to exact normalized payload
and response. Replaying the same command returns its receipt; changed intent
with that UUID conflicts. Profile readiness is checked after locking the caller's
profile, before receipts; revoked/incomplete accounts cannot continue mutations.
Submit inserts request, receipt and immutable `submitted` event atomically.
Direct cancel locks profile then exact own request, checks revision/status and
absence of head claim/review, then appends cancellation history + receipt. It
does not delete records. After claim/review it returns a review-required result;
reasoned cancellation and head decision remain a separately gated next step.

All tables force RLS with no direct API grants. Authenticated-only guarded RPCs
derive actor from `auth.uid()` and use empty search paths; no service key or
anonymous operation. Lists/detail return only the caller's records and safe
history (status/time, no staff-private note or profile join). Missing and other
owners' detail return the same null. Lists use 20-item created-time/id seek
pagination. The service allowlist is enforced in SQL, not only in the browser.
No links are fetched on the server; embedded credentials, control/space characters
and non-HTTP(S) protocols are rejected. Web writes normalize references through
the platform URL parser, including IDNA and default-port handling. SQL checks
bounded HTTP(S) syntax/authority, IP literals and ports; it is not a full IDNA
implementation and does not claim browser URL-parser parity. A bounded HTTP
reference from another client that the platform cannot parse is kept as plain
text with an explanation rather than making the entire request unreadable or
creating a clickable invalid link. URL reachability is never claimed. Per-field
Unicode limits bound the payload; there is no inconsistent SQL-only byte cap.
Uploads/collaborator lookup remain off.

23 October retention decision: keep anonymized lab history after permanent
account deletion. Before the profile row is deleted, a fixed private trigger
archives each request under a fresh random archive ID with kind, service,
current status and ordered status/month history (IST months). It retains no
original request ID, owner/actor/command ID, exact timestamp, preferred time,
title, description, technical note, link or retry payload. Request/event/receipt
rows then cascade away. Archive rows have forced RLS and no API/report grants.
No account-delete endpoint is introduced. Other domains' existing retention/FKs
remain separate gates; this does not claim whole-account deletion acceptance.

Eligibility is specifically the admitted active Student predicate; a staff role
alone does not authorize student intake. Past preferred times are preserved as
provisional intent rather than rejected by an invented scheduling rule. Inputs
cannot reserve time or imply acceptance. No receiving staff workflow is active:
all submit receipts and surfaces explicitly say isolated validation, no head
notification/review. This is not live pilot intake until that receiving path is
implemented and accepted. Collaborators, material changes and head review remain
part of full V1, not accepted by this partial slice.

## UX and acceptance

The existing Type → Details → Review composer remains the single entry. Member
review gains explicit online Submit plus local Save draft. Preview remains local
sample-only and never invokes operational actions. An older sample draft must
choose a current service before review/submission. Saving a local draft does not
submit it; successful online submission does not silently delete a local draft.
Unknown outcomes preserve text and command identity, with a check-history link.
Detail shows a real server timestamp, service, description, optional inputs,
provisional preferred time and immutable history. Direct cancellation has an
explicit confirmation and leaves an auditable cancelled record.

Verify parser/command boundaries; SQL grants/owner/admission checks, replay,
changed-intent conflicts, field bounds, both service kinds, own-only paging,
atomic audit and cancellation cutoff. Genuine browser submit → detail → reload
→ history → cancel must pass against the isolated backend. SQL-role fixtures
are not browser authentication evidence. Current second Auth account is not
admitted because it reused the owner's number; it is useful for denial tests
but cannot prove admitted cross-member access or staff review. Actual concurrent
head/cancel races and staff/time/material-change journeys remain unverified.

| Owner | Dependency | State | Evidence | QA/next action |
| --- | --- | --- | --- | --- |
| Main | Approved categories/form | Implemented | Owner replies, request-services.ts, Type → Details → Review | Genuine online browser acceptance pending |
| Read-only reviewer | Current schema/product delta | No blocking defect found | SQL, commands, parsers, retention and ownership reviewed | Sequential fixtures do not establish actual concurrency |
| Main | Guarded SQL/UI | Installed only in isolation; local test flag enabled | 65 catalog assertions, transition suite, nine retention and six owner-isolation checks passed | See [current acceptance status](quality/work-request-intake-2026-10-23.md); browser access blocks submit/reload/cancel |
# Retry durability follow-up

The earlier in-memory command ID could change on reload after an uncertain
submission. A local fix journals one normalized pending command per account in
an IndexedDB transaction before dispatch, checks the account again on the server,
and reuses that command on retry. The browser offers a review of the saved payload
and blocks a different request while it is unresolved. A synthetic two-tab browser
check covers atomic creation, reload, changed payload, account isolation, storage
failure and conditional cleanup. This does not establish real submit/receipt or
account-switch acceptance against the isolated database; intake remains validation
only. See [issue #7](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/7).

A separate local-storage marker detects a missing IndexedDB journal when the
marker survives. If both stores are cleared or evicted, or the member changes
device, the client cannot detect a previous uncertain submission. Marker and
journal writes are not atomic across stores; stale markers can block submission
and need a reviewed recovery flow. Real browser/API/database acceptance remains
required before rollout.

The validation project now has an owner-scoped confirmed-submit receipt lookup.
Its installation ran in one transaction with rollback fixtures for owned and
other-owner receipts, cancellation, missing and malformed results, and ACL checks;
post-install metadata confirms anonymous execution and direct authenticated table
reads are denied, with no request or receipt rows retained. The browser recovery
action clears only the matching marker after a positive receipt. Missing or denied
receipts remain unresolved. Synthetic Chromium checks cover marker-only cleanup,
different pending records and storage removal failure; authenticated UI-to-RPC
acceptance, multiple-marker and in-flight transaction behavior remain unverified.
The candidate is not installed on the shared production backend.

An independent local review identified a stale confirmed marker beside a newer
pending request and a missing recovery-control refresh after storage loss. The
client now removes the confirmed old marker without deleting the newer journal,
and refreshes recovery options. The synthetic Chromium journal check covers the
stale-marker case and is wired into the local CI workflow. A read-only connector
timing probe was consistent with serialized database calls, so it cannot prove a
two-connection race; that acceptance remains open.
