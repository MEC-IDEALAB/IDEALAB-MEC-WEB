# Auth pixel background

The owner requested the supplied animated dot-field reference with IDEALAB colors. Sign-in uses yellow and blue; signup uses pink and lavender. A local Canvas2D renderer provides the effect behind the existing forms. Rendering is capped at 20 updates per second and device pixel ratio 1.5. Hidden tabs stop the frame loop. Reduced motion renders a static field. The shared motion preference controls a labeled 44 px pause/resume button.

This focused branch starts from main `ea3dfc919ddf0d5236d831e3f857020aa3617998`. It changes the decorative background, toolbar, scoped stylesheet and browser regression. Auth actions, backend configuration, proxy and operational routes are unchanged. The broader member work remains in draft PR #67 and its preserved local worktree.

Local verification on 5 November passed locked dependency installation, lint, TypeScript, 148 boundary tests, optimized acceptance build, actual Chromium public acceptance, validation proxy checks, and request/project browser journals. The browser suite exercises changing canvas frames, paused frames and dynamic reduced motion alongside responsive auth forms, contrast, keyboard navigation, no-JavaScript content, security headers and PWA boundaries. Independent source review found no blocking defect. Hosted checks are required on the pushed revision before merge.

This public visual release does not establish real signup, email delivery, Google callback, password recovery or signed-in member persistence. Those remain separate acceptance gates for PR #67 and the full V1 release.
