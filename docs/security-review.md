# Security review and hardening evidence

29 October backend target gate: `backendConfig()` rejects unknown environments,
non-root or credential-bearing URLs (including non-default ports), and arbitrary
Supabase targets. Validation is pinned to `gvvqlfachzbufstzoiwi`; test-only auth
configuration uses an explicit test flag and a reserved `.invalid` host.
Production account integration is rejected by source regardless of the former
production opt-in or exact Grow host, because the inspected shared `public.users`
policy exposes all rows and permits authority-field updates. Node 24 config tests
assert that no environment toggle can enable website sessions against Grow. The
manual Vercel Preview gate also requires member/data flags to be false. These
checks do not contact a real provider or change the live validation build. No
production Auth, database, or deployment settings were changed by this code fix.

The isolated validation database also received a reviewed additive index
migration after the advisor identified unindexed foreign-key paths. Fresh
catalog and advisor results confirm all eight indexes are valid and the
unindexed-FK notice is cleared. This changed no RLS, grants, Auth settings or
production schema; see [backend readiness](backend-readiness.md#validation-foreign-key-indexes--23-october-2026).

23 October isolated database metadata recheck: the validation project is healthy
on PostgreSQL 17.11 with nine tracked migrations installed. Effective privileges
deny `anon` and `authenticated` direct access to all five public base tables, and
`anon` cannot execute public RPCs. The `idealab_private` schema remains absent
from the Data API exposed-schema list (read-only HTTP 406 check, 22 October); its
database role has schema usage for authenticated execution, so keep that schema
unexposed and retain authenticated owner checks in every callable function.
Security advisors report 18 RLS-without-policy informational findings on private
tables and deliberately ungranted public base tables, plus disabled leaked-
password protection. No policy, grant, Auth setting, or data changed in this
recheck. The auth setting remains a release decision on the Free project.

23 October actual HTTP correction: Next's global header rule was overriding the
auth routes' intended no-referrer policy. An auth-path override now produces
no-referrer on all three callback responses; public policy remains unchanged.
See [auth cleanup/header verification](quality/auth-completion-cleanup-2026-10-23.md).
This response check does not establish a successful email confirmation/recovery.

23 October shared Events metadata review: its existing SELECT policy requires
only an authenticated JWT, not verified/active/MEC-admitted readiness. Broad
table grants also remain. This is a pre-existing shared-access gap relative to
the MEC-ready website requirement; a website guard does not fix direct database
access. No shared policy was changed. The isolated read contract uses the current
member predicate and denies raw table access. See [metadata](research/events-metadata-2026-10-23.md)
and [isolated acceptance limits](quality/events-read-2026-10-23.md). Separately
review policy/grant migration and both-client compatibility before shared rollout.

Latest isolated checkpoint: [current account status](account-readiness.md) and
[deferred guard correction](research/pending-guard-privilege-fix-2026-10-22.json).
Historical statements below that no genuine Auth session has been tested no
longer describe the isolated Google/provisioning journey; production acceptance
is still open.

Updated 21 October 2026. This is a source and local production-browser review, not a certification or live backend assessment.

## Findings and changes

- **Script policy (low):** the earlier response policy prevented framing, objects and foreign base URLs but did not restrict script execution. The Next.js Proxy now generates a cryptographically random nonce per matched request and sends a CSP with that nonce to both the request renderer and browser response. The root layout marks its two fixed bootstrap scripts; Next.js adds the nonce to framework scripts. Production `script-src` uses `'self'`, the per-response nonce and `'strict-dynamic'`; it does not include `unsafe-inline` or `unsafe-eval`.
- **Style attributes:** the browser initially reported blocked inline style application for Next/Image-rendered images. The policy separately allows `style-src-attr 'unsafe-inline'` while keeping style elements nonce-restricted. This is a deliberate CSS compatibility allowance; it does not authorize executable inline scripts.
- **Supabase session cookies:** both server-side Supabase client factories now pass `HttpOnly`, `Secure` in production, and `SameSite=Lax`. Local development keeps `Secure` off for HTTP loopback. [Supabase's SSR guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide) says `HttpOnly` is not necessary when a browser Supabase client needs its refresh token. This repository has no browser Supabase client, so the server-only flow enables `HttpOnly`; revisit that decision if browser-side auth is introduced. Actual production cookie headers and hosting HTTPS/HSTS configuration have not been inspected.
- **Rendering tradeoff:** [Next.js's CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) states nonce-based CSP requires dynamic rendering and disables normal static optimization/CDN caching for those pages. The root layout reads the request nonce, and the current production build reports the homepage and application routes as on-demand routes. Static assets and prefetch requests are excluded from the Proxy matcher. Production latency and traffic cost have not been measured.

## Verification

The production build and local checks used the bundled Node.js 24 runtime required by the project. The earlier source pass covered 16/16 boundary tests. Application/test source commit `4141923468daa1d790645157497923f3e2664c0d` passes Node 24 lint, TypeScript, 28/28 boundary tests, optimized production build and real Chromium acceptance. On the exact PR head `3c20ad3dff8e98918613134d2b9ff887062a4b2c`, [Website CI and the required gate](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39540469694) and [Documentation CI](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/actions/runs/39540469704) pass. The browser suite checks fresh nonces across responses, nonce attributes on inline scripts, CSP headers on protected-route redirects, no CSP violations, responsive recovery forms, theme behavior, non-enumerating copy and rejection of untrusted recovery callback redirects. An independent read-only source review found no confirmed recovery-flow security defect. It also notes that the implementation signs out only the current session and does not require proof that a valid session originated from a recovery email; confirm those behaviors against the intended Supabase Auth settings before enabling the flow.

The regular acceptance environment disables member activation. CI builds with only a reserved `.invalid` Supabase URL and dummy publishable-key fixture because Next.js inlines `NEXT_PUBLIC_` configuration at build time; the acceptance suite never submits a form or contacts that host. Neither environment establishes successful email/password auth, Google OAuth, recovery email delivery, valid PKCE exchange, real password update, real `Set-Cookie` issuance, database authorization or member/staff workflows. Live Supabase metadata still confirms role/status self-promotion and broad profile exposure, and additionally permits self-assigned project-member roles and author-set article approval. See the [backend readiness evidence](backend-readiness.md). Keep member activation off.

## Sources

- [Next.js 16 Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy)
- [Next.js 16 Proxy guide](https://nextjs.org/docs/app/getting-started/proxy)
- [Supabase SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)


## Current identity-guard correction — 22 October 2026

The server profile-read guard now requires a nonblank current email, explicit
`is_anonymous=false`, and a nonblank confirmation timestamp from `auth.getUser()`.
Twelve rejected identity vectors all skip the profile loader; an accepted
identity grants neither profile completion nor MEC admission, and loader errors
remain errors. Independent source review found no issue in the correction.
Node 24 lint/typecheck, all 29 boundary tests, optimized production build and
full local public/configuration browser acceptance passed. No real Auth session
was used. The subsequent admission-aware member guard implements profile/admission
states before workspace entry; live account, Data API and staff authorization
remain unverified. Isolated SQL rollback-only evidence is in [backend readiness](backend-readiness.md).

## Isolated account follow-up — 22 October 2026

Genuine Google login and owner profile save now work in the isolated project.
The first declaration request exposed a deferred invoker-trigger privilege error;
its reviewed fixed-target definer correction retains all direct table/function
denials and the pending-claim invariant. Metadata/wrong-context assertions pass;
real declaration/commit retry remains required. No production policy, role or
schema change is implied by the isolated fixes.

The latest isolated security advisor also reports leaked-password protection
as disabled, alongside the two expected informational private-table notices.
[Supabase documents leaked-password protection as Pro-plan-and-above](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No paid plan, trial or billing change was initiated. This remains an explicit
release security decision; it is not silently treated as a passed check.
