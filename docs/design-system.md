# IDEALAB MEC visual standard

The website uses one color system, defined in `src/app/design-tokens.css`. This replaces the initial yellow/pink reference treatment. Keep the existing local Space Grotesk display and DM Sans body fonts, ink borders, hard shadows and asymmetric rounded panels.

## Palette and roles

| Token | Color | Role |
| --- | --- | --- |
| `--primary` | Cobalt `#3159db` | Primary actions; white labels. Hover `#2547b7`. |
| `--accent-mint` | Mint `#b9e6ce` | Making, selected options, sign-in story and maker illustration plate. |
| `--accent-lavender` | Lavender `#d2c9f2` | Learning/project accents, joining story and final call to action. |
| `--accent-apricot` | Apricot `#f5bc98` | Lab identity panel, event accents and illustration details. |
| `--accent-amber` | Amber `#f3d788` | Small tape/sticker details; not a competing action color. |
| `--accent-ink` | Charcoal `#1d252c` | Text and outlines on every pastel plate in both themes. |
| `--paper` / `--surface` | Cream `#f7f5ed` / `#fffef9` | Light canvas / cards. |
| Dark `--paper` / `--surface` | Slate `#151c23` / `#202a33` | Dark canvas / cards. |

Dark mode uses `#eef1ed` foreground, `#b7c4c8` secondary text and `#acc0ff` text links. Primary button fill stays cobalt with white text; pale dark-mode link colors are not button backgrounds. Fixed pastel plates retain charcoal text. Official logos retain a light backing. Warning, success and error tokens are semantic foreground/background pairs; status also needs text/icons, never color alone. Legacy `--lime`, `--coral`, `--yellow` and `--blue` aliases map existing components into this standard.

Use neutral surfaces for most of a page. Assign accent colors by role, rather than adding a new color per card. Illustration SVGs consume the same tokens; new decorative assets must not introduce an independent palette.

## Doodles and motion

`src/components/doodles.tsx` contains original, local SVG artwork: a spark, an orbit around a prototype cube and a looping connection arrow. Each uses a defined viewBox, 2.5-unit rounded strokes and palette tokens. Decorations are hidden from assistive technology, cannot receive focus and do not intercept input. No external asset request or third-party artwork/license is required.

`HomeMotion` progressively enhances the homepage with native IntersectionObserver and Web Animations. Sections enter over 520 ms; the three cards stagger by 85 ms. Doodles lift gently for two 2.2-second cycles; the connection arrow draws over 850 ms. Each element runs once per mounted page. Hover/focus styles remain separate from scroll movement. No scroll hijacking, perpetual motion, layout-dimension animation or animation dependency is used.

Content is visible in server HTML and remains usable if JavaScript or animation APIs are unavailable. Reduced-motion preference disables these enhancements; changing that preference cancels active animations. Cleanup disconnects observers and releases animations when navigating away. The ordinary page flow, working focus rings and direct links remain available.
