# Launch follow-up — 2 November 2026

This is the current follow-up to the owner's UI and launch-policy checklist.
The public website is deployed; the full member platform is not production-ready.
The deployed baseline is main `f3e9ce9ff93b714f320f2f7acf7c40a45db82e3f`
from [PR #57](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/pull/57).
Earlier dated status documents remain historical evidence.

## Public browser recheck

Real Chromium inspected the HTTPS production site at 1440×900 and 390×844.
Both ticker transforms changed over time, the event archive advanced while
hovered, and its active photograph had a running drift animation. Section
reveals repeated after leaving and re-entering the viewport. On the phone,
navigation was below the header and above the top ticker; the former bottom
navigation and header motion button were absent. The hero theme toggle was
visible at the upper right of the heading.

Both auth routes used the approved accent tokens: yellow `#ffe029` for sign-in
and pink `#ff3994` for signup. Submit shadows were neutral. Twelve of sixteen
production auth cases fit without document scroll: 320×568, 390×844 and
1440×900 in both themes passed; all four 844×390 cases overflowed vertically.
No horizontal overflow was observed. The owner subsequently rejected a
two-column landscape adaptation: retain the normal stacked account form.
The unreleased experiment was removed; no landscape change was deployed.

Google buttons on production were disabled. `src/lib/config.ts` deliberately
rejects every production backend target until the shared database authority
and Flutter compatibility gates pass. Isolated validation Google login has
previous scoped evidence; that does not establish live Vercel sign-in.

The cinematic intro was delivered and live-verified in PR #57. See the
[storyboard, timing, artwork and browser evidence](quality/cinematic-ascii-2026-11-01.md).
It runs once per tab visit, with explicit replay, Skip and reduced-motion handling.

## Confirmed layout direction

Keep the normal stacked form: email, password, submit, Google and account
switching in their existing order. Standard phone and desktop layouts should
fit without page scroll. Do not create two columns inside the account form or
hide controls with overflow rules. Enlarged text, error content and a software
keyboard still need reachable actions. Sign-in stays yellow and signup pink.

The earlier landscape experiment and its landscape-only test changes were
removed following the owner's clarification. They are not part of this change.
The retained UI change reduces vertical card padding from 28px to 24px in
shorter desktop windows. This corrects a four-pixel overflow reproduced on the
enabled validation signup form at 1366×768, preserving the stacked layout.
Public production passed all 20 normal viewport/theme/route checks at 320×568,
375×667, 390×844, 1366×768 and 1440×900. The remaining changes document the
audit and durable launch tasks. No backend, auth activation or database changes
are included. Enlarged/error content remains allowed to extend naturally.

The adjusted local validation form passed the same 20 normal layout cases,
without submitting credentials or creating sessions. The suite now checks that
configured account entry also fits vertically and retains the stacked form.
These are presentation checks, not new authentication or email delivery proof.

Node 24 lint, TypeScript, all 148 boundary tests, optimized acceptance build,
dependency audit (zero vulnerabilities), documentation checks and the full
public Chromium acceptance suite passed. Browser coverage includes both themes,
normal stacked account layouts, motion, intro failure/Skip paths, axe snapshots,
security headers and PWA boundaries. Request/project browser-storage checks and
the six validation-archive integrity tests also passed; these are not live
member persistence or full shared-database security acceptance.

Independent review agents were unavailable because of their usage limit.
Keep the follow-up PR draft until independent review and current hosted checks
pass. No merge or production deployment of this follow-up is claimed here.

## SDK and consent inventory: first pass

Fresh public contexts loaded both Vercel telemetry scripts before any consent
choice. No policy links or consent dialog were found. Package pins are
`@vercel/analytics` 2.0.1 and `@vercel/speed-insights` 2.0.0. Version 2 uses
build-specific script paths; checking only `/_vercel/insights` misses them.

The source limits telemetry to an explicit public-route allowlist, strips URL
query/hash values and rejects private routes/cross-origin URLs. This does not
establish complete SDK payload minimization or consent. The vendor describes
[Analytics collection and privacy](https://vercel.com/docs/analytics/privacy-policy)
and [Speed Insights collection and privacy](https://vercel.com/docs/speed-insights/privacy-policy),
including URL/referrer or performance/device fields respectively. Review the
actual payloads and institution-approved purposes before accepting either SDK.
This inventory is not a legal compliance determination.

Other identified storage includes the theme and motion preferences, tab-scoped
intro marker, public service-worker cache and private browser draft/retry storage.
Supabase handles isolated identity/session flows. Local fonts and bundled artwork
do not require a runtime font CDN. Complete dependency, network, cookie, retention
and deletion inventories remain in #41/#42; no private account data was inspected
in this public-site audit.

## Durable task list

| Owner | Task / dependency | State and evidence | Next action |
| --- | --- | --- | --- |
| Web / shared backend | [Google, signup, recovery and onboarding #5](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/5), [activation #15](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/15) | Production off; isolated evidence only | Review shared permissions and both clients; verify hosted account journeys before activation |
| Web UI | [Auth layout follow-up #58](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/58) | Landscape proposal withdrawn by owner; normal stacked layout retained | Verify standard phone/desktop fit; keep long content reachable |
| Institution / content | [Policies and business details #40](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/40) | Missing policy links | Approve privacy, terms, refund and cookie text, operator/contact, retention and fee rules; publish contextual links |
| Web / privacy | [Consent and third-party SDKs #41](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/41) | No banner; SDKs load before choice | Inventory purposes/storage/vendors; implement balanced consent, rejection and withdrawal; test network behavior |
| Backend / privacy | [Minimal data, deletion, unsubscribe #42](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/42) | Not complete | Justify each field; implement authenticated deletion/anonymization and real unsubscribe delivery paths |
| Web QA | [Alt text, contrast, keyboard #43](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/43) | Prior automated checks are partial evidence | Manually inspect images, both themes, focus order, zoom and screen-reader journeys |
| Institution / onboarding | [Age and guardian consent #44](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/44) | Institutional decision needed | Define eligibility and guardian path before collecting age data; avoid unnecessary identity documents |
| Content / operations | [Dark patterns, claims, reviews, fees #45](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/45) | Full review pending | Substantiate claims/reviews, show totals and terms before commitment, preserve easy exit; verify archive photo captions |
| Content / design | [Asset licensing #46](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/46) | Intro provenance recorded; whole-site audit pending | Record source, rights and required attribution for every image/font/icon/vector |
| Release | [V1 tracker #1](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/1) | Open | Keep verification, review and release state separate from implementation |

Public footer contact/address already exist, but legal operator identity, approved
payment payee, refund terms, age policy and retention periods need institutional
confirmation. Do not invent policy commitments, fees, testimonials, consent
records, unsubscribe links or completed deletion behavior. Payment intake remains
disabled until the approved public payment details and operational contract exist.
