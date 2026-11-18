# V1 execution checkpoint — 4 November 2026

The active worktree is based on PR #67 commit `755b0d02f29c0b0bd34bdd42ce15e0be0b62a779` and contains uncommitted changes. Recovery branch `backup/idealab-v1-pre-reconcile-20261104-current` preserves snapshot `4c8b6367e9bea7ac2420c2942d4211532b7a291d`. This record does not establish production readiness.

## Passed local checks

- `npm run build` and `npm run build:acceptance`.
- `npm run typecheck`, `npm run lint` and 187 boundary tests.
- `npm audit --audit-level=high`: zero vulnerabilities reported.
- `npm run test:acceptance`: public journey, responsive light/dark layouts, auth/recovery presentation, WCAG snapshots, loader/motion, skeletons, request drafts and PWA offline shell.
- `npm run test:member-space`: 54 visual layouts (touch, landscape and 200% text), 12 axe snapshots, carousel/motion controls, navigation and no-JavaScript content. No live accounts were used.
- Focused disposable PostgreSQL 16.1 staff assignment/capacity/approval/revocation/rollback suite: `artifacts/database-runtime/runtime-1793797213056-19d61bd1.json`.
- Disposable event draft publication/read/concurrency/rollback suite: `artifacts/database-runtime/runtime-1793796860829-c4109916.json`.

The public acceptance build deliberately uses an unreachable configuration fixture and disables member operations. It does not verify real signup, delivery of email, Google authentication, password recovery exchange, private persistence or operational backend actions. Browser inspection additionally confirmed sign-in and signup fit 390×844 without document scroll. Development-browser console errors originated in Next.js Dev Tools inline styles blocked by CSP; the production acceptance suite passed.

## Review findings and blocked checks

Independent security review found no ordinary-member raw API access to the new staff tables. Two medium-priority governance gaps remain: Student Ambassador appointment/revocation and Lab-core permission changes have no candidate-level history. Integrate an audited trusted roster process with actor, timestamp and reason before activation. Named maintainer and backup are outstanding.

Lab closure now sets active session checkout timestamps in the same transaction and shares a consistent lock order with manual checkout. Its focused runtime checks and the revised staff/full-profile compatibility path require PostgreSQL 17. This host currently has only PostgreSQL 16.1 and no Docker. A version-preflight rejection is a blocked check, not an application test pass. Earlier PG17.6 project-admission evidence does not establish compatibility for the revised staff/Lab candidates.

The shared May migration source does not reconstruct all 19 inspected live tables. Exact schema/grant reconciliation and a faithful disposable forward/rollback/restore rehearsal remain required. No shared Supabase SQL was applied during this execution.

A subsequent read-only metadata pass captured 203 public/private function signatures, ACLs and definition fingerprints in [the function inventory](../research/shared-function-fingerprints-2026-11-04.json); extension functions are included. No function bodies or member rows were returned. Grow migration 003 defines the eight additional profile tables, but deployment provenance and exact definitions still need reconciliation.

## Delivery state

Issue #1, progress comments on #3–#13 and #46, and Project #1 fields contain current evidence and next actions. The project retains Delivery table, Delivery board and Release roadmap views. Start: 4 November; scope review: 25 November; pilot target: 16 December 2026.

PR #67 remains draft. Its hosted green checks and READY preview apply to the committed `755b0d02` revision only. The independent release audit recommends no merge or deployment while shared identity, roster, migration and real-client gates remain unverified. Production Vercel has not been updated with this worktree.

## PG17 execution follow-up

A portable official EDB PostgreSQL 17.11 runtime is now available; see [provenance](pg17-runtime-provenance-2026-11-04.md). `--staff-scope-shared` passed against Grow's synthetic profile fixture and rolled back cleanly (`runtime-1793802240924-0349fdcc.json`). The first PG17 `--lab-opening` run failed at `lab-opening-rehearsal` (`runtime-1793802241342-2a19d106.json`); cleanup succeeded and diagnosis is in progress. The earlier missing-runtime blocker is resolved, but this failed Lab run is not acceptance. Shared live-schema and real-client gates remain open.
## Latest PG17 result and next action

Focused Lab validation now passes on PostgreSQL17.11 (`runtime-1793804415897-82e5e60d.json`): exact close timestamps, idempotent retries, check-in/close, concurrent opening and both checkout/closure orderings. Two test-only defects were corrected: audit assertions execute after resetting the member role, and synthetic command FK rows are removed before their synthetic sessions. The earlier PG17 failure is superseded by this passing artifact; no member audit-table access was granted.

The [profile schema comparison](../research/profile-ecosystem-parity-2026-11-04.md) completed on PG17.11 but confirms drift, including seven broader SELECT predicates in migration003. Keep owner-only policies and reconcile the deployed shape before migration rehearsal. Next: complete missing catalog attributes and the pre-hardening/current-state mapping, resolve trusted roster audit, then real Auth/API/Flutter checks. Issue #1 and Project #1 record this checkpoint; PR #67 remains draft and production unchanged.
Recovery checkpoint after PG17 checks: branch `backup/idealab-v1-pg17-checkpoint-20261104`, commit `81f4ebaa63c97f64e7219f30abd4d65ad077a013`, preserves 152 changed project files relative to HEAD. Initial backup remains intact. Alternate-index verification left the active branch at 755b0d02 and the main index unstaged; portable tools, generated output, runtime artifacts and Supabase temp files are excluded. This is a local recovery commit, not a PR push or release.