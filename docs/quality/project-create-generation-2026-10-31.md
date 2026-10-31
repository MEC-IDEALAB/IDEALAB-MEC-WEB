# Account-bound project-create retry — 31 October 2026

The website now uses the installed validation-only create-intent contract.
Current verified member identity, rendered account ID and server generation are
checked before mutation. An unresolved server payload is shown read-only and can
only be retried with the same command ID, payload and generation. A matching
owner receipt must be read before acknowledgment; routing follows acknowledgment
or an exact receipt/read-back proving it was already acknowledged.

The UI session is keyed by account and mode (`validation` versus `preview`), so
switching accounts or modes remounts the form, discards the previous account's
in-memory text and reruns local/server recovery. Initialization is canceled on
unmount, and action handlers check the rendered account before adopting results.
When recovery cannot continue, the page keeps any in-memory unsent text in
read-only copy fields; if it matches the saved copy, it appears only once.

A stale browser marker whose generation has advanced but whose receipt is
missing stays blocked. The UI directs the member to My projects and IDEALAB
support if the outcome remains unclear. No marker is silently discarded and no
second create is sent. Focused tests cover this state and malformed unresolved
payloads.

## Checks

Using Node 24.22.1:

- `tsc --noEmit` — passed.
- Focused ESLint on the project actions, create UI/helper and project scripts —
  passed.
- `node --test scripts/projects.test.mjs` — 24 passed, 0 failed.
- `npm run test:boundaries` — 147 passed, 0 failed.
- `scripts/project-journal-browser.mjs` — passed in Chromium for reload,
  concurrent tabs, account separation, missing journal, storage denial and
  stale-marker behavior.
- `npm run test:acceptance` — passed the design-preview storage-denial recovery,
  preserving both saved and unsent details, and the full public browser journey.
- `npm run build:acceptance` and `npm run build` — passed.
- `scripts/check-docs.mjs` — 53 documentation files and 292 local links passed.
- `git diff --check` — passed.

The server function contract was separately inspected read-only in the
validation project. This implementation run made no database query or write,
created no account or project, and did not test real signed-in server actions,
cross-client behavior or database concurrency. The checked-in validation SQL
candidates differ from stored applied statements; they are not a canonical
migration source. Shared Grow rollout remains gated.
