# Optional public profile and lab signals — contract proposal

Draft updated 3 November 2026. The local editor, guarded server actions, public
route, share UI and candidate SQL exist; the public-profile migration is not
installed in live Supabase and the production feature gate remains off.
User decisions: [member workspace plan](member-workspace-redesign-2026-11-02.md).

Preserve the installed owner-only thirteen-field `get_own_profile_v1` contract.
Do not append public fields to it or publish required account records. Reconcile
the actual catalog before modifying legacy `user_profiles`, children or media.
Historical `is_public=true` and `show_email/show_phone` are not authority to
publish old records under the new contract. Both clients must use the reviewed
contract together; direct child-table reads cannot bypass visibility.

| Draft API boundary | Proposed behavior |
| --- | --- |
| Own optional profile read/save | Strict field allowlist, optimistic revision, new optional content defaults public with disclosure before save; no automatic copying from required onboarding |
| Visibility/QR revocation | Atomic private/public transition and optional opaque share-ID rotation; stale updates cannot republish |
| Anonymous public read | Deliberately authored display identity, bio, safe links/processed image, interest badges and selected showcase sections only |
| Member presence read | Paginated current display names; no session IDs, purposes, arrival times, contact or registration data |
| Public presence count | Aggregate count and as-of timestamp only; no per-user records |
| Utility read/write | Wi-Fi/power state with updated-at and Unknown; writes require explicit trusted core capability, revision/idempotency and audit |

The current SQL candidate does **not** preserve owner access to existing rich
profile rows through the new APIs: it removes direct policies/permissions from
eight ecosystem tables, while the new snapshot API returns only newly authored
fields. Existing rows remain stored, but would not be available to their owner
through this contract. This conflicts with the preservation expectation and
with current Flutter direct-table reads. Do not install the candidate until a
reviewed owner-read/retention path and the Flutter cutover are designed and
tested; do not restore broad table grants as a shortcut. No extra mandatory
name: optionally confirm a shared label, with a generic fallback when missing.
Phone, email and MEC registration are excluded from public projections
regardless of legacy switches. Private and unavailable profiles return
equivalent public responses. Inactive or deleted accounts cannot keep
publishing. Profile privacy and member presence are distinct disclosures and
must be explained in the editor.

QR contains only an HTTPS share URL with an opaque ID, never a session token,
Auth UUID or private payload, and never grants attendance or machine authority.
Start with no-store public-profile/presence/media delivery and no offline PWA
caching. Media needs a visibility-aware delivery endpoint for revocation;
previously downloaded images/screenshots cannot be recalled. Reuse existing
profile tables only after their policies and Flutter direct access are audited.

Acceptance must cover anonymous/owner/other-member/core roles, legacy row
non-publication, all child-table/media paths, stale-save/visibility races,
share-ID rotation, inactive/deleted accounts, utility capability denial,
pagination and actual cross-client persistence. Prepare and independently review
the exact migration and rollback before the shared-project approval gate.

## Candidate cutover review — 3 November 2026

Independent source review found the candidate API names and website parser
shapes align, but the saved passing PostgreSQL evidence file does not include
the current public-profile candidate or its observed-concurrency stages. The
candidate scope is only authored text, tags, links, visibility and an opaque
ID; it does not implement media, presence, utility status, project showcases or
share-ID rotation. It rejects avatar publication. Its rollback is maintenance-
only after publication. These limits and the legacy owner-access conflict mean
this is a review draft, not an installation-ready cutover. No SQL was applied.

The website feature is now source-disabled regardless of environment flags in
`src/features/profile/public-profile-config.ts`; an environment variable alone
cannot enable RPC calls that are absent from the installed shared schema. The
profile editor remains a visual preview, not a functioning public profile.
Current backend evidence and the full list of acceptance gates are recorded in
[member platform readiness](quality/member-platform-readiness-2026-11-03.md).

## Live read-only catalog checkpoint

Supabase MCP metadata queries on 2 November 2026 confirmed all eight inspected
tables exist: user_profiles, user_interests, user_skills, user_education,
user_experience, user_volunteering, user_social_links and lab_sessions. Only
schema, policy and privilege metadata were queried; no member rows were read.

`user_profiles` has username/bio/department/avatar/visibility and legacy
show_email/show_phone fields, but no reviewed publication-contract version or
revision. Its current SELECT policy allows authenticated readers when is_public
is true or they own the row. The inspected child tables use owner-only SELECT
policies. Their grants include anon SELECT, but this is not anonymous row access:
RLS is enabled and the observed profile/child read policies target authenticated.
lab_sessions uses owner-only auth.uid() policies. None of these inspected tables
has FORCE RLS set. These observations do not establish complete API safety,
verified-account admission or compatible public sharing; permissioned API tests
and review remain necessary. No anonymous person lookup or public occupancy API
was added. No grants or policies were changed.
