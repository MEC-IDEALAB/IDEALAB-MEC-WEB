# Events: current shared metadata

Read-only metadata inspection of `grow-idealab` on 23 October 2026. No event,
participant, ticket, profile or payment rows were read or changed. This is not
permission to change the shared schema or enable registration.

The live `public.events` shape matches Grow's `EventModel`, rather than the
tracked initial migration's `start_time`/`location_name` vocabulary:

| Fields | Live shape |
| --- | --- |
| id, title, event_date | Required uuid, text, timestamptz |
| description, venue, image_url | Nullable text |
| event_type | Nullable text, default workshop; check permits workshop/hackathon/talk/competition/open_lab/other |
| status | Nullable text, default upcoming; check permits upcoming/ongoing/completed/cancelled |
| end_date | Nullable timestamptz |
| capacity, rsvp_count | Nullable integer; rsvp_count defaults zero |
| club_id, created_by | Nullable UUID foreign keys to clubs/users |
| created_at | Nullable timestamptz, default now() |

`public.rsvps` contains id, nullable event_id/user_id, qr_ticket_data,
checked_in_at and created_at. The live table **does** have unique event/user
and unique QR-ticket constraints. It has no status, payment state, fee or refund
columns. The earlier schema snapshots cannot establish registration semantics.

Both tables have RLS enabled, not forced. Events SELECT currently tests
`auth.role() = 'authenticated'` in a PUBLIC policy. INSERT checks a matching
public.users role of lab_admin or super_admin. RSVP SELECT/INSERT compare
auth.uid() with user_id. Table grants are broad for anon/authenticated, including
SELECT/INSERT/UPDATE/DELETE and additional PostgreSQL privileges. RLS predicates
must be assessed separately from those grants; no API exploitation or safe
registration boundary was established by metadata alone.

The current policy is weaker than the website's ready-member gate: it does not
itself establish verified email, active profile or MEC admission. A website-only
guard cannot supply shared database authorization. A reviewed isolated read RPC
must use the current admission/staff predicate, select a bounded projection, and
exclude created_by/club membership/RSVP user IDs and ticket data. Production
rollout requires coordinated policy/grant review and both-client acceptance.

No seat availability should be calculated from rsvp_count until its maintenance
and atomic registration integrity are established. Nullable status/type must not
silently become upcoming/workshop in a security-sensitive filter. Existing
cancelled events need an explicit truthful state; no invented refund or fee data.

Independent source evidence: Grow `lib/shared/models/event_model.dart` and
`lib/features/explore/data/event_repository.dart`; current website
`src/app/app/[module]/page.tsx` renders Events as unavailable. The read-only
listing/detail slice is a dependency of WEB-006, not completion of its free/paid
registration, capacity, payment-verification or Events Head workflows.
