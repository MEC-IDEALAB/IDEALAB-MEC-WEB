# Security review and hardening evidence

Updated 21 October 2026. This is a source and local production-browser review, not a certification or live backend assessment.

## Findings and changes

- **Script policy (low):** the earlier response policy prevented framing, objects and foreign base URLs but did not restrict script execution. The Next.js Proxy now generates a cryptographically random nonce per matched request and sends a CSP with that nonce to both the request renderer and browser response. The root layout marks its two fixed bootstrap scripts; Next.js adds the nonce to framework scripts. Production `script-src` uses `'self'`, the per-response nonce and `'strict-dynamic'`; it does not include `unsafe-inline` or `unsafe-eval`.
- **Style attributes:** the browser initially reported blocked inline style application for Next/Image-rendered images. The policy separately allows `style-src-attr 'unsafe-inline'` while keeping style elements nonce-restricted. This is a deliberate CSS compatibility allowance; it does not authorize executable inline scripts.
- **Supabase session cookies:** both server-side Supabase client factories now pass `HttpOnly`, `Secure` in production, and `SameSite=Lax`. Local development keeps `Secure` off for HTTP loopback. [Supabase's SSR guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide) says `HttpOnly` is not necessary when a browser Supabase client needs its refresh token. This repository has no browser Supabase client, so the server-only flow enables `HttpOnly`; revisit that decision if browser-side auth is introduced. Actual production cookie headers and hosting HTTPS/HSTS configuration have not been inspected.
- **Rendering tradeoff:** [Next.js's CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) states nonce-based CSP requires dynamic rendering and disables normal static optimization/CDN caching for those pages. The root layout reads the request nonce, and the current production build reports the homepage and application routes as on-demand routes. Static assets and prefetch requests are excluded from the Proxy matcher. Production latency and traffic cost have not been measured.

## Verification

The production build and local checks used the bundled Node.js 24 runtime required by the project. ESLint and TypeScript passed. Boundary tests passed 16/16, including nonce-policy construction and production/development cookie options. The real Chromium acceptance suite passed the public/sample journey, checking fresh nonces across responses, nonce attributes on inline scripts, CSP headers on protected-route redirects and no browser CSP violations across the public pages and theme/loading flows.

The acceptance environment explicitly disables member activation and uses no Supabase credentials. It does not establish successful email/password auth, Google OAuth, account recovery, real `Set-Cookie` issuance, database authorization or member/staff workflows. Those remain gated by the live schema/profile-provisioning compatibility review documented in [architecture](architecture.md).

## Sources

- [Next.js 16 Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy)
- [Next.js 16 Proxy guide](https://nextjs.org/docs/app/getting-started/proxy)
- [Supabase SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
