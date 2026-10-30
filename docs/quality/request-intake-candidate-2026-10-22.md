# Work request intake candidate — 22 October 2026

Historical checkpoint: installation, retention and SQL execution status below
are superseded by [23 October acceptance status](work-request-intake-2026-10-23.md).

This checkpoint is **not installed, not enabled and not production-ready**.
No new database DDL or work-request data mutation was performed. The isolated
metadata check confirms no existing public/private work-request table and two
real completed profiles, only one admitted. The second identity reused the
first registration number and can only support denial tests, not admitted
cross-member or creator/head acceptance. Production remains unchanged.

| Owner | Dependency | State | Output/evidence | Review/QA | Next action |
| --- | --- | --- | --- | --- | --- |
| Main | Owner service/form replies | Specified | `work-request-intake-contract.md` | Required service/title/description, optional technical/time/links | Keep full WEB-008/009/010 scope |
| Main | Student-only intake | Source implemented, disabled | Submit/list/detail/cancel actions and pages; SQL candidate | TypeScript, lint, 93 boundary tests and production build passed | Retention decision then isolated install/SQL/E2E |
| Read-only reviewer | Candidate/API/privacy | Reviewed with corrections | Native reviewer challenged URL/byte-limit and FK retention | Canonical web URLs, robust plain-text read fallback and no SQL-only byte cap; retention unresolved | Re-review actual installation outcomes |
| Main | Actual existing test identities | Suites prepared, unrun | Catalog and transition SQL files | No database assertion pass claimed | Run catalog in installation transaction, transitions in rollback |
| Main | Running form | Scoped UI checks passed | Optional technical note, review/Back, default-disabled submit | 8 width/theme observations, no overflow | Database installation and genuine submit/cancel remain pending |

The candidate separates Work Request from legacy `tool_bookings`, machine
tasks/queues, inventory and payments. It derives owner from Auth and checks the
current admitted active Student predicate, locks profile then request, binds
command UUIDs to payload and writes receipt/history atomically. No head is
inferred from account role or client fields. Internal claim/review markers guard
direct cancellation but no head writer exists; head/cancel concurrency is not
established. Reasoned cancellation after head involvement, collaborator privacy,
material edits and agreed scheduling remain required later V1 work.

Web writes normalize URLs using the platform parser. SQL uses bounded HTTP(S)
syntax and authority/IP/port checks; it does not implement all IDNA/WHATWG rules.
The read path therefore preserves bounded HTTP references from other clients,
rendering unparseable values as explained plain text rather than hiding the
whole request or creating an invalid clickable link. Protocol/credentials/control
characters remain rejected. Native URL vectors and maximum multibyte text are
tested in `scripts/work-request.test.mjs`; SQL versions remain unrun.

`ENABLE_WORK_REQUEST_INTAKE` defaults false. The server action and member UI
also require `ACCOUNT_ENVIRONMENT=validation` and Student role. Direct database
RPC authorization remains its own admission/owner boundary; the app flag is not
a database permission. Enabled test copy explicitly says no head notification
or staff review. Default-disabled browser draft and design previews do not submit.
No fake service, Auth identity, successful receipt or saved online history is used.

Account deletion/retention is a real pending choice: the draft FKs currently use
NO ACTION and receipts retain the intake payload. Do not install before settling
whether private request content/history is deleted or retained anonymously when
an account is permanently removed. No account deletion was requested or performed.
The preflight also requires separate confirmation of the exact isolated project
ref through current tool metadata; its generic SQL baseline is not target identity.

Source checks use explicit bundled Node 24. SQL catalog tests must be appended
to the candidate in the same explicit outer migration transaction; they are not
valid as standalone autocommit checks. Transition tests require the approved
existing isolated identities and roll back all effects. Their sequential retries
and internal-marker fixture cannot prove concurrent races or actual head review.
No feature push, hosted CI, merge or deployment is claimed for this source.

23 October follow-up: the running Node 24 production build shows the technical
detail textarea as optional; its value survives Continue → Review → Back. Review
was observed at 360/390/768/1440 widths in light/dark themes: eight observations,
zero horizontal overflow, and no Submit test request control while the intake
flag is off. No local draft was saved/deleted and no online action was performed.
The temporary entered text explicitly says it is an unsaved interface check.
Sanitized preview: `artifacts/acceptance/request-intake-review-phone.png`.
Full 93 boundary tests passed before the final malformed-reference read fallback;
the eight affected work-request tests and focused lint passed again afterward,
as did the production build including TypeScript. No SQL suite was executed.

Independent review accepted the written IDNA/plain-text fallback boundary and
found one disclosure correction: review now states that the full entered request
and retry receipt are saved, no head is notified, and cancellation does not erase
the record. It no longer describes storage as a receipt only. The actual rendered
invalid-reference span-versus-anchor path remains unverified until data acceptance.
