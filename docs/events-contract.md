# Events delivery contract

WEB-006 remains the full destination: eligible free/paid participation, atomic
capacity, pending payment without a seat, Events Head cancellation/refund handling,
attendance and auditable decisions. This contract separates dependencies; a
read-only catalogue does not complete that requirement.

Current source/schema evidence is in [shared metadata](research/events-metadata-2026-10-23.md).
The isolated validation database has a guarded, initially empty Events table;
it has no clubs table. Production is read-only in this task; no shared policy
or schema rollout is authorized by this contract.

## First dependency: authenticated programme and detail

Keep Grow's live public.events columns and allowed status/type vocabulary.
The isolated table retains club_id as unused nullable UUID without inventing a
club store; its missing club FK is an explicit shared-rollout fidelity gate.
No live production event or participant rows are imported. Force RLS and revoke
all direct table grants; no writer is introduced. A managed rollback fixture
may validate reads but must never appear as a real programme event.

The isolated versioned read RPCs, get_events_v1 and get_event_v1, use the existing
verified/current active admitted Student or trusted active staff predicate.
Use private SECURITY DEFINER functions with empty search_path and explicit
authorization, plus public SECURITY INVOKER wrappers with empty search_path;
revoke PUBLIC/anon/service_role execution and grant only authenticated API paths.
The ready-member server guard and session client remain additional boundaries.

List returns at most 20 exact cards and an optional seek cursor (event_date,id).
The original v1 reader orders descending; v2 orders the upcoming filter ascending
and the other filters descending. Filters are all/upcoming/ongoing/completed/cancelled, matching
stored status rather than guessing from the current date. Nullable status/type
are preserved as unknown, never promoted to upcoming/workshop. All includes null
statuses; exact filters exclude them. Cancelled events remain accessible with
their stored state. Detail returns null for a missing ID. No creator, club,
participant, QR ticket, private profile or RSVP data is projected.

Cards expose id/title/event_type/event_date/end_date/venue/status; detail adds
description. No fee, eligibility, availability or reservation is inferred from
capacity/rsvp_count. Image handling is deferred until allowed source hosts and
privacy behavior are enforced; no arbitrary stored remote URL is loaded.
Date/time is explicitly IST. Missing optional values get factual labels.
Malformed responses fail unavailable, distinct from a successful empty list.

### Next events on Home and Lab

The isolated `get_upcoming_events_v1()` contract returns at most three records
marked `upcoming` whose start is at or after database `now()`, ordered by start
time then ID ascending. It uses the same seven-field projection and member
guard as the programme list, with no cursor, and never changes event status.
An empty result means no future records are marked upcoming; it does not assert
that the entire programme is empty. The v1 Events programme retains its original
descending order. The candidate was installed and rollback-tested only in
`idealab-mec-validation`; authenticated browser rendering and shared Grow rollout
remain unverified. See [next-events evidence](quality/next-events-2026-10-27.md).

### Upcoming programme ordering candidate

The isolated [v2 reader](../supabase/validation/20261028170906_isolated_events_order_v2.sql)
orders upcoming events ascending and other filters descending without changing
v1. Its [tests](../supabase/tests/database/mec_events_order_v2.test.sql) passed
inside the installation transaction with fixture changes rolled back. Catalog
checks afterward found zero events, v1 and v2 present, anonymous execution and
authenticated raw SELECT denied, and authenticated execution granted. The local
website uses v2 for new lists and preserves legacy cursor links on v1; new v2
cursor links are bound to the selected filter. Independent source review found
no concrete ordering or authorization defect. Authenticated browser pagination
remains unverified. The application depends on v2, which is installed only in
isolated validation; shared rollout requires its own migration and review gate.

## Pages and wireframes

`/app/events`: Lab back link → Events & workshops heading → programme/status
explanation → All/Upcoming/Ongoing/Completed/Cancelled links → bordered list
cards with date, type, title, venue and text status → next-page link. Selection
uses native links with aria-current; no hover-only navigation. Phone cards stack.
`/app/events/[id]`: Events back link → title and status → time/venue/type facts →
plain-text description → explicit registration unavailable state. Missing detail
uses not-found; unavailable service offers retry through ordinary navigation.
No disabled pretend RSVP or payment button. Reuse approved tokens, typography,
focus treatments and existing member navigation; no new sidebar.

## Remaining registration/staff dependencies

The live RSVP uniqueness constraint does not prove atomic capacity, fee/payment
or authorization. A reviewed write contract must define trusted Events Head
assignment, event fee/free source, eligibility configuration, bounded immutable
payment proof, verification/rejection, capacity changes, cancellation/refund
states and retry/audit semantics. Do not add client-writable counters or let
payment pending hold a seat. Super Admin assignment remains its separate audited
boundary. Required owner decisions must be settled before dependent writes.

23 October owner reply: IDEALAB has its own GPay/UPI account, but the approved
UPI ID/payee details are not currently available to the owner. Do not substitute
a personal account, invented QR or sample payment destination. Payment submission
remains disabled until the official details and dependent financial rules arrive.

## Delivery and acceptance ledger

| Owner | Dependency | State | Evidence / QA | Next action |
| --- | --- | --- | --- | --- |
| Main + read-only reviewer | Current Grow event schema | Metadata verified | Column, constraint, grant and policy inspection; no participant data | Implement isolated-compatible read candidate |
| Main | Programme UI/API | Implemented; installed only in isolation | Four new parser groups and SQL access/read/paging checks pass; zero retained event rows | [Current evidence](quality/events-read-2026-10-23.md); browser acceptance pending |
| Main + independent reviewer | Next-events Home/Lab read | Installed only in isolation | Guarded ascending read, bounded projection and rollback assertions passed; no event rows retained | Authenticated rendering and shared rollout remain open |
| Independent reviewer | Auth and disclosure | Reviewed with no introduced blocking defect | Current SQL/UI/parser inspected; existing shared-policy risk remains separate | Shared rollout still gated |
| Main | Real browser acceptance | Blocked by browser access | No new Events page render verified | Keyboard/responsive/list-detail-empty-error journeys after access returns |
| Main + owner | Registration/staff/payment contract | Incomplete | Current source has no safe registration API | Resolve configuration/authority and implement full WEB-006 |
