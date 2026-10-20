# IDEALAB MEC visual standard

The website uses one color system, defined in `src/app/design-tokens.css`. The current owner direction anchors the notebook-cross-grid treatment in original yellow and pink, with coordinated blue, purple, red and green accents; cobalt remains the action color. Keep the existing local Space Grotesk display and DM Sans body fonts, ink borders, hard shadows and asymmetric rounded panels.

## Palette and roles

| Token | Color | Role |
| --- | --- | --- |
| `--primary` | Cobalt `#3159db` | Primary actions; white labels. Hover `#2547b7`. |
| `--accent-yellow` | Yellow `#ffe029` | Original brand anchor, sign-in story and maker/notebook accents. |
| `--accent-pink` | Pink `#ff3994` | Original brand anchor, joining story and about panel. |
| `--accent-blue` | Blue `#a8c6ff` | Supporting informational/learning plates. |
| `--accent-purple` | Purple `#c4b5f5` | Project/final-CTA accents; lavender alias. |
| `--accent-red` | Red `#f39488` | Supporting warm plates; coral alias. |
| `--accent-green` | Green `#a6d9b5` | Making/selected options; mint alias. |
| `--accent-apricot` | Apricot `#f5bc98` | Supporting warm illustration details. |
| `--accent-amber` | Yellow alias | Detail accents, not a competing action color. |
| `--accent-ink` | Charcoal `#1d252c` | Text and outlines on every pastel plate in both themes. |
| `--paper` / `--surface` | Cream `#fcfbf7` / `#fffef9` | Light canvas / cards. |
| Dark `--paper` / `--surface` | Jet black `#000` / `#0b0b0b` | Dark canvas / cards, in explicit and System dark mode. |

Dark mode uses `#f4f4f1` foreground, `#bdbdbd` secondary text, `#4b4b4b` lines, `#111` section tint, `#000` outline and existing `#acc0ff` text links. These tokens apply to explicit dark and OS-driven System dark mode; existing accent plates remain. Primary button fill stays cobalt with white text; pale dark-mode link colors are not button backgrounds. Fixed pastel plates retain charcoal text. Official logos retain a light backing. Warning, success and error tokens are semantic foreground/background pairs; status also needs text/icons, never color alone. Legacy `--lime`, `--coral`, `--yellow` and `--blue` aliases map existing components into this standard.

Use the notebook cross-grid texture on the neutral canvas; retain cream/jet-black theme surfaces. Use neutral surfaces for most of a page. Assign accent colors by role, rather than adding a new color per card. Illustration SVGs consume the same tokens; new decorative assets must not introduce an independent palette.

## Doodles and motion

`src/components/doodles.tsx` contains original, local SVG artwork: a spark, an orbit around a prototype cube and a looping connection arrow. Each uses a defined viewBox, 2.5-unit rounded strokes and palette tokens. Decorations are hidden from assistive technology, cannot receive focus and do not intercept input. No external asset request or third-party artwork/license is required.

`HomeMotion` progressively enhances the homepage with native IntersectionObserver and Web Animations. Sections enter over 520 ms; the three cards stagger by 85 ms. Doodles lift gently for two 2.2-second cycles; the connection arrow draws over 850 ms. Each element runs once per mounted page. Hover/focus styles remain separate from scroll movement. No scroll hijacking, perpetual motion, layout-dimension animation or animation dependency is used.

Content is visible in server HTML and remains usable if JavaScript or animation APIs are unavailable. Reduced-motion preference disables these enhancements; changing that preference cancels active animations. Cleanup disconnects observers and releases animations when navigating away. The ordinary page flow, working focus rings and direct links remain available.

Facility reference photographs are native 200 × 200 px and render-capped to avoid upscaling; preserve their proportions and light plates. The notebook/content gate passed before the latest jet-black token adjustment; its current final rerun is pending.

## Audit refinements

Use local Press Start 2P for small accent labels and the MEC badge; retain modern Space Grotesk headings and DM Sans body text. The notebook grid uses seven-percent ink. One direct Light/Dark button replaces the menu; OS preference is only the initial fallback. The wordmark boot screen runs once per browser-tab visit, with no artificial minimum. Phone account pages omit decorative story panels and fit the tested normal viewports while remaining scrollable under zoom/keyboard constraints. See [audit](ui-audit.md) for current evidence and authentication blockers.
