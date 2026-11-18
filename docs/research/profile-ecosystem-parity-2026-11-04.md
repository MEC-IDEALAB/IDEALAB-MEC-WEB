# Profile ecosystem metadata comparison

Exact Grow migration `003_profile_ecosystem.sql` (SHA-256 `4467bae3fb1bfb742e8d8df35782bef6dfb1625a6eb6c4c49f8afec2c525d3b9`) was applied only in a disposable scratch cluster and compared with the captured public catalog and structural fingerprints. No shared database was changed.

The sibling Grow checkout is at commit `a88ce7eb357faa37e0b7b447b8ff43b4050092bc`; Git reports no working-tree change to this migration. This identifies the local source, not its historical deployment.

Both PG16.1 (`runtime-1793801368398-dcb90202.json`) and PG17.11 (`runtime-1793802942703-81b787c5.json`) runs completed, rolled back and removed their clusters. `exactMatch` is **false**. Completion of the comparison does not mean schema parity.

After correcting a version-specific explanatory string, the PG17.11 evidence was regenerated as `runtime-1793803894915-b4dd882f.json`, with the same differences. Independent security review verified the counts and warned that omitted policy permissiveness, table grants, RLS flags and trigger-function bodies prevent a full authorization-parity claim. Keep those attributes in the remaining reconciliation scope.

The expanded comparison is `runtime-1793805702378-37b07c8b.json`. It records SHA-256s for all three input catalog texts, includes policy permissiveness and table RLS/forced-RLS state (all eight match), and compares five trigger-function descriptors. Those descriptors differ in configuration hash, owner and ACL despite matching trigger definitions. Raw source003 is compared before installed hardening effects; the known `set_updated_at` search-path change is investigated separately. The result is now named `capturedMetadataMatch`, remains false, and never means full schema parity. All 192 expanded live table grants are retained as separate captured evidence, not fabricated in the synthetic source fixture.

| Comparison across eight profile tables | Result |
| --- | --- |
| Columns | All 75 captured names, types, positions and nullability descriptors match |
| Defaults | All 44 expression fingerprints match |
| Triggers | All five captured fingerprints match |
| Constraints | Source 003 has an extra `user_social_links_platform_check` |
| Indexes | Source 003 has extra `idx_user_experience_sort` and `idx_user_portfolio_projects_sort` indexes |
| Policies | 24 names differ; name-independent comparison finds seven different SELECT predicates |

For education, experience, interests, portfolio projects, skills, social links and volunteering, source 003 uses SELECT predicate `true`, while the captured live catalog uses `user_id = auth.uid()`. Replaying 003 is therefore not a safe replacement for the captured privacy rules. This comparison does not propose installing those broader predicates.

These results explain the eight-table structural origin but do not prove deployment provenance, the complete current schema, private/public data isolation, API authorization, minor-version parity or Flutter compatibility. Catalog captures came from separate read-only queries, not one atomic schema export. Function bodies, exact ACL history and other dependencies still require reconciliation. Policy descriptors also need review for any attributes omitted from the earlier capture before claiming full policy equivalence.

Reproduce with `IDEALAB_PG_BIN` pointing to an absolute local PostgreSQL binary directory and `node scripts/db-runtime.mjs --profile-ecosystem-parity`. The mode creates its own scratch cluster and refuses existing database targets. See [database validation](../database-validation.md) for the remaining baseline gate.
