# Cinematic ASCII intro — 1 November 2026

The owner requested clearer hand anatomy and a cinematic opening, and questioned
the proportions of the previous silhouette study. This replaces that study with
an offline luminance conversion of the actual reaching hands from Michelangelo's
*The Creation of Adam*. The monochrome code glyphs retain the original fingertips,
thumbs, bent fingers and wrist contours. Four luminance bands give the palms shape.
The owner's subsequent reference image specifies coarse, separated white code
characters, scattered cobalt glyphs/square pixels and a dark dot matrix. The final
field uses a 160-column/52-row grid and a fifth blue accent layer to follow that
treatment. The reference image is a visual direction; the contemporary artwork
itself is not shipped or reproduced as a raster asset.

## Source and reproduction

The source is the [Wikimedia Commons detail](https://commons.wikimedia.org/wiki/File:Creation_of_Adam_%28Michelangelo%29_Detail.jpg),
the 1,400 × 1,047 JPEG uploaded on 3 February 2018. The file page marks it as
PD-Art: a faithful reproduction of a public-domain two-dimensional artwork by
Michelangelo (1475–1564). This is the historical painting, not a downloaded
contemporary ASCII animation. No third-party SDK or remote asset request is added.

The exact source is retained at
`scripts/assets/creation-of-adam-detail.jpg` (870,400 bytes), SHA-256
`24638860d92ea0dbb0ccfd14ef07b216ab1ea7245ce4e2ebc38ea5732e39f28a`.
Its SHA-1 `4d32767e165ea686dfa4d1facdb2fe96de02d348` matches the Commons file record.
Run `node scripts/generate-ascii-hands.mjs` with Node 24 and lockfile dependencies
to regenerate `src/components/ascii-hand-field.json`. The generator checks the
source hash, isolates the hands with masks and chroma, maps luminance to glyphs,
and writes deterministic rows. The painting is an offline source; it is not served
as a website photograph.

`node scripts/render-intro-sprites.mjs` then renders the glyph rows and original
TV/energy vectors through the lockfile's Playwright Chromium. It retains editable
SVG exports under `scripts/artwork/generated/` and transparent PNG textures under
`public/intro/`. Browser rendering is necessary: an earlier SVG rasterizer ignored
text spacing and dropped the curved text paths. Those incorrect trial textures
were replaced before publication. The canonical PNGs were visually inspected;
future exports need inspection because system monospace fonts can vary by host.

## Four-shot motion script

The owner subsequently requested a full motion-graphics redesign and supplied an
ASCII CRT reference plus contact/burst frames. `scripts/artwork/television.tsx`
builds original CRT geometry from glyph rows; `scripts/artwork/energy.tsx` builds
an original radial glyph cloud and curved code rays. Neither reference screenshot
nor a third-party video is included in the application.

| Time | Shot and motion | On-screen copy |
| --- | --- | --- |
| 0–2 seconds | An ASCII CRT powers up; a blue scan traverses the screen while the hands resolve inside it. | 00 / TUNE IN — A signal becomes an idea. |
| 2–5 seconds | The camera enters the CRT; its frame expands out of view, the hands reach, and blue packets travel toward the fingertips. | 01 / CURIOSITY — It starts with a what if. |
| 5–7 seconds | The fingertip bridge draws; a single white, cobalt and muted-yellow code burst expands into curved glyph trails. | 02 / CONNECTION — One spark meets another. |
| 7–10 seconds | The code field recedes; the prototype mark draws and the IDEALAB lettering reveals in staggered masks. The final identity is fully readable before exit. | 03 / CREATION — Think. Experiment. Make. |

Shots overlap during transitions. The identity begins fading in at 6.5 seconds;
lettering and the brand caption finish by 8.1 seconds. The burst is one continuous
expansion and fade, without repeated flashes, audio, fake percentages or progress
bars. All endpoints hold through the final fade. Phones first show the complete
TV, then use a closer hand composition; short landscape screens use a compact
identity. The TV frame and screen content share a single camera, preserving their
relative positions throughout the push. Burst growth uses continuous velocity,
and glyph blur was removed. The old wordmark wall and coordinate text are gone.

Every element explicitly resets `--film-motion` to prevent inherited animation
duplication. The external stylesheet sets a scene-readiness sentinel; the inline
bootstrap assigns texture URLs only for an actual intro and waits for all four
image decodes and real hand geometry before setting the shared start marker.
All animation clocks remain paused until then, including before React hydrates.
Failed textures immediately release the page; late failures after Skip are ignored.
Ordinary reduced-motion and repeat visits do not request the unused textures.
The late brand reveal is deliberately not a readiness condition.

The existing ten-second visible minimum, once-per-visit behavior, Replay,
Skip intro, early no-hydration skip, focus handoff, inert page coverage, watchdogs
and reduced-motion behavior are retained. Ordinary reduced-motion visits skip the
intro; explicitly requesting a replay remains a scoped animation opt-in.

## Verification

The four shots have been rendered and visually inspected at
1440 × 900, 390 × 844, 320 × 568 and 844 × 390. Exact-phase stills pause the CSS
clocks for inspection; separate real-time browser playback verifies the sequence.
Independent read-only review verified normal and requested reduced-motion replay,
ordinary reduced-motion skipping, no external requests, and a constant 38 × 40
landscape prototype mark. The live artwork uses four cached textures and small
vector signal paths rather than repainting 511 SVG text nodes. There is no
JavaScript animation frame loop in the application.

An optimized local Chromium nine-second sample measured median frame spacing of
16.7 ms at both 1440 × 900 and 390 × 844. The 95th percentile was 33.4 ms on
desktop and 16.7 ms on phone; frames over 34 ms fell to 9 and 0 respectively.
The earlier text version measured 116.7/83.3 ms at the 95th percentile. These are
local observations, not a promise for every device. The final samples produced no
page errors, CSP violations or external requests. The four canonical textures
total 986,970 bytes and are decoded only before a playing intro.

A real SVG whitespace defect found during the first inspection was corrected.
Review also reproduced a short-landscape size change caused by fallback selector
precedence; the final selectors and browser check cover both loading and exit.
The final script check initially measured an SVG after the short exit had ended.
Its observer now captures geometry synchronously at the leaving transition, before
screenshots or hydration can delay the measurement. Unnecessary parent scaling was
removed so the prototype has one intrinsic size throughout.

Independent review also found that failed external CSS exposed all unstyled
shots and allowed the brand panel to cover Skip. The critical fallback now hides
the film layers, preserves a 44px Skip above the artwork, and keeps the overlay
hidden after exit. Actual pointer clicks in the CSS-failure/no-hydration scenario
passed on both desktop and phone, in addition to the automatic watchdog test.

Current-source Node 24 lint, TypeScript, optimized acceptance build, all 148 boundary
tests and the complete optimized Chromium acceptance suite passed. The latter
includes all four shots before hydration, ten-second timing, delayed CSS readiness,
held/missing textures, early Skip, CSS-failure pointer Skip, focus/inertness,
reduced motion, mobile/landscape size continuity, responsive public/auth layouts,
axe snapshots, security headers, PWA/offline and uncached member-route boundaries.
The dependency audit reported zero vulnerabilities. Documentation validation passed
with 61 Markdown files and 304 local links. Independent read-only source, browser
and artifact review found no remaining blocker after the fixes above.

Development CSP output is not used as proof: the optimized run passed its CSP and
page-error gates. Hosted CI and deployed replay evidence are tracked on
[issue 56](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/56) and its linked PR;
they must be checked against the actual revision rather than inferred from local
results. Live account and operational backend journeys remain outside this slice.

This is an artwork/presentation change. It does not enable production accounts,
change authentication or database permissions, or establish full platform readiness.
