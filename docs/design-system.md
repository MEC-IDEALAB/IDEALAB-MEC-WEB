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

The homepage also uses two transform-only information tickers. The upper band
sits below public navigation; it is slightly tilted black with yellow facts
divided by a double-backslash mark, without repeating the header logo. The lower
band uses the neutral section surface with small color-coded activity/facility
labels. Both use duplicated, aria-hidden visual tracks with a concise
screen-reader summary. One pause/resume control stops both tracks; hover/focus
pauses incidentally until the visitor explicitly resumes. A native checkbox
backs the Pause/Resume label, so it works even when hydration is delayed.
Reduced-motion and no-JavaScript layouts wrap the full copy into still,
readable rows. A nonce-protected inline script primes motion before paint on
repeat visits, so hydration and returning to the homepage do not switch from
the taller static layout after content is visible.
Ticker copy is curated historical/institutional context, not live status or
breaking-news content.

Content is visible in server HTML and remains usable if JavaScript or animation APIs are unavailable. Reduced-motion preference disables these enhancements; changing that preference cancels active animations. Cleanup disconnects observers and releases animations when navigating away. The ordinary page flow, working focus rings and direct links remain available.

Facility reference photographs are native 200 × 200 px and render-capped to avoid upscaling; preserve their proportions and light plates. The final notebook/content and jet-black dark-mode gates passed in local browser validation; the current request-draft browser suite also checks both themes and five widths. Hosted acceptance passed on the current application and docs-only revisions recorded in [delivery evidence](delivery-plan.md#verification-and-evidence-checklist).

The homepage activity section uses an editorial, event-poster-inspired list:
color-coded vector marks, compact retro labels, serif italic activity titles,
thin separators and short descriptions. It presents published learning themes,
not scheduled event records; current event details and registration remain in the
signed-in experience. At phone widths, descriptions move beneath each title and
the list keeps its readable order without horizontal scrolling.

The homepage hero translates the supplied poster references into a small,
tilted “Object Study” print layered over the original maker illustration. It
uses the local, official Snapmaker A350T facility photograph with a factual
caption, the existing pink backing, ink outline and hard shadow. Keep the
equipment photo at its native proportions, use `object-fit: contain`, and keep
decorative collage layers hidden from assistive technology; the enclosing maker
illustration provides one concise accessible description. Reference poster
artwork is design inspiration only and is not copied into the site.

The member workspace keeps one shared navigation component between its
protected route shell and no-data design preview. On desktop, the icon rail
collapses while retaining accessible labels, Settings sits at the bottom and
Notifications stays in the top-right action group. On phones, four primary
destinations sit in the fixed bottom bar and secondary destinations use an
accessible More popover. Keep 44 px as the minimum interactive target and use
48 px for mobile top-bar actions, apply physical safe-area insets to matching
edges, and retain focus-visible outlines when changing these controls.

## Audit refinements

Use local Press Start 2P for small accent labels and the MEC badge; retain modern Space Grotesk headings and DM Sans body text. The notebook grid uses seven-percent ink. One direct Light/Dark button replaces the menu; OS preference is only the initial fallback. The branded boot screen runs once per browser-tab visit: fast loads get a 560 ms reveal, slow loads exit as soon as the ready checks finish, and a 190 ms fade hands off to the page. Page content is inert from the first body paint until the loader exits; the 4.8-second no-hydration watchdog also releases it. Reduced motion exits immediately. Phone account pages omit decorative story panels and fit the tested normal viewports while remaining scrollable under zoom/keyboard constraints. See [audit](ui-audit.md) for current evidence and authentication blockers.

UI/UX Pro Max's query for an engineering makerspace/student platform recommended a
Hero + Features + CTA page pattern and a Brutalism style direction. Those choices
reinforce the existing editorial homepage and hard-outline treatment. Its generic
teal palette was not adopted: the owner-approved IDEALAB yellow/pink anchors,
supporting accents and cobalt action color remain the product source of truth.
