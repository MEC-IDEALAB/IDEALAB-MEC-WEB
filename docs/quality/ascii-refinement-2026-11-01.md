# ASCII hands refinement — 1 November 2026

Based on main `1756d98`. The owner requested a clearer, more polished ASCII animation.

## Implementation

The old repeated 120px two-row character tile is replaced by a deterministic continuous 56-row glyph field shared by two curved hand silhouettes. Gradients vary luminance across the fingers/palms; joint creases add shape. The dot field and repeated wordmarks are subdued so the hands remain readable. Phone sizing magnifies the central reaching gesture.

The hands approach and settle over ten seconds, then hold their final state. Independent review identified a snap at the original repeating cycle boundary; a single animation with a held end state removes that reset. The intro timing, early skip, replay, focus handoff and normal/explicit reduced-motion behaviour remain intact. The artwork uses original geometry and code, without an external image or animation asset.

## Verification

Node 24 lint, TypeScript, all 148 boundary tests and optimized acceptance build passed. Desktop and mobile screenshots were rendered in Chromium and visually inspected. The complete local public/preview Chromium suite passed, including loader timing/early skip/replay/reduced-motion, five viewport widths in light/dark, axe route snapshots, draft/PWA boundaries and auth presentation. Hosted release verification follows the PR. Live accounts and operational backend workflows remain outside this artwork change.
