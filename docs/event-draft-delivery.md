# Event draft delivery — 3 November 2026

Status: local review candidate; not installed, pushed or deployed. The owner
confirmed that an assigned Event Head may create an event in their authorized
events scope without an assignment to a preexisting event.

| Owner | Dependency | State | Evidence / review | Next action |
| --- | --- | --- | --- | --- |
| Main agent | Scoped staff authority | Local SQL and scoped reads implemented | Mutation, read, paging and rollback tests in PostgreSQL 16 and 17 | Complete coordinated shared baseline review |
| Security reviewer | Current candidate and editor | Earlier findings corrected | Legacy RSVP publication bypass, stale-edit recovery and stale-tab marker defects addressed | Real authenticated/client E2E and exact shared installation review |
| Main agent | Draft mutation and read contracts | Local Event Studio connected behind validation gate | Optimized build, eight responsive/axe/keyboard preview checks and real browser journal tests pass | Install only after approved migration, then exercise authenticated save/edit/publish |
| Main agent | Registration/material-change decisions | RSVP pending | No registration writer is introduced | Implement approved RSVP policy and concurrency tests |

## Candidate boundaries

[Draft SQL](../supabase/validation/mec_event_drafts_candidate.sql) stores
drafts, exact actor-bound command receipts and revision history privately with
forced RLS. It checks the current active, verified and unbanned assigned Head
through the [staff authority guard](staff-authority-contract.md) before returning
a receipt. Clients cannot grant themselves an event assignment. Creation takes
an assigned scope; edit/publication derive it from the stored draft.

Publication inserts the stable event ID into the existing `public.events` shape
and records the published link, revision, audit and receipt in one transaction.
The existing programme readers remain unchanged. Drafts are not programme rows.
Published edits are denied until the post-registration material-change policy
is resolved. Past events cannot be newly published.

Paid and invite-only configuration can be saved privately, but publication is
blocked until the corresponding registration contract controls every writer.
Paid RSVP remains blocked until the official payment/refund path is approved.
There is no payment, attendee-list or registration implementation in this slice.

Installation refuses direct event/RSVP write grants and callable legacy RSVP
counter routines for API roles. This is a refusal gate, not an automatic legacy
hardening migration. Inventory other privileged writers/triggers and coordinate
the Flutter cutover before installation. Do not infer that passing the limited
preflight proves every shared writer is safe.

A fresh [read-only shared catalog check](research/event-shared-baseline-2026-11-03.md)
confirmed legacy event/RSVP write grants and a self-only RSVP insertion policy
without the planned eligibility/capacity checks. The candidate correctly refuses
that baseline. This finding did not change live permissions or project status.

## Event Studio and recovery

`/app/events/manage` lists only current assigned event scopes, with drafts and
published records in pages of 20. The private
[read candidate](../supabase/validation/mec_event_management_reads_candidate.sql)
checks active, verified, unbanned identity and current scope assignment. A separate
field projection omits creator/Auth IDs; management drafts do not change the
existing member programme contract. Equal-timestamp pagination and revoked,
inactive, banned and unverified reader denial are exercised locally.

The mobile editor uses the existing theme, original ASCII artwork, hard borders,
retro accents and skeleton loading. Times are explicitly IST and fees convert
from rupees to integer paise without floating-point multiplication. A published
event remains read-only. Publication requires explicit confirmation of the saved
revision; changed form fields must be saved first.

All actions require `requireMember`, rendered-account consistency, strict payload
validation and current database assignment. Both page and action require
`ACCOUNT_ENVIRONMENT=validation`, `ENABLE_EVENT_MANAGEMENT_VALIDATION=true` and
the existing verified local backend configuration. No setting activates this
workflow against shared/hosted production. The candidates are not installed in
validation, which is currently paused, so authenticated persistence is unverified.

The dedicated IndexedDB journal keeps one immutable command per account across
same-browser tabs. A marker detects a missing journal row. Recovered commands
are reviewed before retry; dispatch reacquires the exact durable slot, checks
account/scope session identity, and clears only confirmed matching state. Explicit
application revision/detail rejection allows safe cleanup and a copy/reload path.
Timeouts, permission loss, unknown errors and receipt-payload conflicts remain
unresolved. Keyed editor sessions suppress delayed results after unmount/account
or scope changes; a delayed-switch browser journey still needs direct verification.

This is same-browser recovery, not a server-wide creation intent contract. Losing
both browser stores or using another device can lose the command ID; review saved
drafts before creating again. Do not promise cross-device duplicate prevention.
Restricted or corrupt recovery requires reconciliation; it does not silently
delete user details or infer that a command never committed.

`/design/event-manager` is an explicitly labeled, environment-gated visual
preview. It bypasses the operational journal and cannot dispatch any save. Its
fixture account IDs are synthetic and confer no authority.

## Verification and rollback evidence

Run Node 24 with `IDEALAB_PG_BIN` pointing to existing local PostgreSQL binaries:

```powershell
node scripts/db-runtime.mjs --event-drafts
```

This owns a disposable cluster and uses only synthetic identities. The checks
cover denied anonymous/unassigned/wrong-scope/account-mismatch writes, strict
input shape, private drafts, exact retries, stale edits, revoked-head receipt
recovery, future-date publication, public-insert failure atomicity, legacy write
preflight refusal, simultaneous create retries/edits/publications, and rollback.
Sanitized summaries are in [local evidence](research/event-drafts-local-2026-11-03.json).

Additional commands: `npm run test:event-management` checks the input/output and
terminal-error contracts; `npm run test:event-journal` uses real Chromium storage
for cross-tab, reload, account isolation, conditional cleanup, stale-tab confirmed
retry, newer-command preservation, eviction and blocked storage. These tests do
not substitute for actual Supabase Auth and persistence journeys.

`npm run test:event-studio` builds current source and checks the gated visual
preview at 320/390/768/1440 px in both themes, with axe, keyboard order, overflow,
save-button clearance above mobile navigation, no backend/action dispatch and
the protected route's configuration redirect. Browser artifacts are under
`artifacts/event-manager/`; representative mobile and desktop screenshots were
inspected. The final rejected-copy-area/link correction was type/lint checked;
its terminal-rejection browser journey remains unverified.

Concurrent submissions use separate connections and verify final outcomes, but
do not observe a lock-wait barrier; deterministic event race overlap remains
unverified. The separate staff guard rehearsal observes its revocation lock waits.

The [pre-use rollback](../supabase/validation/mec_event_drafts_rollback.sql)
refuses retained drafts/history/receipts, drops only named candidate objects and
never deletes published events or staff assignments. Existing data needs an
explicit recovery plan. Review procedural dependencies before rollback because
PostgreSQL does not track every function-body reference.

The required SQL CI job runs the rehearsal, and application CI includes the new
contract, journal and visual-preview checks. CI YAML and required dependencies
were validated locally. Hosted CI has not run on these local changes. Local SQL
and previews do not verify Supabase Auth, PostgREST, Flutter compatibility or
production persistence/readiness.
