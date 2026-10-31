# IDEALAB MEC visual standard

The website uses one color system, defined in `src/app/design-tokens.css`. The current owner direction anchors the notebook-cross-grid treatment in original yellow and pink, with coordinated blue, purple, red and green accents; cobalt remains the action color. Use local Space Grotesk for most headings, Bricolage Grotesque at weight 800 for the “From a sketch to something you can hold” display heading, and DM Sans for body text. Keep ink borders, hard shadows and asymmetric rounded panels.

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

The modern brutalist homepage layer adds a small graphic-print palette:
`--vector-black` (`#050505`) and `--vector-paper` (`#f4f2ec`) ground
`--signal-lime` (`#d6ff00`), `--signal-magenta` (`#ff42c6`) and
`--signal-blue` (`#4c5fff`). Reserve these saturated colors for decorative
studies, expressive poster-headline plates, the IDEA/LAB wordmark and
intentional activity marks. They do not replace the
cobalt primary-action color or the yellow/pink IDEALAB identity. Keep text on
signal plates black or white only where contrast is clear; do not use the
signal colors as long-form text colors. The hero's original local SVG combines
a warped grid, orbit lines, checker sphere, sunburst, pixel blocks and barcode
in one decorative study. Keep it hidden from assistive technology, self-hosted,
and static under reduced motion. Asymmetrical cuts and hard ink shadows belong
to the poster panels and cards; preserve the existing readable content order,
focus rings and responsive layouts.

In dark mode, retain the jet-black canvas and near-black card surfaces while
using the theme's light ink token for the hero print-frame and card boundaries.
This keeps the black artwork grounded and the card edges legible without
changing the dark surfaces or the bright signal accents.

## Doodles and motion

`src/components/doodles.tsx` contains original, local SVG artwork: a spark, an orbit around a prototype cube and a looping connection arrow. Each uses a defined viewBox, 2.5-unit rounded strokes and palette tokens. Decorations are hidden from assistive technology, cannot receive focus and do not intercept input. No external asset request or third-party artwork/license is required.

`HomeMotion` progressively enhances the homepage with native IntersectionObserver and Web Animations. Sections enter over 650 ms; the three cards stagger by 110 ms. Timeline steps move in from the side and their numbered markers settle into place. Doodles lift gently for two 2.2-second cycles; the connection arrow draws over 850 ms. Each element runs once per mounted page. Hover/focus styles remain separate from scroll movement. Section and doodle reveals are finite. The separately controlled tickers and event carousel provide the requested automatic motion; no scroll hijacking or animation dependency is used.

The homepage uses a transform-only information ticker below public
navigation and a slower gray quote ribbon before the footer. The band tilts down on the left, uses black with yellow facts
divided by a double-backslash mark, and does not repeat the header logo. Its
duplicated visual track is hidden from assistive technology and has a concise
screen-reader summary. Hover or keyboard focus pauses motion; there is no
visible pause control. Dark mode switches the band to lime with black text.
Reduced-motion and no-JavaScript layouts keep the copy still and readable. A
nonce-protected inline script primes motion before paint on repeat visits.
Ticker copy is curated institutional context, not live status or breaking news.

Content is visible in server HTML and remains usable if JavaScript or animation APIs are unavailable. Reduced-motion preference disables these enhancements; changing that preference cancels active animations. Cleanup disconnects observers and releases animations when navigating away. The ordinary page flow, working focus rings and direct links remain available.

Facility reference photographs are native 200 × 200 px and render-capped to avoid upscaling; preserve their proportions and light plates. The final notebook/content and jet-black dark-mode gates passed in local browser validation; the current request-draft browser suite also checks both themes and five widths. Hosted acceptance passed on the current application and docs-only revisions recorded in [delivery evidence](delivery-plan.md#verification-and-evidence-checklist).

The homepage activity section uses an editorial, event-poster-inspired list:
color-coded vector marks, compact retro labels, serif italic activity titles,
thin separators and short descriptions. It presents published learning themes,
not scheduled event records; current event details and registration remain in the
signed-in experience. At phone widths, descriptions move beneath each title and
the list keeps its readable order without horizontal scrolling.

The “Less ‘what if’. More ‘let’s try’.” section uses a gray grid print with
overprinted Space Grotesk, large lime and magenta step-cut fields, and small
retro annotations. Its companion card is a rightward auto-advancing carousel
of four past archive entries. The first two image sources and all published
titles/dates stay fixed. Slides three and four retain the Technical Training
and TinyML labels/dates while using alternate archive workshop photos for
clearer presentation; their alt text identifies the photos as alternate
archive imagery. Each slide has a distinct color accent and rectangular pixel
mask. Treat these as selected historical moments, not a live calendar or
registration offer. The separate IDEA Lab lockup sets IDEA on a stepped pink
plate and LAB on a stepped blue plate over a gray notebook grid, beside the
semantic heading “A lab for the way you think.” Use locally stored font files,
including Bricolage Grotesque and Press Start 2P, under their retained OFL licenses.
Responsive type scales preserve these poster layouts at phone widths and in
both themes.

The homepage hero translates the supplied poster references into a tilted,
photo-led machine print on the yellow maker panel. It uses the local, official
Snapmaker A350T facility photograph with a factual caption, pink paper backing,
ink outline and hard shadow; the earlier machine drawing has been removed. Keep
the equipment photo at its native proportions, use `object-fit: contain`, and
keep decorative collage layers hidden from assistive technology. The enclosing
poster provides one concise accessible description. Reference poster artwork
is design inspiration only and is not copied into the site.

The member workspace keeps one shared navigation component between its
protected route shell and no-data design preview. Home, Lab and Profile form
the top navigation at every width; there is no sidebar or member bottom bar.
Lab groups Requests, Borrowing, Events, Visits and Projects, with an Overview
link. Profile groups Your details and Settings, with sign out in that context.
Notifications and the theme toggle remain top-right utilities. Context links
wrap on phones rather than requiring horizontal scrolling or a More menu.
Keep 44 px minimum interactive targets and visible focus outlines. Strong
outlined cards, restrained shadows and colored icon plates follow Grow's
hierarchy while using the website's Bricolage heading and notebook tokens.

## Audit refinements

Use local Press Start 2P for small accent labels and the MEC badge; use Bricolage Grotesque for the facilities display headline, Space Grotesk for modern headings, and DM Sans for body text. The notebook grid uses seven-percent ink. One direct Light/Dark button replaces the menu; OS preference is only the initial fallback. The branded boot screen runs once per browser-tab visit. Its first CSS-rendered frame starts with a dim, readable maker composition rather than hiding every layer at zero opacity; the full motion sequence then stays visible for at least 1.55 seconds after the visible animation frame, followed by a 320 ms fade. Page content is inert through the hand-off; the 2.6-second no-hydration watchdog also releases it. Reduced motion exits immediately. Phone account pages omit decorative story panels and are tested to fit normal small-screen viewports without scrolling. See [audit](ui-audit.md) for current evidence and authentication blockers.

UI/UX Pro Max's query for an engineering makerspace/student platform recommended a
Hero + Features + CTA page pattern and a Brutalism style direction. Those choices
reinforce the existing editorial homepage and hard-outline treatment. Its generic
teal palette was not adopted: the owner-approved IDEALAB yellow/pink anchors,
supporting accents and cobalt action color remain the product source of truth.


## Current motion graphics and stable-card treatment

The first-visit loader follows the official lowercase repeated-wordmark intro. A small original wireframe prototype draws in, the wordmark settles in three staggered beats, and a geometric star moves beside it. Alternating solid/outline rows move behind the central composition, and a narrow indeterminate rail signals work without implying measured completion. A nonce-protected layout fallback keeps the scene styled if the bundled stylesheet fails; normal first paint uses the bundled motion stylesheet, whose keyframes begin at partial opacity. The minimum hold is 1.55 seconds from the visible title frame, with a 400 ms readiness bound and 320 ms exit. Content stays inert through the hand-off. Reduced motion exits immediately, and a 2.6-second watchdog releases the page if hydration stalls. See [loader timing and motion evidence](quality/loader-visual-timing-2026-11-01.md).

All three path cards keep the same surface and text colors on hover/focus. Their lift, slight tilt, icon movement and link-arrow movement provide feedback. The public mobile bar includes Home and four other destinations, rounded corners, press feedback and a short selected-icon arrival. No-motion preferences disable these effects. The lower ribbon uses three original lab mottos, not attributed quotations or testimonials. Its real scroll container and the upper ticker scroll container are keyboard-focusable for static reading.

## Account setup card

The authenticated setup route uses a four-step card: private name/phone, studies, registration number, then review and explicit Submit profile. Progress, Back/Next, inline errors and heading focus make navigation clear. Drafts remain in page state; no private profile values are stored in browser storage. The final button has its own React key and a brief activation guard to avoid a double-click on Next becoming a submission. Saving the profile does not grant MEC admission: the declaration remains an independent, initially unchecked action after server-confirmed completion.

The card fits the four ordinary steps at 320×568, 390×844 and 1366×768 in both themes. Height constraints apply only to the active direct-child wizard. Short keyboards, zoom, errors or long values retain scrolling as an accessible fallback. Desktop uses a small editorial heading and two-column fields; mobile removes duplicate decorative headings and uses compact review rows. Sign out and theme controls stay in the toolbar. See [browser evidence](research/onboarding-wizard-2026-10-22.json).
