# Signed-in local draft acceptance

Follow-up: Chrome reconnected, the exact temporary title was verified, and the
owner-approved deletion completed through the app. Empty-draft state and deletion
notice were observed. See [latest check](grow-reference-account-check-2026-10-22.md).
The pending-cleanup entries below describe the earlier snapshot.

22 October 2026, isolated validation account on loopback port 3015. This is
browser-local draft acceptance, not online request submission or lab approval.

The real signed-in request hub showed no saved draft. The composer selected
Operations support. A `javascript:` reference was rejected before review,
with inline feedback, aria-invalid and focus on the reference field. A safe
example.org reference was accepted. Only a clearly labeled temporary UI draft
was saved; no lab work was requested.

The hub then showed that draft as unsubmitted. Continue saved draft restored
Operations and the known sample fields; reload preserved title, details and
reference. All comparisons returned booleans; no account identifiers or private
field values were captured. Review fitted 320, 390, 768 and 1366px without
horizontal overflow and kept Lab marked as the parent navigation location.

Screenshot of sample-only review:
[draft capture](../../artifacts/acceptance/signed-in-request-draft.png).

The owner subsequently approved deleting only the temporary test draft titled
`TEMP UI CHECK — not a lab request`. Cleanup has **not** been performed:
after the browser tool session reset, its inventory exposes only the in-app
browser and MCP Apps; Chrome is unavailable. Do not substitute a filesystem or
session-storage bypass. Reconnect Chrome, verify the exact title still matches,
then use the app's deletion confirmation. Preserve any replaced/user draft.

A small layout defect observed during the journey placed the back link beside
the eyebrow. The member CSS now gives those direct children separate rows and
22px spacing after the back link. The production build and TypeScript passed
after this correction; its final rendered geometry remains unverified because
Chrome became unavailable.

The old server handle was absent and no listener existed on 3015. A fresh normal
production server was started. HTTP recheck shows sign-in 200 with the Google
control; unauthenticated requests redirect 307 to sign-in with private no-store.
Actual authenticated browser state after this latest restart remains unverified.

This test does not establish server persistence, head notifications, scheduling,
payment, real request history, sign-out retention or second-account isolation.
