# GitHub coordination and current-source checks — 29 October 2026

## Current status — 1 November 2026

- `MEC-IDEALAB/IDEALAB-MEC-WEB` is public; organization Project #1 remains
  private. The project has 38 items: all 20 website issues, all 12
  `MEC-IDEALAB/Grow-by-IL` issues, five linked pull requests and the completed
  Grow tracking-coordination draft. A URL comparison verified that no current
  issue from either repository is missing from the project.
- Grow issue-tracking migration is complete. The public organization fork has
  Issues enabled; its six migrated source issues are now #1–#6. The `Grow CI`
  workflow is active and passed on `main` at `5a7b75e` (run 41215843598).
  Follow-up work remains in [Grow #8](https://github.com/MEC-IDEALAB/Grow-by-IL/issues/8)
  (RC5 reconciliation), [#11](https://github.com/MEC-IDEALAB/Grow-by-IL/issues/11)
  (schema-contract gate) and [#12](https://github.com/MEC-IDEALAB/Grow-by-IL/issues/12)
  (required main checks).
- Website `main` is `3bb0893c88060cbab1b0bfdc7d39156564fa0efb`. Website CI and
  Documentation CI passed on that merge commit; Website CI, Documentation CI
  and Manual Vercel preview are active. Neither the website nor the organization
  Grow repository currently has an open pull request. GitHub reports that the
  website `main` branch has no branch-protection rule; CI checks exist, but the
  server does not require them for every merge.
- The production alias `https://idealab-mec-web.vercel.app/` returns HTTP 200
  and Vercel reports Ready, under the connected personal Hobby team. This is
  not IDEALAB-owned hosting. Production member auth remains source-disabled.
- Supabase currently reports `idealab-mec-validation` active and `grow-idealab`
  inactive. No shared Grow schema was queried or changed. The local Grow RC5
  worktree has extensive uncommitted changes and was left untouched; current
  compatibility prototypes there are not merged release evidence.
- Home/Lab loading-state, maskable-icon and loader-motion refinements were
  verified locally on 1 November 2026; they are not included in this report's
  production evidence. The device-install/APK, production email/recovery,
  shared Grow authorization, and real member/staff journeys remain unverified.

The earlier 31 October status below is retained as a dated snapshot.

## Historical status — 31 October 2026

PR #19 merged into `main` at `f0d8ab0ad3084f6cc4e8727d9e07686f9105faf0`.
Website CI, its required gate, and Documentation CI passed on the exact PR head
and merged commit. Local lint, typecheck, 128 boundary tests, dependency audit,
optimized build, Chromium acceptance, journal checks and documentation checks
also passed. The merged scope is the website/member foundation plus a PWA
manifest and icons; it does not complete production auth, shared Grow access,
operational workflows, hosted PWA installation or APK delivery.

Vercel has no project connected to the website repo; creating one returned 403,
and the local CLI has no credentials. Render lists only the unrelated LINKER
service. The public `MEC-IDEALAB/Grow-by-IL` repository exists at
`3015c4ef6c6963c265fd644689fc8dd4fc2042be`; its default branch contains three
workflow files and repository Actions permissions are enabled, but GitHub's
workflow registry and run list return zero. The connected account cannot inspect
organization-level Actions policy (403). The local Grow worktree has extensive
uncommitted user changes, including a workflow edit; those edits were preserved
and not copied or pushed.

Issue #13 and the delivery project record the remaining access and release
gates. Production auth remains source-disabled. This status supersedes the
29 October snapshot below.

## Historical GitHub recheck — 29 October 2026

The following project, source, and CI notes are a dated snapshot. Their PR
status and counts are superseded by the 31 October status above.

### GitHub organization and project

- `MEC-IDEALAB/Grow-by-IL` already exists as a public fork of `NAVANEETHVVINOD/Grow-by-IL`. Their `main` branches both resolved to `3015c4ef6c6963c265fd644689fc8dd4fc2042be` when checked.
- The private organization project [IDEALAB MEC — V1 delivery](https://github.com/orgs/MEC-IDEALAB/projects/1) contains 24 items: 17 website issues, the merged PR #14, and six Grow issues (#84, #86, #87, #88, #97 and #113).
- The organization fork's default branch contains three workflow files and repository Actions permission is enabled, but the Actions workflow API returns zero workflows and the fork has no runs. The parent Grow repository's main workflows remain active; its CI and schema checks last passed on the matching `3015c4e` commit on 19 October. The organization fork therefore does not yet provide hosted CI evidence.
- Website issues #17 and #18 remain open. The latest recovery progress and unresolved server-intent design are recorded in [#18](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/18).
- Draft PR #19 reached head `142f3c62b227fa82153279f7dd843996ef1500c1`, based on merged PR #14. Its first Documentation CI run found links from four quality reports to ignored local screenshots/manifests. Commit `142f3c6` changed those reports to describe the files as local-only artifacts. The docs check then passed at 48 files / 277 links; [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/40856580389), [Website CI and required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/40856580510) passed on that head. PR #19 remains draft without a submitted review; no merge or deployment was made.

## Local source verification

The commands below ran against the current website worktree using Node.js 24.22.1:

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test:boundaries` — 127 passed after closing the Lab/visit release-boundary gap and hard-disabling production account access.
- `npm audit --audit-level=high` — zero vulnerabilities reported.
- `npm run test:request-journal` — synthetic IndexedDB cross-tab, reload, account isolation and conditional cleanup checks passed.
- `npm run test:project-journal` — Chromium journal reload, concurrent tabs, account separation, missing journal, storage denial and stale-marker recovery passed; no real account or server mutation was tested.
- `npm run build:acceptance` — optimized Next.js build passed.
- `npm run test:acceptance` — passed against the gated source. Chromium covered the public journey at five widths in both themes, auth/recovery layouts, no-JS content, motion and reduced motion, keyboard access, gated onboarding/staff previews, student module layouts, drafts and security headers. It explicitly reports real accounts, email delivery, live auth, recovery and operational workflows as unverified.
- `node scripts/check-docs.mjs` — 48 files / 277 local links pass after the docs-path correction. `git diff --check` — passed.
- `http://127.0.0.1:3015/` — local site returned HTTP 200.

An independent security review found that Lab/visit actions originally relied on the member flag without requiring their isolated backend. The reads and writes now require the pinned validation backend plus their feature-specific flags; the preview workflow requires those flags explicitly false. Independent re-review found no remaining bypass in the scoped paths. This is source/config evidence; authenticated production behavior is still unverified.

A second security review found that the former production opt-in could create website sessions against Grow despite the known broad `public.users` grants and authority-column updates. `backendConfig()` now accepts only the pinned validation project or an explicit `.invalid` test host; production auth configuration stays unavailable even when the old opt-in is present. Independent source review verified that password, Google, signup, profile and proxy client creation all use that gate. This does not fix live Grow RLS, revoke sessions from other clients, or verify a production migration. Profile/project UI now describes shared privacy as under review. An independent copy review confirmed the draft-save and profile privacy wording no longer guesses server submission state or claims unverified privacy.

These are local public/preview checks. They do not prove live email or Google sign-in, recovery-link exchange, authenticated database permissions, actual member actions, staff authorization, or the operational event, inventory, borrowing and payment workflows.

## Hosting and release gates

- The Vercel connection returned no project for the exact website repository. An unrelated project named `web` could not be verified as connected to this repository.
- The connected Render workspace contains only the unrelated `LINKER` service for `NAVANEETHVVINOD/UNOFFICAL`; it was left untouched.
- No website deployment was created. The current GitHub Actions run list shows successful workflows on the merged `0504b41` default-branch revision, not on the current working tree.
- Querying branch protection for the private website repository returned HTTP 403 because the current GitHub plan does not provide that feature. YAML required gates do not substitute for server-enforced branch protection.
- Keep member activation and release blocked pending shared Grow schema/RLS and Flutter reconciliation, tested email delivery and recovery, complete real member/staff journeys, current-source hosted CI/review and a verified eligible hosting target.
