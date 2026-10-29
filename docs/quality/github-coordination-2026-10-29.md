# GitHub coordination and current-source checks — 29 October 2026

## GitHub organization and project

- `MEC-IDEALAB/Grow-by-IL` already exists as a public fork of `NAVANEETHVVINOD/Grow-by-IL`. Their `main` branches both resolved to `3015c4ef6c6963c265fd644689fc8dd4fc2042be` when checked.
- The private organization project [IDEALAB MEC — V1 delivery](https://github.com/orgs/MEC-IDEALAB/projects/1) contains 24 items: 17 website issues, the merged PR #14, and six Grow issues (#84, #86, #87, #88, #97 and #113).
- The organization fork's default branch contains three workflow files and repository Actions permission is enabled, but the Actions workflow API returns zero workflows and the fork has no runs. The parent Grow repository's main workflows remain active; its CI and schema checks last passed on the matching `3015c4e` commit on 19 October. The organization fork therefore does not yet provide hosted CI evidence.
- Website issues #17 and #18 remain open. The latest recovery progress and unresolved server-intent design are recorded in [#18](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/18).
- Draft PR #19 was opened at head `673dff04b2d09b9949555e29c47c7679831e5409`, based on merged PR #14. Its initial Documentation CI run found links from four quality reports to ignored local screenshots/manifests. Those reports now describe the files as local-only artifacts; the local docs check passes at 48 files / 277 links. The correction is a documentation-only follow-up and will be pushed to PR #19 for a fresh hosted run.

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
