# UI audit and corrections

| Finding | Correction | Verification |
| --- | --- | --- |
| Loader repeated on document loads; diagonal wall felt abrupt | First session-storage visit only; level rows, slower motion; clears on hydration, no artificial minimum, five-second fail-open limit | First-load capture, repeat reload/navigation assertions; reduced-motion static state |
| Theme picker required a menu | One 44 px light/dark toggle; initial browser preference fallback | Persistence, cross-tab, blocked-storage and OS fallback checks |
| Auth overflowed on shorter viewports | Compact forms and short-screen rules; omit decorative story on phones | Both routes fit 1366×768, 1440×900, 390×844 and 375×667 at normal zoom; zoom/keyboard scrolling remains possible |
| Typography lacked hierarchy | Modern Space Grotesk headings/DM Sans body; local Press Start 2P labels and MEC badge | Local font/build and screenshot inspection |
| Notebook texture too strong | Paper `#fcfbf7`, seven-percent grid ink; jet-black dark canvas preserved | Contrast, responsive and dark-canvas checks |
| Only three facility photographs | All eleven supplied equipment/software PNGs saved locally unchanged | Asset provenance and image-load assertions |

ESLint and 13 configuration/storage/OAuth boundary tests passed in session 5495. Final production build/TypeScript and real browser acceptance passed in session 97741 after the last presentation changes. Earlier failures identified a hydration timing assumption in the test helper and actual 375×667 form overflow; both were corrected. No-JavaScript content, scroll/card animation and live reduced-motion cancellation remain covered. Only the first-visit boot uses the wordmark wall; later sign-in navigation uses a normal route skeleton.

## Authentication evidence and blocker

The reconnected `grow-idealab` database responds to `select 1`; schema and migration reads succeed. Two migration ledger entries are reported. Listed public tables have RLS enabled. Public auth settings report Google/email enabled, signups enabled and email autoconfirm enabled. This does not establish a successful account journey.

Website Google OAuth initiation and PKCE callback use a configured canonical origin, fixed `/app` destination, private/no-store responses and no reflected provider errors. Both member and Google activation flags remain default-off. `AUTH_SITE_URL` must match the allowed callback origin. Tests cover gates and unsafe origin rejection; real successful Google/existing-account journeys remain unverified.

**Activation blocker:** live `public.users` policies allow authenticated users to read all rows and allow users to insert/update their own row. Table-wide INSERT/UPDATE grants and no user-table guard trigger leave `role`, `is_active`, reputation and related authority fields unprotected by column restrictions. The broad-read policy applies to authenticated users, not anonymous visitors. No noninternal profile-provisioning trigger exists on `auth.users`. Existing Flutter sign-in creates profiles client-side, so server provisioning must account for this behavior.

Before activation: prepare and independently review a canonical shared migration restricting authority fields/profile reads and provisioning trusted profiles; verify negative authorization and Flutter signup/profile compatibility in a validation environment; apply only the specifically authorized shared-project change. No schema/permission change, data write, signup or exploit was performed. Frontend flags do not repair risks for other direct backend clients.

References: [Supabase Google auth](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Tracked remediation: [backend activation gate #15](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/15).
