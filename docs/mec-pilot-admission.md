# MEC student pilot — shared admission contract

Owner decision, 21 October 2026: the initial student platform is restricted to
**Model Engineering College students in both the website and Grow mobile app**.
This supersedes unrestricted student admission by any verified email for the
pilot. Supabase Auth remains shared; no separate website identity is introduced.

## Registration number

The owner supplied `MDL24CS219`: `MDL` identifies Model Engineering College,
`24` denotes the 2024 admission year, `CS` denotes Computer Science, and `219`
is the student number. The owner also identified `LMDL` as the lateral-entry
prefix. These examples inform the design; they are not an official exhaustive
branch-code, year or registration-format directory.

Use one canonical MEC institution value during the pilot. There must be only
one claim per normalized MEC registration number, regardless of display-case,
spacing or institution-label aliases. Preserve display text separately. The
approved comparison ignores case and repeated/surrounding spaces. Do not allow
two claims by entering “MEC” and “Model Engineering College” as different labels.
The earlier free-text multi-institution contract remains historical/future scope;
it must not weaken the current single-institution admission boundary.

The prefix/admission year/course can help explain the entered number. They
must not grant roles, head assignments or machine authority. Current study year
remains the explicit Year 1–8 field: admission year and lateral entry do not
establish a student's present study year. Do not silently rewrite legacy rows.

## Ownership and account states

A matching number format and a successful unique claim do not prove that the
claimant owns the number. The owner chose **self-declared MEC eligibility** for
the pilot: after email verification and required onboarding, the student
declares that they currently attend MEC and that the entered number was issued
to them. The shared contract accepts one claim per normalized registration
number. It does not check claims against a college roster, ID card or official
email domain. Do not label the number or student status independently verified.

This is an explicit pilot assurance tradeoff. Uniqueness prevents a second
account from claiming an already claimed number, but cannot stop another person
from making the first claim. Keep occupied-number responses generic and enforce
the agreed repeated-save limits. Do not add a new identity number: another
self-entered number has the same first-claim ownership problem.

Keep Auth identity, email verification, Student role/active status, six-field
profile completion and the self-declared pilot admission state distinct.
Admission follows the required self-declaration and a unique claim, not
number-format feedback alone. Do not create a staff-review pending state for
this pilot. These dependent states and server enforcement are implemented and
the owner's genuine positive journey passed in the isolated validation project;
see [account delivery status](account-readiness.md). Shared production rollout,
cross-owner and concurrency acceptance remain gated.

Preserve existing identities, required profile privacy, staff roles and inactive
account states. Do not delete, ban or reclassify legacy accounts from their email
or registration prefix. Existing staff need their trusted staff access path;
student admission must not remove that path accidentally. The migration and
client rollout must define how existing student accounts supply or reconcile
their registration claim without guessing missing values.

## Shared enforcement and rollout

Enforce the chosen rule through trusted shared database/API operations as well
as the web and mobile route gates. A website-only form check cannot constrain
older Flutter clients or direct Data API calls. No client may write its own
eligibility, role, activation or completion authority fields.

The owner approved a coordinated Flutter update before activation. Update and
test the supported Flutter and Next.js clients against one versioned contract;
then apply the independently reviewed, specifically authorized shared change.
Keep web member/Google activation off until real account, privacy, admission,
concurrency and operational-denial journeys pass. No live Auth setting, schema,
account or permission has been changed by this decision record.

Required admission evidence includes both prefixes, duplicate/concurrent claims,
case/space comparisons, format validation limits, duplicate/occupied responses,
existing students, staff access, inactive accounts, Google/email convergence,
direct API bypass attempts and recovery after a failed rollout. Do not describe
this self-declared pilot as verification against college records. The native SQL
[runtime smoke check](database-validation.md) does not establish these outcomes.

Related: [onboarding requirements](onboarding-requirements.md),
[profile contract proposal](shared-profile-contract-proposal.md),
[backend readiness](backend-readiness.md).
