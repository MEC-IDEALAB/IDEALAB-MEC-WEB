-- Database-only validation for the isolated storage prototype. This uses no
-- Auth accounts and does not establish an Auth, PostgREST, RLS-owner, Flutter,
-- concurrency, or production compatibility journey.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, public, extensions, idealab_private;

SELECT plan(21);

SELECT has_schema('idealab_private', 'private claim schema exists');
SELECT has_table(
  'idealab_private',
  'mec_registration_claims_v1',
  'claim storage table exists'
);
SELECT has_column(
  'idealab_private',
  'mec_registration_claims_v1',
  'user_id',
  'claim is bound to one Auth identity'
);
SELECT has_column(
  'idealab_private',
  'mec_registration_claims_v1',
  'normalized_value',
  'normalized comparison value exists'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS a
    JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
    WHERE c.oid = 'idealab_private.mec_registration_claims_v1'::regclass
      AND a.attname = 'normalized_value'
      AND a.attgenerated = 's'
      AND a.attcollation = pg_catalog.to_regcollation(
        'idealab_private.mec_registration_ci'
      )
  ),
  'normalized comparison is generated and uses the reviewed collation'
);
SELECT ok(
  (SELECT c.relrowsecurity
   FROM pg_catalog.pg_class AS c
   WHERE c.oid = 'idealab_private.mec_registration_claims_v1'::regclass),
  'row-level security is enabled'
);
SELECT ok(
  (SELECT c.relforcerowsecurity
   FROM pg_catalog.pg_class AS c
   WHERE c.oid = 'idealab_private.mec_registration_claims_v1'::regclass),
  'row-level security is forced'
);
SELECT is(
  (SELECT pg_catalog.count(*)::integer
   FROM pg_catalog.pg_policies AS p
   WHERE p.schemaname = 'idealab_private'
     AND p.tablename = 'mec_registration_claims_v1'),
  0,
  'no API policy exposes the private table'
);
SELECT ok(
  NOT pg_catalog.has_schema_privilege('anon', 'idealab_private', 'USAGE'),
  'anon cannot use the private schema'
);
SELECT ok(
  NOT pg_catalog.has_schema_privilege('authenticated', 'idealab_private', 'USAGE'),
  'authenticated cannot use the private schema'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege(
    'anon',
    'idealab_private.mec_registration_claims_v1',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'anon has no claim table privileges'
);
SELECT ok(
  NOT pg_catalog.has_table_privilege(
    'authenticated',
    'idealab_private.mec_registration_claims_v1',
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  ),
  'authenticated has no claim table privileges'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'idealab_private.normalize_mec_registration_v1(text)',
    'EXECUTE'
  ),
  'anon cannot execute the private normalizer'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'authenticated',
    'idealab_private.normalize_mec_registration_v1(text)',
    'EXECUTE'
  ),
  'authenticated cannot execute the private normalizer'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_index AS i
    WHERE i.indexrelid = 'idealab_private.mec_registration_claims_v1_normalized_uidx'::regclass
      AND i.indisunique
  ),
  'normalized registration uniqueness is enforced by a unique index'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_index AS i
    WHERE i.indexrelid = 'idealab_private.mec_registration_claims_v1_one_current_per_user_uidx'::regclass
      AND i.indisunique
      AND pg_catalog.pg_get_expr(i.indpred, i.indrelid) LIKE '%current%'
  ),
  'one current claim per Auth identity is enforced'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_index AS i
    WHERE i.indexrelid = 'idealab_private.mec_registration_claims_v1_one_pending_per_user_uidx'::regclass
      AND i.indisunique
      AND pg_catalog.pg_get_expr(i.indpred, i.indrelid) LIKE '%pending%'
  ),
  'one pending claim per Auth identity is enforced'
);
SELECT is(
  idealab_private.normalize_mec_registration_v1(E' \tmdl24cs219  \n'),
  'mdl24cs219',
  'normalization trims and collapses POSIX whitespace while preserving display case'
);
SELECT ok(
  idealab_private.normalize_mec_registration_v1('MDL24CS219')
    COLLATE idealab_private.mec_registration_ci
  = idealab_private.normalize_mec_registration_v1('mdl24cs219')
    COLLATE idealab_private.mec_registration_ci,
  'case variants compare equal'
);
CREATE TEMP TABLE mec_registration_normalization_probe (
  normalized_value text COLLATE idealab_private.mec_registration_ci UNIQUE
);
INSERT INTO mec_registration_normalization_probe (normalized_value)
VALUES (idealab_private.normalize_mec_registration_v1(' MDL24CS219 '));
SELECT throws_ok(
  $$INSERT INTO mec_registration_normalization_probe (normalized_value)
    VALUES (idealab_private.normalize_mec_registration_v1('mdl24cs219'))$$,
  '23505',
  NULL,
  'case and surrounding-space variants collide under a unique index'
);
SELECT ok(
  idealab_private.normalize_mec_registration_v1('MDL-24')
    COLLATE idealab_private.mec_registration_ci
  <> idealab_private.normalize_mec_registration_v1('MDL 24')
    COLLATE idealab_private.mec_registration_ci,
  'punctuation remains significant'
);

SELECT * FROM finish(true);
ROLLBACK;
