# Auth completion and callback headers — 23 October 2026

Two source/response defects were corrected without changing Supabase settings,
accounts, credentials, database data or shared Grow production.

Successful email code exchange previously became an expired-link redirect if
SDK local sign-out threw, even after the cookie fallback succeeded. The shared
local-exit helper now always attempts cookie cleanup and reports cleared versus
cleanup-required. Confirmation reaches the verified sign-in notice only after
cleanup succeeds; if cleanup fails, it returns private/no-store 503 copy stating
that the email **is confirmed** and browser session cleanup failed. Actual code
exchange failure retains the generic expired/unavailable response.

Password update uses the same helper after a successful update. Cleanup failure
gets an explicit changed-password notice rather than an unexplained action error.
Its Finish signing out form calls a dedicated current-session retry action. Both
success and failure stay on fixed sign-in URLs. Independent review caught and
corrected the first wiring to general signOut, whose failure destination is the
workspace. The general sign-out behavior was preserved for its existing callers.

Actual HTTP inspection found that the global Next header rule overrode callback
Referrer-Policy with strict-origin-when-cross-origin. A final `/auth/:path*` config
rule now applies no-referrer, matching the route intention. Public response policy
remains unchanged. This follows the bundled Next headers documentation's last
matching header behavior; the final built server verifies the response itself.

| Owner | Dependency | State | Evidence / QA | Remaining check |
| --- | --- | --- | --- | --- |
| Main | Successful mutation cleanup | Corrected | Three new helper regression groups: ordering/waiting, SDK throw/result error, cleanup failure | These use injected unit callbacks, not a real Auth session |
| Independent reviewer | Current auth source | No remaining introduced boundary regression found | Confirmation branch, cleanup helper, dedicated fixed-destination retry and form binding reviewed | Real provider/session acceptance |
| Main | Current source checks | Passed | 100 boundary tests; affected-file lint; optimized production build including TypeScript | Full browser acceptance suite was not rerun |
| Main | Actual loopback HTTP | Passed | Three rejected callbacks: no-referrer and private/no-store; cleanup notice/retry form SSR; public policy unchanged | Positive exchange/update and action redirect mapping are not executed by this test |
| Main + owner | Private account journeys | Still unverified | Prior genuine Google/onboarding evidence is separate | Positive email signup, confirmation, password login and recovery after browser access returns |

Reproduce the HTTP regression against the current loopback build with bundled
Node 24 running `scripts/check-auth-responses.mjs http://127.0.0.1:3015`.
It supplies no credentials, cookies or successful callback code and does not
inspect tokens. It is not a browser or positive-auth substitute. The existing
browser acceptance script now includes the confirmation no-referrer assertion,
but that full browser script remains unrun for this change.

The current build is running at loopback port 3015. No application push, hosted
CI, merge or deployment validates this dirty source. No production readiness is
claimed; operational, shared-client and account release gates remain open.
