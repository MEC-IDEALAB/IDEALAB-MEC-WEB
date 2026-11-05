# Auth pixel background

The owner requested the supplied animated dot-field reference with IDEALAB colors and then explicitly requested its shader approach. Sign-in uses yellow and blue; signup uses pink and lavender. A dynamically imported, pinned Three.js 0.187.0 renderer and GLSL3 material adapt that reference behind the existing forms. Continuous radial and diagonal waves keep motion visible after startup. Rendering is capped at 30 updates per second and device pixel ratio 1.5. Hidden tabs stop the frame loop. Reduced motion renders a static field. The shared motion preference controls a labeled 44 px pause/resume button. WebGL initialization failure uses static CSS artwork and preserves form access.

This focused branch starts from main `ea3dfc919ddf0d5236d831e3f857020aa3617998`. It changes the decorative background, toolbar, scoped stylesheet and browser regression. Auth actions, backend configuration, proxy and operational routes are unchanged. The broader member work remains in draft PR #67 and its preserved local worktree.

The shader revision passed lint, TypeScript, 148 boundary tests, optimized acceptance build and the full actual Chromium public acceptance suite. Its browser checks inspect actual screenshot pixels for moving and paused frames, dynamic reduced motion, and an injected initialization failure alongside responsive auth forms, contrast, keyboard navigation, no-JavaScript content, security headers and PWA boundaries. The production renderer uses the default discardable framebuffer. Independent shader review identified cleanup being registered after initial rendering; cleanup now registers before startup, with a passing failure-path regression. The earlier proxy and request/project journal checks passed on the initial focused branch. Hosted checks are required on the revised pushed head before merge.

This public visual release does not establish real signup, email delivery, Google callback, password recovery or signed-in member persistence. Those remain separate acceptance gates for PR #67 and the full V1 release.

## White gradient and expired-attempt follow-up

The follow-up starts from merged main `db36904b1bc8f6aac1cb3de6b64ba99f2c3345a7`.
The field now uses centered, size-varying pixels and continuous white/pastel waves,
with blue/yellow accents for sign-in and pink/lavender for signup. Theme changes
update the background uniform without reallocating the renderer. CSS supplies
artwork before WebGL starts and when initialization fails. The existing frame,
pixel-ratio, visibility, pause and reduced-motion limits remain.

Supabase errors returning to the public home now route to a fixed sign-in notice.
An expired OAuth attempt gets instructions to start a fresh Google flow. Raw
provider descriptions and caller-selected destinations are never reflected. This
does not extend OAuth state lifetime, accept stale credentials or enable hosted
account access. Unit and browser regressions cover these failure responses.

The final follow-up passed lint, TypeScript, optimized acceptance build, the full
Chromium public acceptance suite and configured-proxy denial checks. Independent
review found no scoped shader, redirect or reflection defect. Hosted checks must
still pass on the pushed follow-up revision before merge.
