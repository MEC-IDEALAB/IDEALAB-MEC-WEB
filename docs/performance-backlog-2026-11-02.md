# Website performance backlog — 2 November 2026

The owner requested the following work be saved for later implementation.
Tracking epic: [#60](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/60).
Project: [IDEALAB MEC — V1 delivery](https://github.com/orgs/MEC-IDEALAB/projects/1).
All seven project items are Todo, Release phase, with verification Not run.
P1/P2 priorities below are proposed sequencing, not completed optimization.

## Delivery ledger

| Scope | Owner | Priority | State | Next action / dependencies |
| --- | --- | --- | --- | --- |
| [#61: Improve startup, image delivery, bundles and static asset caching](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/61) | Main / scoped implementer and reviewer when scheduled | P1 | Todo; not verified | Measure cold startup and image requests before changing the intro or asset strategy. |
| [#62: Reduce duplicate requests and keep interactions responsive](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/62) | Main / scoped implementer and reviewer when scheduled | P1 | Todo; not verified | Capture request counts and timings for representative public and authenticated journeys. |
| [#63: Optimize database queries, indexes, connections and deployment locality](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/63) | Main / scoped implementer and reviewer when scheduled | P1 | Todo; not verified | Capture safe query plans and database timings after shared-schema reconciliation. |
| [#64: Evaluate safe caching, background jobs and traffic scaling](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/64) | Main / scoped implementer and reviewer when scheduled | P2 | Todo; not verified | Identify a measured expensive shared workload and document cache/job/scaling requirements. |
| [#65: Measure real user performance and test slow devices and networks](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/65) | Main / scoped implementer and reviewer when scheduled | P1 | Todo; not verified | Establish a reproducible route/device/network baseline and privacy-safe monitoring plan. |
| [#66: Stream AI output when an AI feature is introduced](https://github.com/MEC-IDEALAB/IDEALAB-MEC-WEB/issues/66) | Main / scoped implementer and reviewer when scheduled | P2 | Todo; not verified | Keep deferred until a defined AI feature and backend workload exist. |

## Complete requested checklist

### Improve startup, image delivery, bundles and static asset caching — #61

- [ ] P01: Verify accessible skeleton loading for slow Home/Lab data and route transitions; continue #25.
- [ ] P02: Serve photographic images as WebP or AVIF with responsive sizes and visual checks.
- [ ] P06: Verify static files and optimized images are delivered through the hosting CDN.
- [ ] P09: Verify Brotli or gzip negotiation on hosted text responses.
- [ ] P11: Audit dependencies and remove only packages proven unused.
- [ ] P15: Lazy-load images below the viewport; avoid eager-loading every inactive carousel slide.
- [ ] P20: Use server rendering or build-time generation where route freshness, CSP and privacy permit.
- [ ] P21: Load noncritical third-party scripts after page readiness and the required consent; coordinate #41.
- [ ] P22: Keep JavaScript split by route and defer optional heavy components.
- [ ] P27: Verify browser caching for versioned static assets and safe invalidation on deployment.
- [ ] P29: Keep fonts self-hosted and limit loaded families, weights and styles.

Source audit: Next/Image, local fonts, App Router splitting, and Home/Lab Suspense skeletons already exist; hosted effectiveness remains to verify. All four event-carousel images currently use eager loading. The first-visit intro deliberately gates content for 10 seconds per prior owner direction (#39/#56), and its four PNG sprites total roughly 972 KB. Record that UX tradeoff and obtain timing direction before changing the requested cinematic sequence. Do not mark skeleton/backend acceptance complete from a public preview.

### Reduce duplicate requests and keep interactions responsive — #62

- [ ] P03: Prevent duplicate API calls and deduplicate identical reads within a request/render.
- [ ] P04: Debounce live search/autocomplete and cancel stale work when such inputs make network requests.
- [ ] P05: Paginate API results with bounded server-side limits and stable cursors.
- [ ] P12: Set external request timeouts while preserving upstream cancellation signals.
- [ ] P14: Update UI immediately with pending feedback or safe optimistic updates; reconcile errors and never report unconfirmed critical writes as saved.
- [ ] P16: Run independent requests in parallel while preserving auth and other true dependencies.
- [ ] P23: Virtualize genuinely long rendered lists when pagination alone is insufficient.
- [ ] P26: Prevent unnecessary rerenders based on profiling.

Source audit: React.cache already deduplicates member/profile reads within a server render; keep the separate proxy refresh and server authorization checks. Current project search submits GET explicitly and has no per-keystroke autocomplete API, so debounce is conditional on adding live search. Events/projects/requests are already capped at 20 per page; upcoming events at 3. Supabase/proxy fetch have a 12-second timeout but currently replace the caller signal. Validate real journeys before claiming reduced latency.

### Optimize database queries, indexes, connections and deployment locality — #63

- [ ] P08: Find and fix N+1 query patterns with query plans and before/after measurements.
- [ ] P17: Add or adjust indexes for common filters, joins and pagination after inspecting existing indexes.
- [ ] P19: Place application execution close to the database and verify the effective runtime region.
- [ ] P24: Select only the columns needed by each consumer and preserve private-field boundaries.
- [ ] P25: Use supported database connection pooling for direct database workloads; verify whether clients use HTTP APIs instead.

Grow is in ap-south-1. The website uses Supabase HTTP clients rather than a current direct PostgreSQL connection. Do not introduce a second pool unnecessarily. A bounded per-card helper pattern exists in the uninstalled validation project-list candidate; this is a profiling lead, not a demonstrated production N+1 incident. Shared auth/profile and migration gates (#4/#15) remain prerequisites; no ad-hoc production indexes or policy weakening.

### Evaluate safe caching, background jobs and traffic scaling — #64

- [ ] P07: Move actual slow noninteractive tasks to a durable background job queue with retries and idempotency.
- [ ] P10: Evaluate Redis caching for frequently accessed eligible data, including keys, TTLs, invalidation and failure behavior.
- [ ] P28: Verify hosting scaling/load balancing under representative traffic; assess multiple instances only when deployment architecture and load require them.

No current website Redis service or background-job workload was found. This task is an evaluation/implementation gate, not authorization to provision paid services or add empty infrastructure. Keep member/session/profile/permission responses private and fresh; never share authenticated responses through a public Redis/CDN cache. Document queue ownership, retention and safe retries. Verify Vercel managed scaling before adding another deployment tier.

### Measure real user performance and test slow devices and networks — #65

- [ ] P18: Trace slow backend requests with OpenTelemetry and sanitized correlation IDs.
- [ ] P30: Track real user speed with performance monitoring, consent controls and private-route exclusions.
- [ ] P31: Test on slow phones and constrained networks, recording cold/warm cache, loading feedback and errors.

Record navigation/render/network/DB timing and user-facing LCP/INP/CLS where applicable; agree performance budgets before asserting compliance. Coordinate consent/minimization with #41/#42. Strip query strings, credentials, account identifiers and form data from telemetry. Existing Vercel SDKs do not establish configured/consented monitoring or a performance pass. Include representative Home/Lab/profile/search/list journeys once real auth acceptance is available.

### Stream AI output when an AI feature is introduced — #66

- [ ] P13: For a real AI feature, stream response tokens incrementally with cancellation, timeouts, safe rendering and partial-error handling.

There is no current website AI SDK, model call or AI response UI. Retain this as a conditional future requirement; do not invent an AI endpoint or introduce a provider/dependency solely to tick the checklist. Verify actual token streaming and cancellation on constrained networks when an approved feature is implemented.

## Verification and release rules

Measure before changing architecture. Record source revision, tested routes,
device/network/cache conditions, before/after timings and errors. Assess real
user LCP/INP/CLS where applicable and agree route budgets before claiming a pass.
A public/fixture check is not a real authenticated backend acceptance result.

Keep server authorization and private no-store responses. Optimistic UI must
show pending state, handle rollback/retry and wait for server acknowledgment
before claiming critical work was saved. Respect existing project/request
recovery contracts. Consent and data minimization apply to SDKs and traces.

No Redis instance, queue, replica, telemetry collector or AI provider was
provisioned for this tracking request. AI streaming is conditional because the
site currently has no AI response feature. Existing code safeguards are recorded
as source evidence; they remain unchecked until the relevant acceptance is run.

This backlog does not shorten or remove the owner's previously requested
10-second cinematic intro. Startup work must explicitly resolve that tradeoff.
Do not replace missing functionality or benchmarks with an artificial pass.
