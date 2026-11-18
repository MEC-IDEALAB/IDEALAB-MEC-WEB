# 06 — Database and Migration Audit

**Audit Date:** 2026-11-06\\
**Database:** Supabase PostgreSQL `17.6.1.166` (Project `huftzhfqnnslvnfzvbex` — Mumbai)\\
**Validation Database:** Supabase PostgreSQL `17.11` (Project `gvvqlfachzbufstzoiwi`)\\
**Inspection Method:** `grow-prod` MCP read-only queries\\
**Updated:** 2026-11-06 (post-owner-review corrections)

> [!IMPORTANT]
> **Corrections applied after owner review.** The previous version of this document contained three errors: (1) the FK list in §4.1 differed from the list in the evidence register — both lists are retained below with explicit uncertainty flags; (2) §6 proposed replaying legacy migrations 003–008 to fill ledger gaps — that proposal has been removed because the ecosystem parity comparison shows replaying source-003 would broaden SELECT disclosure vs current live policies; (3) several policy findings were stated as confirmed exploits without runtime test evidence.

---

## 1. Migration Ledger Reconciliation

Inspection of `supabase_migrations.schema_migrations` on `huftzhfqnnslvnfzvbex` via `grow-prod:list_migrations` returned **exactly four** recorded migrations:

| Version | Name | Provenance |
|---|---|---|
| `20260503073726` | `create_initial_schema` | `Grow/supabase/migrations/001_initial_schema.sql` |
| `20260503073744` | `add_rls_policies` | `Grow/supabase/migrations/002_rls_security_fixes.sql` |
| `20261102083307` | `shared_access_hardening_v1` | Verified: revoked TRUNCATE, pinned search paths on role helper |
| `20261102130200` | `shared_profile_contract_v1` | Verified: added 6 MEC fields, normalized claim collation, revoked broad DML on `public.users` |

### 1.1 Grow Source Migrations Not in the Ledger

Several historical Grow migration files in `Grow/supabase/migrations/` have no corresponding ledger entry in `huftzhfqnnslvnfzvbex`:

- `003_profile_ecosystem.sql`
- `004_storage_buckets.sql`
- `005_booking_overlap_constraint.sql`
- `006_profile_rls_hardening.sql`
- `008_profile_ecosystem_patch.sql`
- `rc43_backend_authority.sql`

**What this establishes:** The tables associated with these migrations exist in the live schema, but no matching ledger entries record their execution history.

**What this does not establish:** How these tables were installed. Their historical migration provenance remains unresolved (they may have been applied via early dashboard executions, direct SQL console, or alternative tooling). The presence of tables without ledger records does not prove schema drift or corruption; tables may be functional, but their deployment provenance cannot be inferred from the ledger alone.

> [!CAUTION]
> **Do not replay these source migrations to fill the ledger gap.** The ecosystem parity comparison (`docs/research/profile-ecosystem-parity-2026-11-04.md:22`) confirmed that source-003 uses `SELECT predicate = true` for 7 portfolio tables, while the captured live catalog uses `user_id = auth.uid()`. Replaying source-003 would broaden SELECT disclosure relative to the current live policies. The correct path is continued reconciliation via disposable rehearsal clusters, not source replay.

### 1.2 Website Operational Candidates — Not Yet Installed

The following candidates exist in `supabase/validation/` and are **not** in the shared production ledger. This is expected — they are unfinished features awaiting review and rehearsal, not evidence of database desynchronization:

| Candidate | Description | Status |
|---|---|---|
| `mec_staff_scope_candidate.sql` | Machine Head assignments, Student Ambassador authority | Authored, tested (validation), not in production |
| `mec_lab_opening_candidate.sql` | Lab opening/closure, auto-checkout | Authored, tested (validation), not in production |
| `mec_own_visit_writes_candidate.sql` | Member check-in/checkout RPCs | Authored, tested (validation), not in production |
| `mec_lab_presence_candidate.sql` | Live presence RPC | Authored, selects member names for signed-in members (see §3.3) |
| `mec_work_request_intake_candidate.sql` | Work request intake | Authored, validation-only |
| `mec_projects_candidate.sql` | Project creation, join codes | Authored, tested (validation) |
| `mec_event_drafts_candidate.sql` | Event Head draft editor | Authored, tested (validation) |
| `mec_recovery_consumption_candidate.sql` | Password recovery token consumption | Installed in validation as `20261105172121_mec_recovery_consumption_v1_validation`; production installation requires separate acceptance |

---

## 2. Table Schema & Column Inventory (Shared Project)

**19 tables in `public`, 3 tables in `idealab_private`** — inspected via `grow-prod:list_tables`:

```
public.users                   — id, name, email, phone, college_roll, role, club_id, xp, level,
                                  reputation_score, qr_code_data, fcm_token, created_at, updated_at,
                                  profile_completed, avatar_url, is_active, ban_reason, banned_at,
                                  institution, department, study_year, profile_contract_version, profile_revision
public.clubs                   — id, name, description, color, created_at
public.tools                   — id, name, category, description, image_url, sop_url, total_qty,
                                  available_qty, health_status, last_maintained, qr_code_data, created_at
public.tool_bookings           — id, tool_id, user_id, project_id, slot_start, slot_end, status,
                                  approved_by, approved_at, checkout_at, returned_at, return_reminder_sent,
                                  notes, created_at
public.lab_sessions            — id, user_id, checkin_time, checkout_time, purpose, created_at
public.events                  — id, title, description, event_type, club_id, event_date, end_date,
                                  venue, capacity, rsvp_count, image_url, created_by, status, created_at
public.rsvps                   — id, event_id, user_id, qr_ticket_data, checked_in_at, created_at
public.projects                — id, title, description, club_id, status, created_by, visibility,
                                  showcase_url, created_at, updated_at
public.project_members         — id, project_id, user_id, role, joined_at
public.notifications           — id, user_id, type, title, message, related_id, is_read, created_at
public.knowledge_articles      — id, title, content, tags, author_id, upvotes, is_approved, created_at
public.user_profiles           — id, user_id, username, bio, user_type, department, avatar_url,
                                  is_public, show_email, show_phone, show_stats, created_at, updated_at
public.user_experience         — id, user_id, title, organization, description, start_date, end_date,
                                  is_current, sort_order, created_at, updated_at
public.user_education          — id, user_id, institution, degree, field_of_study, start_year,
                                  end_year, is_current, sort_order, created_at, updated_at
public.user_portfolio_projects — id, user_id, title, description, project_url, source_url, banner_url,
                                  technologies, is_featured, sort_order, created_at, updated_at
public.user_volunteering       — id, user_id, role, organization, description, start_date, end_date,
                                  is_current, sort_order, created_at, updated_at
public.user_social_links       — id, user_id, platform, url, label, sort_order, created_at
public.user_skills             — id, user_id, name, level, sort_order, created_at
public.user_interests          — id, user_id, name, created_at

idealab_private.mec_registration_claims_v1          — claim_id, user_id, display_value, normalized_value,
                                                       claim_state, attested_at, attestation_version, created_at
idealab_private.mec_registration_collision_state_v1 — user_id, collision_times
idealab_private.profile_contract_baseline_v1        — singleton, snapshot
```

---

## 3. Row-Level Security (RLS) & Authorization Assessment

### 3.1 Hardened `public.users` (Post Migration `20261102130200`)

- **RLS Enabled & Forced** on `public.users`
- **SELECT Policy:** `users_verified_owner_read_v1` — restricts to own row with verified email
- **Column allowlist** restricts SELECT to 12 non-secret fields
- **DML revoked** from `authenticated` — all profile writes go through `save_own_profile_v1`
- **Assessment:** Well-designed. Prevents IDOR and unauthorized profile tampering for the reviewed RPC paths.

### 3.2 Legacy Policies on Other `public` Tables

> [!IMPORTANT]
> The following observations are based on **source analysis and schema structure only**. They identify potential authorization gaps in the legacy RLS policies from May 2026, but none has been confirmed as exploitable without a runtime test with actual payloads, specific RLS policy text, and verified output. Each item below is a concern to investigate, not a confirmed vulnerability.

The tables from Grow migrations 003–006 retain policies from their original deployment. Areas requiring review:

- **`public.tool_bookings`:** Policy structure permits authenticated inserts and own-row updates. Whether machine scope checks, operator approval, or maintenance conflict prevention exist in policy bodies requires direct policy inspection.
- **`public.events`:** Events insert policy may rely on `get_user_role()` returning `'lab_admin'` without Event Head scope verification. Requires direct policy body inspection.
- **`public.rsvps`:** Legacy `rsvps` table has no confirmed atomic capacity enforcement. Whether `events.rsvp_count` is maintained correctly under concurrent inserts requires a runtime concurrency test.
- **`public.projects`:** Insert policy structure requires direct inspection to determine whether rate-limiting or uniqueness constraints are in place.

**Required for each:** Sanitized `pg_policies` output for the specific table, a reproducible test scenario with actual PostgREST requests, and confirmed output showing the alleged gap.

### 3.3 Candidate Presence Query — Member Name Display Policy

`supabase/validation/mec_lab_presence_candidate.sql` selects `u.name` from `public.users`. This candidate is not installed in production. The established project decision approves signed-in members seeing member names (with public visitors seeing counts only), subject to final MEC privacy policy approval and notice. This is an approved decision with an approval dependency, not an issue requiring correction or a confirmed policy violation.

---

## 4. Live Supabase Advisor Telemetry

> [!WARNING]
> **Fresh FK evidence captured on 18 November.** The read-only performance advisor reported eight unindexed foreign keys at `2026-11-18T09:35:52.100Z`. A stricter `pg_catalog` check at `2026-11-18T09:36:21.175729Z` found nine foreign keys without a valid, non-partial index covering the complete referencing key. The additional row is `tool_bookings(tool_id)`: its existing B-tree and GiST indexes are status-filtered partial indexes. The precise behavior of the project's deployed advisor version has not been independently verified, so the eight-versus-nine discrepancy is recorded without claiming a confirmed linter defect. See [fresh telemetry](../../research/shared-fk-telemetry-2026-11-18.json) and the [18 November candidate rehearsal record](../../quality/phase1-database-validation-2026-11-18.md). No shared DDL was executed.

### 4.1 Advisor Findings and Strict Catalog Coverage

The advisor reported these eight findings. Catalog inspection resolves the advisor's attribute numbers to the following columns:

1. `public.events` → `events_club_id_fkey` (`club_id`)
2. `public.events` → `events_created_by_fkey` (`created_by`)
3. `public.knowledge_articles` → `knowledge_articles_author_id_fkey` (`author_id`)
4. `public.project_members` → `project_members_user_id_fkey` (`user_id`)
5. `public.projects` → `projects_club_id_fkey` (`club_id`)
6. `public.tool_bookings` → `fk_bookings_project` (`project_id`)
7. `public.tool_bookings` → `tool_bookings_approved_by_fkey` (`approved_by`)
8. `public.users` → `fk_users_club` (`club_id`)

The separate strict catalog query found one additional uncovered FK:

9. `public.tool_bookings` → `tool_bookings_tool_id_fkey` (`tool_id`)

`tool_bookings(tool_id)` has `idx_tool_bookings_tool_slot` (B-tree on `(tool_id, slot_start, slot_end)`) and `no_overlapping_tool_bookings` (GiST using `tool_id` and a time range); both are partial and filter by booking status. The strict check excludes partial indexes because they do not cover every referencing row. The advisor's exact deployed implementation/version has not been verified, so the count difference is an observed telemetry discrepancy, not a confirmed advisor bug.

The dedicated [shared candidate](../../../supabase/validation/shared_fk_indexes_v1_candidate.sql) and [rollback](../../../supabase/validation/shared_fk_indexes_v1_rollback.sql) include all nine strict-coverage gaps and passed a disposable PostgreSQL 17.6 synthetic rehearsal. They remain uninstalled. The fresh [migration ledger output](../../research/shared-fk-telemetry-2026-11-18.json) contains four entries; this does not establish full schema provenance or migration parity. Recheck the live target before any separately approved installation. The validation-only October index file remains inapplicable.

### 4.2 Auth RLS Initialization Plan (59 Warnings)

59 RLS policies evaluate `auth.uid()` as a volatile function call rather than a scalar subquery. This causes re-evaluation per row:

```sql
-- Current (re-evaluates per row):
USING (user_id = auth.uid())

-- Preferred (evaluates once per statement):
USING (user_id = (SELECT auth.uid()))
```

This is a performance advisory, not a security vulnerability. No data is disclosed incorrectly; queries are slower than necessary under large table scans.

### 4.3 Configuration Advisories

- `btree_gist` extension is installed in the `public` schema rather than `extensions`
- Leaked password protection (HaveIBeenPwned integration) is disabled on the Supabase Auth project

---

## 5. Concurrency & Locking Invariants

| Workflow | Mechanism | Status |
|---|---|---|
| **MEC Registration Claim** | Unique index on `normalized_value` in `mec_registration_claims_v1` | Verified in PG17 tests |
| **Lab Check-In vs Closure** | SHARE / UPDATE lock serialization (candidate) | Verified in candidate tests — not in production |
| **Dual Machine Head Limit** | Row lock + count in `guard_staff_scope_assignment_limit_v1` (candidate) | Verified in candidate tests — not in production |
| **Event Capacity** | No atomic capacity guard in legacy `rsvps` table | Concern (requires runtime test to confirm exploitability) |
| **Consumable Allocation** | No inventory transaction tables in shared schema | Not implemented |

---

## 6. Database Remediation Prerequisites & Proposed Actions

> [!IMPORTANT]
> These are **proposed** actions, not approved for execution. Each item requires the stated prerequisite before any work begins.

| Item | Prerequisite | Proposed Action |
|---|---|---|
| **Index unindexed FKs** | Independent SQL/security review, full-schema disposable rehearsal, and separate owner/maintenance approval | Review the existing nine-index candidate and reconcile live schema provenance; install only through a separately approved operation |
| **Wrap `auth.uid()` in subqueries** | Obtain full RLS policy source for affected tables; test in disposable cluster | Batch update affected policies in a reviewed migration |
| **Legacy RLS policy review** | Direct `pg_policies` inspection for each legacy table | Determine which policies need replacement before candidates are installed |
| **Operational candidates** | Owner sign-off + disposable rehearsal for each candidate | Apply individually with rollback scripts ready |
| **Presence candidate approval** | MEC privacy notice approval | Verify signed-in member name visibility against approved MEC privacy policy before candidate review |
| **Extension schema** | Verify `btree_gist` usage before moving | Relocate to `extensions` schema in a reviewed migration |
| **Leaked password protection** | Supabase Auth project settings review | Enable via dashboard — no SQL required |
