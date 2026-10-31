# Shared Flutter compatibility checkpoint

For the later read-only inspection of the current, uncommitted Grow worktree,
see [the 1 November checkout audit](flutter-compatibility-2026-11-01.md). It
supersedes the statement below that no versioned own-profile code is present in
the local source; it does not establish a merged or deployed compatibility
contract.

23 October read-only refresh at parent HEAD `a88ce7e`: the main contract gap
below remains. No versioned profile/read/save/claim or MEC-admission references
were found under lib/test/integration_test. Uncommitted router changes now send
the richer education editor route to an unavailable page; its old direct write
is therefore not an active UI path. The basic editor still directly updates
name/phone/college_roll. Preserve those unrelated privacy-gating changes.
The refresh ran no Flutter tests or live backend mutations and does not prove
runtime behavior or shared deployment compatibility.

Read-only independent current-source review, 22 October 2026. Shared activation
remains blocked; no Flutter edits or production changes were made.

| Boundary | Current source evidence | Required coordinated change |
| --- | --- | --- |
| Own profile | `lib/features/auth/data/auth_repository.dart` reads `SELECT *` in getUserProfile and getCurrentUser; `lib/shared/models/user_model.dart` requires copied public email | Strict versioned projection; display email from verified Auth |
| Provisioning | AuthRepository signup, ensureUserProfileExists and auto-heal, plus GoogleAuthService, insert users directly | Trusted provisioning without conflicting client inserts |
| Onboarding | Routed RC5OnboardingScreen only updates profile_completed | Six-field revision-aware save and separate explicit declaration |
| Profile editing | updateProfile accepts direct fields; education/draft paths edit college_roll | Versioned writer and claim transition semantics |
| Admission | app_router uses session and completion; absent/loading/error profile can escape that condition | Consistent fail-closed verified, active, admitted student guard |
| Activation and staff | Splash alone checks inactive; model defaults missing activation to true; router requires completion regardless of role | Strict activation and separate trusted staff path |

No references to `get_own_profile_v1`, `save_own_profile_v1`,
`claim_mec_registration_v1`, `mec_admitted`, `profile_revision` or
`profile_contract_version` were found under `lib` by the reviewer.
Database role names broadly align and editable metadata is not its admin source.

Before shared activation, decide compatibility for already-installed clients,
implement the coordinated contract, and run genuine Android plus website
acceptance, including revision and ownership conflicts. The isolated website
success does not establish this compatibility.
