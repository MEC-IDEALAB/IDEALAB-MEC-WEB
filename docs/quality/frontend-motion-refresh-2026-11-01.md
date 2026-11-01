# Frontend motion and account presentation refresh

Scope: [issue #50](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/50), based on main `3ac3785`.

## Changes

- Original deterministic SVG/code-glyph hands reach toward each other behind the IDEALAB wordmark. No Polsia animation, stock image or third-party artwork was copied.
- The line progress indicator is removed. The complete first-visit composition holds for ten seconds, with a new tab marker, footer replay link and a skip action that works before hydration. Reduced-motion preference is preserved on normal visits; explicit Replay animated intro opts into only the intro movement, leaving page motion reduced.
- Public mobile destinations move below the header and above the top ticker. The header play/pause icon is removed; an accessible text motion setting remains in the footer and retains the existing saved preference.
- The theme toggle sits beside the hero heading. Hovering the image archive no longer freezes autoplay, and its active photo drifts gently between slide changes; keyboard motion controls remain available. Scroll reveals replay on re-entry.
- Sign-in and signup use the approved yellow and pink. Compact account layouts fit ordinary short viewports without hiding overflow needed for keyboard or enlarged text.

## Validation

The initial browser measurement confirmed no document scrolling for sign-in/signup at 320×568, 390×844 and 1440×900. It exposed overflow at 768×600; the short-window layout was corrected. Final browser measurements passed both routes in both themes at 320x568, 390x844, 768x600, 1366x768 and 1440x900, with document dimensions equal to the viewport. The first full acceptance run reached the auth assertions but failed because a text locator matched both hidden and visible streamed content; the assertion now selects the visible status.

Final local checks passed on Node 24.19.0: lint, TypeScript, all 148 boundary tests, optimized acceptance build, full public/isolated-preview Chromium acceptance, dependency audit (zero vulnerabilities), documentation validation and whitespace checks. The browser suite includes axe WCAG route snapshots, ten-second explicit replay under reduced motion, early skip with client chunks blocked, image autoplay under desktop hover and preserved pause preference. A separate real-browser check confirmed timeline animation on first entry and re-entry. The homepage axe check also passed in both themes. The audit caught visible/accessible label mismatches on footer controls; the final wording matches and the complete suite passed after correction. Hosted checks and deployment verification follow the PR.

Independent review found two issues: an unnecessary motion preference key change, and Skip intro depending on hydration. The saved key is preserved, and the nonce-authorized bootstrap now handles early skip clicks; browser acceptance includes blocked client chunks and focus handoff.

## Backend boundary

Live Vercel Google sign-in is not enabled by this change. The production account gate remains because shared Grow permissions and Flutter profile callers have not passed the coordinated release review. The owner wants the website and renamed IDEALAB App to share accounts, database and validation rules. The test database remains separate from that eventual shared production contract. See [account status](../account-readiness.md), [architecture](../architecture.md), and [issue #5](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/5).

## Coordinated work status

| Work | Owner | Dependency | State / evidence | Review / QA | Next action |
| --- | --- | --- | --- | --- | --- |
| Loader and motion | Main agent | Confirmed owner request | Implemented in source | Independent review and local browser checks passed | Hosted checks |
| Navigation and auth presentation | Scoped UI worker + main | Existing design tokens | Implemented; 20 auth viewport/theme measurements fit | Independent review, lint/build and browser suite passed | Hosted checks |
| Public frontend release | Main agent | Current-source local acceptance | Ready for PR | Local checks passed | Inspect current PR CI before merge, then production smoke |
| Live shared account activation | Main + owner | Grow schema/RLS and Flutter contract | Still gated | Live production auth unverified | Review coordinated backend cutover; no gate bypass |
