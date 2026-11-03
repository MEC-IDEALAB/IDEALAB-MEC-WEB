# Shared IDEALAB backend configuration — 2 November 2026

## Owner direction and target

Use the existing `grow-idealab` project (`huftzhfqnnslvnfzvbex`) as the single
Supabase Auth, PostgreSQL and Storage authority for the website and Grow mobile
application. The owner authorizes consolidation and reviewing/removing unwanted
old resources if required. Validation was paused and Grow restored; current
metadata reports Grow ACTIVE_HEALTHY. No project or stored object was deleted.

The two-active-project constraint is independent of Storage bucket count.
Reusing the existing project avoids another identity store. Retain validation
as a paused test environment; do not publish its accounts as production accounts.
The website's production auth source gate remains closed until the shared
contract and both clients pass actual acceptance.

## Verified live state

The [catalog inventory](research/shared-backend-inventory-2026-11-02.json) contains
schema and aggregate metadata only. There are seven Auth accounts, six legacy
profile rows and one stored object; no personal account values or file contents
were collected. The pre-install audit found the two May baseline migrations.
The approved first patch is now recorded as a third migration,
`20261102083307_shared_access_hardening_v1`. Historical Grow migrations must
not be replayed wholesale.

Aggregate reconciliation found two profiles with nonempty legacy registration
values, four with the legacy completion flag, and one Auth identity without a
profile. These values are not converted into verified admission or cleared by
the first patch. The revised local shared-profile candidate preserves existing
raw reservations and adds the approved ICU/whitespace uniqueness comparison;
only normalized duplicates block its preflight. A temporary exact-ICU aggregate
on Grow found zero duplicate groups across the two legacy reservations; it
returned no registration values and was rolled back. The shared profile migration was not installed at that preflight checkpoint;
its later approved installation is recorded below. See the [local SQL verification](quality/shared-profile-sql-2026-11-02.md).

Confirmed blockers:
- Authenticated `users_read_all` permits full account-row reads.
- Own-row UPDATE plus unrestricted column grants permit authority-field changes.
- Missing versioned own-profile/save/claim APIs, profile fields and provisioning
  needed by the website prevent a usable production onboarding flow.
- Storage policies refer to absent `avatars`; actual public buckets are
  `profiles`, `projects`, `events` and `inventory`.
- Existing mobile media code requests one-year avatar signed URLs and public
  project image URLs. Privacy-aware object readers must change together with policies.

Flutter's routed legacy onboarding stores its entered draft locally and sets
`profile_completed` directly. The default-off isolated account adapter offers
server save/readback/declaration, but its pinned validation target cannot be
used as the production configuration. Replace the legacy completion writer
when introducing the shared API; do not simply repoint the isolated flag.

These conclusions are from schema/permission inspection, not an attempted account
takeover, real cross-account read or uploaded-file test.

## Account and permission model

Preserve Auth user IDs and the current `student`, `lab_admin` and `super_admin`
role vocabulary. Clients cannot set roles, active/ban state, profile-completion
authority or admission state. Those values belong to trusted server operations.
Core lab-opening duty and Machine/Operations positions remain separate scoped
capabilities, not self-selected account roles.

Students read and edit only their own allowlisted profile values and their own
private records. Team-facing display data needs a bounded projection instead of
access to the private account table. Administrative access must be checked on the
server against the assigned capability, including inactive/ban state; hiding a
button is not authorization.

Both clients must use the same versioned owner-profile API. Keep verified email,
profile completeness, self-declared MEC admission and administrative role separate.
The six profile fields, explicit declaration, normalized unique registration claim,
five-conflicts-per-15-minute rule and optimistic revisions retain the existing
approved pilot contract. An email address/domain or registration prefix does not
independently prove student eligibility.

## Storage plan

Retain one project with resource-specific buckets; separate buckets per user or
per client are unnecessary. Use Auth UID/object ownership for personal media,
project authority for project media, and trusted publishing authority for lab
media. Check SELECT/INSERT/UPDATE together for upserts.

| Resource | Intended boundary | Required integration before activation |
| --- | --- | --- |
| Profile avatars | Private by default; owner UID prefix and ownership checks | Store bucket/path, issue bounded signed URLs on authorized read; replace one-year persisted URLs |
| Project media | Private until explicit approved publishing; project-scoped access | Fix project-membership authority first; replace unconditional public URLs |
| Event media | Published programme media may be public; trusted upload/edit only | Server-authorized publishing and file-type/size limits |
| Inventory media | Lab-published media; trusted upload/edit only | Review existing object reference before rename, migration or deletion |

Actual bucket visibility/policies have not yet been changed. Do not install
historical `004_storage_buckets.sql`: it creates different names and would leave
the current clients incompatible. Upload and download acceptance must include
anonymous access, other-owner access, same-owner upsert, project membership loss,
expiry and deletion/retention.

## First installed security patch

Grow now has `supabase/candidates/shared_access_hardening_2026_11_02.sql`.
It removes API-role TRUNCATE/TRIGGER/REFERENCES/MAINTAIN privileges on the 19
explicitly reviewed public tables, pins two reviewed
function search paths and removes anonymous role-helper execution. It preserves
ordinary DML, RLS policies, identities, role assignments and stored objects.

A transaction on Grow applied the candidate temporarily, asserted effective
privilege denial, preserved effective DML/RLS/policies, intended function callers,
missing-identity denial and a temporary timestamp trigger, then rolled back.
The explicit operational rollback was also run inside the trial transaction;
normalized original ACLs/function settings were asserted restored before the
final transaction rollback. The [exact trial SQL](research/shared-access-rollback-2026-11-02.sql)
and [MCP result](research/shared-access-rollback-result-2026-11-02.json) are retained.
Original catalogs were checked after rollback. The
[original ACL/configuration snapshot](research/shared-access-original-acls-2026-11-02.json)
supports a scoped restoration plan. Those artifacts describe the earlier trial.

After the owner's explicit approval, Supabase MCP installed the same scoped
changes on Grow as migration `20261102083307_shared_access_hardening_v1`, using
one atomic DO statement with local timeout settings. These settings do not by
themselves prove a wall-clock deadline for the already-running DO. The canonical file
is `Grow/supabase/migrations/20261102083307_shared_access_hardening_v1.sql`;
its text matches the stored migration statement. Post-install checks confirm
effective scoped denial, intended function callers/search paths, timestamp
trigger behavior, preserved effective DML/RLS/policies, account/role counts and
stored-object count. See [installation evidence](research/shared-access-installed-2026-11-02.json)
and the [installation report](quality/shared-access-installation-2026-11-02.md).
This does not establish full authentication acceptance.

The broader architecture/migration gate in [architecture](architecture.md#compatibility-gate)
still applies. A narrow hardening patch does not resolve the account-row exposure,
self-promotion, missing onboarding API or storage visibility mismatch.

## Delivery ledger

| Owner | Dependency | State | Evidence/review | Next action |
| --- | --- | --- | --- | --- |
| Main + Supabase MCP | Owner-approved project switch | Complete | Grow ACTIVE_HEALTHY; validation paused | Retain single production authority |
| Main + website reviewer | Live catalogs and website consumers | Audit complete | Catalog inventory; missing APIs and unsafe grants confirmed | Draft expand-only shared migration |
| Flutter reviewer | Current dirty mobile source | Audit complete | Legacy local completion writer; isolated adapter is gated/pinned | Replace default owner API/media consumers together with schema |
| Main + security reviewer | Owner-approved minimal hardening patch | Installed and verified | Exact 19-table scope, source/ledger parity, effective denial, DML/RLS preservation and timestamp probe | Continue separate profile/privacy/authority and storage migrations |
| Shared-profile implementer + main + reviewer | Full shared profile/claims schema | Installed after specific owner approval; live catalog/negative checks pass | Legacy reservations, repair/save/claim/retry, denials, duplicate preflight, observed concurrent saves/claims, committed pristine rollback and safe refusal checks pass locally | Verify real provider/onboarding and coordinated client acceptance; hosted activation stays off |
| Flutter implementer + main + reviewer | Shared account API contract | Gated shared config/gateway/auth route implemented | Exact Grow pin, invalid/conflicting mode denial, dedicated account surface; legacy operational shell remains blocked | Complete signup-isolation review and real same-account/provider acceptance before enabling |
| Main | Approved storage access matrix/client readers | Pending | Four buckets; policies mismatch current paths | Coordinate private media migration and negative tests |
| Owner + main | SMTP/provider setup and Auth dashboard settings | Confirm email enabled and independently verified; delivery pending | Public Auth settings now report autoconfirm false and Google/email enabled; connected browser requires separate login | Configure sender/SMTP and verify genuine provider journeys |
| Main + QA/reviewer | Shared migration + both clients | Not passed | Public/fixture tests do not establish production auth | Real signup/Google/profile/account-switch/cross-owner acceptance |

No keys, passwords, tokens, account field values or SMTP credentials belong in
this document or its evidence artifacts.


## Current read-only preflight and identity update

On 2 November, the normalized duplicate aggregate remains zero, with seven Auth
identities, six public profiles and one stored object. The live ICU version is
153.121. A public-key request to `/rest/v1/users?select=id&limit=0` with
`Accept-Profile: idealab_private` returned 406/PGRST106 at 12:44 UTC: the private
schema is not exposed. The OpenAPI root rejects public keys with 401 and was not
used as evidence of schema isolation. No service-role key was retrieved.

Current Auth public settings still report Google/email enabled, signup enabled
and email autoconfirm false. These configuration probes do not verify delivery
or an actual user journey. Supabase security advisors report the public
`btree_gist` extension, intentionally authenticated `get_user_role` definer
execution, and disabled leaked-password protection. These findings remain
review items; advisor output alone does not establish safe RLS.

Both clients now use the public name IDEALAB MEC; see the
[identity decision](product-identity-2026-11-02.md). This does not rename the
Supabase project reference, duplicate storage or migrate identities.

## Storage follow-up: no live changes

The 3 November read-only recheck confirms the four actual buckets
(`profiles`, `projects`, `events`, `inventory`) are all public. A bucket-level
aggregate reports one object in `inventory` and none in the other buckets; no
object keys or contents were read. `avatars`, `portfolio` and `project-banners`
are absent. All four existing Storage policies target the absent `avatars`
bucket: one public read policy and three authenticated write policies. They do
not authorize the real bucket paths. Public bucket visibility still allows
object downloads without relying on these policies, so the profiles, projects
and inventory objects cannot be treated as private. Do not delete the existing
object or describe these policies as owner-safe member upload authorization.

Current RC5 profile routes have no upload action. The legacy profile screen uses
`core/services/media_service.dart` for profiles/{uid}/avatar.jpg and persists a
one-year signed URL; the alternate unused service references absent buckets.
Project upload helpers have no found consumer. The website has no Supabase
Storage calls; event photos are local assets and project uploads remain unavailable.
Making buckets private alone would break stored public-URL consumers. The next
separate storage slice needs canonical object references, short-lived authorized
readers, server-derived owner/project checks, MIME/size restrictions and negative
cross-account/revocation/deletion tests before client uploads are enabled.

The independent storage evidence gathering read only catalogs/aggregates and
source. It did not read object keys, private URLs or user field values, upload,
delete or alter bucket policies. Existing product decisions and storage contract
still govern publication, membership, administrator authority and retention.

## Approved profile migration installed

The owner approved installation during maintenance with legacy clients offline.
`20261102130200_shared_profile_contract_v1` is now installed. Preservation,
private isolation, RPC/catalog and anonymous-denial checks pass; canonical query
matches its live ledger. See the [installation report](quality/shared-profile-installation-2026-11-02.md).
Production account activation is still blocked pending real provider/client
acceptance. The local-only developer configuration uses the shared contract;
uninstalled operational feature flags are off.
