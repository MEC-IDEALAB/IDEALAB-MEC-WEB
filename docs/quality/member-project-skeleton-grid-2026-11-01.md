# Member project-card loading skeleton — 1 November 2026

The Home and Lab project panel now reserves space for three recent project
cards while data loads. Its two-column desktop grid and single-column narrow
layout match the loaded project cards, reducing the jump when the panel resolves.
The design-only loading preview keeps these cards full width so the responsive
breakpoint represents the member page layout.

## Verification

Validated on branch `codex/member-project-skeleton-grid`, based on
`41aea14` (`Fix cold-start loading screen handoff (#36)`), with Node 24.22.1:

- `npm ci` — passed; 0 vulnerabilities reported.
- `npm run lint`, `npm run typecheck` — passed.
- `npm run test:boundaries` — 148 passed, 0 failed.
- `npm run build:acceptance` and `npm run build` — passed.
- `npm run test:acceptance` — passed the public journey, including Home/Lab
  loading previews in both themes at 320, 390, 700, 701, 768 and 1440 px; the
  assertions verify three project placeholders, the one/two-column breakpoint,
  overflow, reduced motion and no API requests from the preview.
- `git diff --check` — passed.

The light mobile and dark desktop loading-preview screenshots were visually
inspected in this isolated worktree. Generated images remain local in
`artifacts/acceptance/` and are not source dependencies.

These checks use the data-free design preview with member auth disabled. They do
not replace real signed-in Home/Lab acceptance; [issue #25](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/25)
remains open for that gated verification.
