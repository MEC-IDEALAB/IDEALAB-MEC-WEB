# Project resource estimates and charges

**Status: workflow confirmed; the initial filament rate is approved.** This
document records owner direction from 3 November 2026. It is not an implemented
billing system or authorization to change the shared Supabase project.

## Owner direction

Project work may incur several kinds of cost:

- Machine use, such as 3D printing, laser or CNC work.
- Design work when a member needs help preparing a design.
- Service/labour time for the person carrying out the work.
- Consumables, such as filament measured by weight.

The owner approved **₹3 per gram as the initial filament catalog rate**.
Students do not upload design files because available storage is limited. For a
machine request, the assigned head enters expected filament and service details;
the server calculates an estimate from approved scoped rates and sends it to the
student. The student must explicitly approve before work begins. After work,
the head records actual use and the final bill, confirms payment, and closes the
request into the member's history. Assigned heads manage rates only within
their trusted scope; every change is versioned and audited.

₹3/g is the only specific rate approved so far. Machine, design and time-based
service rates must be added by an authorized scoped head before those charges
can be quoted.

## Required distinctions

Keep these states and records separate:

1. **Request** — requested service and member-provided assumptions.
2. **Estimate** — provisional itemized calculation with the exact approved rate
   version, estimated quantities, units, assumptions, currency, calculation
   time and expiry/revision policy once approved.
3. **Accepted quote** — the head sends the itemized estimate and the student
   explicitly approves it. No build/production task begins before that approval.
4. **Actual usage** — quantities, machine/service time and materials verified by
   the authorized scoped head, with actor and timestamp.
5. **Final charge/report** — calculated server-side from verified actual usage
   and the applicable rate version. Never infer it from an estimate or request.
6. **Payment confirmation** — the student pays using IDEALAB’s official UPI QR
   and enters the transaction ID as the only evidence. The assigned head
   verifies the payment against the final bill before closing the request.

The owner previously chose to keep anonymized lab history after permanent
account deletion. Apply that decision to this workflow; confirm the exact
quote, bill and payment fields and retention period that can remain in the
anonymized archive.

The interface must label a provisional estimate clearly, show its line items
and assumptions, and avoid representing it as a guaranteed price or a paid
invoice. No numeric estimate may be shown until an approved rate exists for
every included line. No unpriced line may be silently omitted from a quote.

## Confirmed request-to-close flow

With `ENABLE_DESIGN_PREVIEW=true`, open `/design/requests` for the student
wireframe and `/design/workspace` for the Machine / Room Head wireframe. The
student sequence covers estimate review, consent to an increased bill, and
transaction ID submission. The staff sequence covers preparation, student
approval, actual use and payment verification. These previews show the flow
without connecting to accounts or accepting payments.

`submitted → assigned head review → estimate sent → member approval →
production → actual usage recorded → final bill → head confirms payment →
closed/history`

- The request notifies the assigned head. The notification mechanism still
  needs implementation; it must be emitted only after the request transaction
  commits and must tolerate retries without duplicate user-visible notices.
- The assigned head enters expected grams and service quantities; the server
  resolves active rate versions and calculates the itemized estimate.
- The head sends that estimate to the requester. Approval is bound to the exact
  immutable estimate revision and total. Any quote revision needs fresh member
  approval. No build starts before approval.
- If the student declines, the request stays open for head review. The head
  can send a revised estimate or reject the request.
- After the work, the head records actual quantities and time separately. The
  server calculates the final bill from those actuals and snapshotted rates.
- If the final bill exceeds the accepted estimate, the student explicitly
  submits an initially unchecked approval checkbox before payment. Store that
  consent against the exact bill revision and amount.
- The student pays using the official QR and enters the transaction ID. The
  head verifies receipt against that bill and closes it into member history.

The state transitions need atomic request locking, expected-revision checks and
idempotent command receipts. A concurrent quote edit must not change the quote
between the member viewing and accepting it. Rate, estimate, actual-use, bill
and payment events are append-only/audited. Only the requester and assigned
scoped head may read the private request and bill; project membership alone
does not grant that access.

## Proposed calculation model

Use a server-side catalog of versioned rates and explicit units, including the
approved INR-per-gram filament rate plus scoped machine, time and design rates
as approved by assigned heads. A quote is the sum of
its individually rounded, currency-safe line amounts. Store quantity and unit
explicitly and avoid binary floating-point arithmetic. Snapshot each rate and
the calculation inputs into the estimate so later catalog changes cannot
silently rewrite a prior estimate. Treat re-estimation as a new revision with
an audit trail.

Do not store a single mutable `price` on a machine or project and then use it to
recalculate historical estimates. Do not let a browser provide the rate,
approved total, actual quantity, approver identity or payment state. The server
must resolve an active approved rate, validate project membership/request
ownership, perform calculation, and write an idempotent result. Direct client
writes to rate, usage, final-charge and payment tables are not acceptable.

## File and material handling

The first release does not accept design-file uploads. An assigned head enters
the expected filament quantity and service details for the estimate, then
records actual quantity after production. Expected quantity is not verified
consumption. Actual use must be recorded by the authorized head; a future
machine integration would require separate validation and approval.

## Security and audit requirements

- Only approved, active rates are available to quote calculations.
- Rate versions are immutable after use; corrections create a new audited
  version with effective dates and an authorized actor/reason.
- Assigned heads manage rates only for their authorized machine/service scope.
  Each change creates a new version and an audit entry. Trusted head assignment
  and the guarded rate-publication RPC still need to be designed and verified.
- A member can read only estimates/quotes and requests they are authorized to
  see. Project members must not gain access to private account details.
- Project resource entries require project membership and scoped head
  authorization; a project creator does not automatically become a Machine or
  Operations Head.
- Record actor, action, entity, timestamp, old/new rate version, usage evidence
  reference, and reason for corrections or overrides.
- Reports expose only verified actuals and explicitly shareable fields. A
  project report cannot expose a member's registration number, email, phone or
  private profile.
- Student transaction ID submission is pending verification. Only the assigned
  head can confirm payment. Keep the ID private and tied to the exact bill.

## Decisions required before final release

1. What machine, design and time-based service rates, units and scopes should
   assigned heads configure beyond the confirmed ₹3/gram filament rate?
2. Confirm the official QR asset and refund/correction rules.
3. How should a correction to a closed usage/payment record be authorized and
   audited by the trusted administration path?
4. What notification channel should alert the assigned head and student?
5. Which quote, bill and payment fields and retention period belong in the
   already-approved anonymized lab-history archive?

Until these are resolved, keep only the approved filament rate available in the
candidate catalog; do not invent missing rates or enable unapproved final
charge/payment behavior. No file uploads or fabricated usage. Track the implementation in [project issue
#8](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/8) and [quotation issue
#12](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/12).
