# Request draft status copy — 23 October 2026

## Finding and correction

Read-only inspection of the signed-in `/app/requests` page found contradictory
copy: the panel said there was “One local draft” while its empty state said no
draft was saved. The summary now reflects the actual browser-storage state:
found, empty, invalid and unavailable are described separately, and the preview
session is not described as an account-local draft.

The status copy is isolated in `src/features/requests/draft-workspace-copy.ts`
and covered by `scripts/draft-workspace-copy.test.mjs`. No draft, submitted
request or database record was changed during this correction.

After rebuilding the local validation site, a read-only check of the signed-in
browser confirmed the empty-draft summary matches the actual empty state. The
empty state now avoids repeating the same status a second time. No form was
submitted and no test-project request row was created.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` (Node 24) | Passed |
| `npm run typecheck` (Node 24) | Passed |
| `npm run test:boundaries` | Passed: 106 tests, zero failures |
| `node scripts/check-docs.mjs` | Passed: 43 files, 266 local links |
| `npm run build:acceptance` | Passed: optimized Next.js 16.4.2 build |
| `npm run test:acceptance` | Passed: public/auth/layout previews, five widths in light/dark, motion, keyboard and security-header checks |
| Signed-in validation browser after build | Passed: empty draft state is described accurately; no request row was created |
| Real online request submit → reload → cancel | Unverified; no form was submitted and no test request row was created |

The browser suite explicitly reports live account creation/email delivery,
email and Google login, recovery exchange, real-member draft persistence,
scoped permissions and operational backend workflows as unverified.
