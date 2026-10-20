# IDEALAB MEC website guidance

Read `docs/requirements.md`, `docs/architecture.md` and `docs/delivery-plan.md` before dependent changes. Keep narrative documentation under `docs/`. Preserve unrelated work and the parent Flutter application.

Use Node 24 and the npm lockfile. Reuse CSS tokens, accessible components and the approved institutional identity. Public pages contain curated information; member/event/project records require server-verified access. Sample catalogs are explicitly demo data and must not be imported into production or presented as verified stock, pricing or availability.

Supabase is the shared authority. Do not invent an API, bypass RLS, grant authority from client metadata or create an incompatible parallel schema. Shared/production changes require the reviewed architecture/migration gate and specific authorization described in `docs/architecture.md`.

Run current-source checks and real relevant acceptance journeys before application pushes. Do not substitute a public-page check for live account, authorization, persistence or staff workflow verification. Inspect hosted CI and independent review before merge/release. Keep secrets, session data and private member/payment content out of source, logs, issues and test artifacts.
