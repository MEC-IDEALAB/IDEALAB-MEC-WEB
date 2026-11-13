# SQL CI preparation and local evidence

## 5 November source pin

Grow PR #17 merged as `781b3a2b4314cef67405aacec5b9387a81b1ebf8` after independent scoped review, 17 local guard tests and passing hosted checks on source head `6f9f9f1cffaba930d5ed7ec96cc191948ec5f98a`. Superseded draft #16 is closed. The local workflow still pins the verified source head, whose files are included in the merge. Shared database rollout and application acceptance remain separate gates.

The required SQL job now includes the synthetic preprofile migration and
pristine rollback, and the scratch archive restore drill. Local PG17.11
restore evidence `runtime-1793839856683-75ec83cc.json` verifies restored
fixture data, forced RLS and owner-only reads. The preprofile rehearsal
passed from the published Grow pin in the CI sibling layout
(`runtime-1793840113726-61478ff2.json`). A restore of the shared project's
actual backup remains a separate release gate.

Grow draft PR #17 publishes the nine core SQL files on the organization main base at `6f9f9f1cffaba930d5ed7ec96cc191948ec5f98a`. Both hosted checks passed on that revision. The local website workflow now pins it. The earlier missing-source finding below describes the previous pin. Grow review and hosted website CI remain separate release gates.

The proposed SQL job checks out the web repository into `idealab-mec-web` and public `MEC-IDEALAB/Grow-by-IL` into sibling `Grow`, currently pinned at commit `a88ce7eb357faa37e0b7b447b8ff43b4050092bc`. Independent review found that four required local SQL files are **untracked and absent from that commit**: the shared profile candidate, canonical November profile migration, fixture and behavior checks. An empty local `git diff` had missed these untracked files; it was insufficient evidence of remote availability. The proposed job is not hosted-ready until a reviewed Grow source revision contains all dependencies and the pin is updated. Run steps and artifact paths are otherwise consistent with the sibling layout. The previous job omitted Grow entirely.

The job uses PostgreSQL17 and retains the existing fail-closed Required gate. New steps include shared-profile function descriptors, shared staff SQL, Lab closure and future-table default privilege behavior. The function-descriptor mode now asserts the captured match rather than passing only because a comparison completed. YAML parsing and assertions for source layout, required steps and artifact paths passed locally using PyYAML 6.0.2.

| Disposable PG17.11 mode | Passing local artifact |
| --- | --- |
| `--staff-scope` | `runtime-1793809860169-3eb65d68.json` |
| `--lab-presence` | `runtime-1793809891210-92e58c7b.json` |
| `--project-admission` | `runtime-1793809930846-86dd0c2c.json` |
| `--event-drafts` | `runtime-1793809972054-6508342b.json` |
| `--shared-profile-function-parity` | `runtime-1793810007627-7f322587.json` |
| `--staff-scope-shared` | `runtime-1793802240924-0349fdcc.json` |
| `--lab-opening` | `runtime-1793804415897-82e5e60d.json` |
| `--default-acl-probe` | `runtime-1793807688212-7c15ec94.json` |

These are local Windows tests against synthetic private scratch clusters. All listed runs recorded rollback/cleanup. They do not prove hosted Ubuntu execution, full deployed-schema equivalence, real Supabase Auth/API, Flutter journeys or production readiness. The workflow and current worktree are unpushed; PR #67's old green checks are not evidence for this proposed workflow.

Read-only ledger fingerprints subsequently confirmed the two untracked local November migration files match the installed statement bytes exactly: hardening SHA-256 `d0b78457f55befaabc67d4767507e0b6a282ed6c909c4884cae7535719f23a15` and profile SHA-256 `492fbccba41ac6db03836b2ab62b1a5e9d7349a278d0670f032e8b2daad297b0`. See [ledger evidence](../research/shared-november-ledger-fingerprints-2026-11-04.json). This supports a source-reconciliation PR, but does not publish files or prove hosted checks.

The .gitignore and Vercel upload exclusions now explicitly cover local tools, generated output, runtime artifacts and Supabase temp files. No source imports were found under those paths, and independent review found no current website build input hidden by the exclusions. The portable PostgreSQL archive remains local and excluded from release source.
