-- LOCAL structural/negative suite only, not signup/Auth/Data API acceptance.
-- Execute inside the SAME outer BEGIN/ROLLBACK as the reviewed storage, guard,
-- identity-helper and read/provisioning candidates, in the approved empty PG17
-- isolated project. This savepoint rolls instrumentation back without committing
-- candidate DDL. Never fabricate auth.users rows or copy production records.
-- Genuine-account positives remain UNVERIFIED: signup/conversion, idempotency,
-- existing-row authority preservation, verified own read, cross-owner reads,
-- current verification/anonymous/deletion transitions and Auth cascade deletion.
-- Test request claims are SQL context only, never proof of a signed session.

SAVEPOINT profile_candidate_tests;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = pg_catalog, extensions;
SELECT plan(35);

SELECT has_table('public', 'users', 'the isolated profile table exists');
SELECT is((SELECT count(*)::integer FROM pg_attribute
           WHERE attrelid = 'public.users'::regclass AND attnum > 0 AND NOT attisdropped),
          24, 'the table has nineteen observed columns plus five approved additions');
-- Compile-time metadata fixtures copied from the sanitized source catalog:
-- docs/research/shared-profile-catalog-2026-10-21.json (2026-10-21 04:00:53 UTC).
-- These contain no account records. Ordered JSON preserves the nineteen-column
-- source order. Defaults/constraint definitions are compared after whitespace
-- normalization; these particular quoted literals contain no whitespace.
SELECT is(
  (SELECT jsonb_agg(jsonb_build_object(
     'name', a.attname,
     'type', format_type(a.atttypid, a.atttypmod),
     'nullable', CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END,
     'default', regexp_replace(pg_get_expr(d.adbin, d.adrelid), '\s+', '', 'g')
   ) ORDER BY a.attnum)
   FROM pg_attribute AS a LEFT JOIN pg_attrdef AS d
     ON d.adrelid = a.attrelid AND d.adnum = a.attnum
   WHERE a.attrelid = 'public.users'::regclass AND a.attnum BETWEEN 1 AND 19
     AND NOT a.attisdropped),
  (SELECT jsonb_agg(jsonb_build_object(
     'name', fixture.item->>'name', 'type', fixture.item->>'type',
     'nullable', fixture.item->>'nullable',
     'default', regexp_replace(fixture.item->>'default', '\s+', '', 'g')
   ) ORDER BY fixture.position)
   FROM jsonb_array_elements($legacy_columns$
[
  {
    "name": "id",
    "type": "uuid",
    "default": null,
    "nullable": "NO"
  },
  {
    "name": "name",
    "type": "text",
    "default": null,
    "nullable": "NO"
  },
  {
    "name": "email",
    "type": "text",
    "default": null,
    "nullable": "NO"
  },
  {
    "name": "phone",
    "type": "text",
    "default": null,
    "nullable": "YES"
  },
  {
    "name": "college_roll",
    "type": "text",
    "default": null,
    "nullable": "YES"
  },
  {
    "name": "role",
    "type": "text",
    "default": "'student'::text",
    "nullable": "NO"
  },
  {
    "name": "club_id",
    "type": "uuid",
    "default": null,
    "nullable": "YES"
  },
  {
    "name": "xp",
    "type": "integer",
    "default": "0",
    "nullable": "YES"
  },
  {
    "name": "level",
    "type": "integer",
    "default": "1",
    "nullable": "YES"
  },
  {
    "name": "reputation_score",
    "type": "integer",
    "default": "100",
    "nullable": "YES"
  },
  {
    "name": "qr_code_data",
    "type": "text",
    "default": null,
    "nullable": "YES"
  },
  {
    "name": "fcm_token",
    "type": "text",
    "default": null,
    "nullable": "YES"
  },
  {
    "name": "created_at",
    "type": "timestamp with time zone",
    "default": "now()",
    "nullable": "YES"
  },
  {
    "name": "updated_at",
    "type": "timestamp with time zone",
    "default": "now()",
    "nullable": "YES"
  },
  {
    "name": "profile_completed",
    "type": "boolean",
    "default": "false",
    "nullable": "YES"
  },
  {
    "name": "avatar_url",
    "type": "text",
    "default": null,
    "nullable": "YES"
  },
  {
    "name": "is_active",
    "type": "boolean",
    "default": "true",
    "nullable": "YES"
  },
  {
    "name": "ban_reason",
    "type": "text",
    "default": null,
    "nullable": "YES"
  },
  {
    "name": "banned_at",
    "type": "timestamp with time zone",
    "default": null,
    "nullable": "YES"
  }
]
$legacy_columns$::jsonb) WITH ORDINALITY AS fixture(item, position)),
  'all nineteen retained columns match source order, type, nullability and defaults');
SELECT is(
  (SELECT jsonb_agg(jsonb_build_object(
     'name', c.conname,
     'definition', regexp_replace(pg_get_constraintdef(c.oid), '\s+', '', 'g')
   ) ORDER BY c.conname)
   FROM pg_constraint AS c WHERE c.conrelid = 'public.users'::regclass
     AND c.conname NOT IN ('users_study_year_check',
       'users_profile_contract_version_check', 'users_profile_revision_check')),
  (SELECT jsonb_agg(jsonb_build_object(
     'name', fixture.item->>'name',
     'definition', regexp_replace(fixture.item->>'definition', '\s+', '', 'g')
   ) ORDER BY fixture.item->>'name')
   FROM jsonb_array_elements($legacy_constraints$
[
  {
    "name": "users_college_roll_key",
    "definition": "UNIQUE (college_roll)"
  },
  {
    "name": "users_email_key",
    "definition": "UNIQUE (email)"
  },
  {
    "name": "users_id_fkey",
    "definition": "FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE"
  },
  {
    "name": "users_pkey",
    "definition": "PRIMARY KEY (id)"
  },
  {
    "name": "users_qr_code_data_key",
    "definition": "UNIQUE (qr_code_data)"
  },
  {
    "name": "users_role_check",
    "definition": "CHECK ((role = ANY (ARRAY['student'::text, 'lab_admin'::text, 'super_admin'::text])))"
  }
]
$legacy_constraints$::jsonb) AS fixture(item)),
  'exactly the six retained legacy constraint names and definitions match source');
SELECT is(
  (SELECT jsonb_agg(jsonb_build_object(
     'name', c.conname,
     'definition', regexp_replace(pg_get_constraintdef(c.oid), '\s+', '', 'g')
   ) ORDER BY c.conname)
   FROM pg_constraint AS c WHERE c.conrelid = 'public.users'::regclass
     AND c.conname IN ('users_study_year_check',
       'users_profile_contract_version_check', 'users_profile_revision_check')),
  (SELECT jsonb_agg(jsonb_build_object(
     'name', fixture.name,
     'definition', regexp_replace(fixture.definition, '\s+', '', 'g')
   ) ORDER BY fixture.name)
   FROM (VALUES
     ('users_study_year_check', 'CHECK (((study_year >= 1) AND (study_year <= 8)))'),
     ('users_profile_contract_version_check', 'CHECK ((profile_contract_version >= 0))'),
     ('users_profile_revision_check', 'CHECK ((profile_revision >= 0))')
   ) AS fixture(name, definition)),
  'exactly the three added checks constrain study year, contract version and revision');

SELECT ok((SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
           WHERE oid = 'public.users'::regclass), 'owner-select RLS is enabled and forced');
SELECT is((SELECT count(*)::integer FROM pg_policy WHERE polrelid = 'public.users'::regclass),
          1, 'there is exactly one policy and no write policy');
SELECT ok((SELECT polcmd = 'r' AND polroles = ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'authenticated')]
             AND pg_get_expr(polqual, polrelid) LIKE '%auth.uid()%'
             AND pg_get_expr(polqual, polrelid) LIKE '%has_current_verified_email_v1()%'
           FROM pg_policy WHERE polrelid = 'public.users'::regclass),
          'SELECT policy checks current owner and verified identity, including inactive owners');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.users'::regclass AND conname = 'users_id_fkey'
                    AND confrelid = 'auth.users'::regclass AND confdeltype = 'c'),
          'profile ID references real managed Auth with delete cascade');
SELECT ok(EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.users'::regclass AND conname = 'users_college_roll_key' AND contype = 'u'),
          'the observed raw global roll uniqueness remains intact');
SELECT ok(NOT EXISTS (SELECT 1 FROM pg_constraint
                      WHERE conrelid = 'public.users'::regclass AND conname = 'fk_users_club')
          AND to_regclass('public.clubs') IS NULL,
          'club dependency is explicitly omitted rather than fabricated');
SELECT is((SELECT count(*)::integer FROM public.users), 0,
          'no existing identities were fabricated or backfilled into profiles');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_attribute AS a
            WHERE a.attrelid = 'public.users'::regclass AND a.attnum > 0 AND NOT a.attisdropped
              AND has_column_privilege('authenticated', a.attrelid, a.attnum, 'SELECT')
                  IS DISTINCT FROM (a.attname = ANY (ARRAY[
                    'id', 'name', 'phone', 'college_roll', 'institution', 'department',
                    'study_year', 'role', 'is_active', 'profile_completed',
                    'profile_contract_version', 'profile_revision']))
          ), 'authenticated effective column reads equal the twelve-column allowlist');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_attribute AS a
            CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
            WHERE a.attrelid = 'public.users'::regclass AND a.attnum > 0 AND NOT a.attisdropped
              AND (has_column_privilege(r.role_name, a.attrelid, a.attnum, 'INSERT,UPDATE,REFERENCES')
                OR (r.role_name <> 'authenticated' AND has_column_privilege(r.role_name, a.attrelid, a.attnum, 'SELECT')))
          ), 'all API effective column writes and non-member reads are denied');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
            WHERE has_table_privilege(r.role_name, 'public.users',
              'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
          ), 'all effective API table-level grants, including MAINTAIN, are denied');
SELECT has_function('public', 'get_own_profile_v1', ARRAY[]::text[], 'the no-account-ID profile projection exists');
SELECT ok((SELECT NOT prosecdef AND provolatile = 's' AND proconfig = ARRAY['search_path=""']::text[]
           FROM pg_proc WHERE oid = 'public.get_own_profile_v1()'::regprocedure),
          'the profile projection is stable invoker code with empty search path');
SELECT is((SELECT proargnames FROM pg_proc WHERE oid = 'public.get_own_profile_v1()'::regprocedure),
          ARRAY['id', 'name', 'phone', 'college_roll', 'institution', 'department',
                'study_year', 'role', 'is_active', 'profile_completed',
                'profile_contract_version', 'profile_revision']::text[],
          'the projection returns exactly twelve fields and makes no admission claim');
SELECT ok(has_function_privilege('authenticated', 'public.get_own_profile_v1()', 'EXECUTE')
          AND NOT has_function_privilege('anon', 'public.get_own_profile_v1()', 'EXECUTE')
          AND NOT has_function_privilege('service_role', 'public.get_own_profile_v1()', 'EXECUTE'),
          'only authenticated effectively executes the profile RPC');
SELECT ok((SELECT prosecdef AND proconfig = ARRAY['search_path=""']::text[]
             AND pg_get_userbyid(proowner) = 'postgres' AND prorettype = 'trigger'::regtype
           FROM pg_proc WHERE oid = 'idealab_private.provision_mec_profile_v1()'::regprocedure),
          'the privileged trigger function is fixed-path, private and postgres-owned');
SELECT ok(NOT EXISTS (
            SELECT 1 FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
            WHERE has_function_privilege(r.role_name, 'idealab_private.provision_mec_profile_v1()', 'EXECUTE')
          ), 'no API role effectively executes the provisioning function');
SELECT is((SELECT count(*)::integer FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass
           AND NOT tgisinternal AND tgfoid = 'idealab_private.provision_mec_profile_v1()'::regprocedure),
          2, 'there are exactly two Auth provisioning triggers');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass
                  AND tgname = 'mec_profile_after_auth_insert_v1' AND tgtype = 5 AND tgenabled = 'O'),
          'new identity provisioning is an enabled AFTER ROW INSERT trigger');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass
                  AND tgname = 'mec_profile_after_auth_conversion_v1' AND tgtype = 17 AND tgenabled = 'O'
                  AND cardinality(tgattr::smallint[]) = 2
                  AND pg_get_triggerdef(oid) LIKE '%old.is_anonymous IS TRUE%'
                  AND pg_get_triggerdef(oid) LIKE '%new.is_anonymous IS FALSE%'),
          'conversion trigger is restricted to the anonymous-to-email transition');
SELECT ok(has_schema_privilege('authenticated', 'idealab_private', 'USAGE')
          AND NOT has_schema_privilege('authenticated', 'idealab_private', 'CREATE')
          AND NOT has_schema_privilege('anon', 'idealab_private', 'USAGE,CREATE')
          AND NOT has_schema_privilege('service_role', 'idealab_private', 'USAGE,CREATE'),
          'effective private schema privileges remain bounded');

-- Temporary instrumentation grants, reverted to the savepoint below.
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;
DO $clear_claims$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$clear_claims$;
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::integer FROM public.get_own_profile_v1()), 0,
          'missing identity returns no profile and confers no admission');
SELECT throws_ok('SELECT email FROM public.users', '42501', NULL,
                 'legacy account email is outside the direct read boundary');
SELECT throws_ok('SELECT * FROM public.users', '42501', NULL,
                 'SELECT star cannot expand the allowlist');
SELECT throws_ok('UPDATE public.users SET role = ''super_admin''', '42501', NULL,
                 'a member cannot change authority even when no row matches');
SELECT throws_ok('INSERT INTO public.users (id, name, email) VALUES (NULL, '''', '''')', '42501', NULL,
                 'client profile provisioning is denied before constraints');
SELECT throws_ok('DELETE FROM public.users', '42501', NULL, 'client deletion is denied');
SELECT throws_ok('TRUNCATE public.users', '42501', NULL, 'client truncation is denied');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.get_own_profile_v1()', '42501', NULL,
                 'anonymous RPC execution is denied');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok('SELECT * FROM public.get_own_profile_v1()', '42501', NULL,
                 'service-role RPC execution is denied despite RLS bypass');
RESET ROLE;
SELECT ok(NOT EXISTS (
            SELECT 1 FROM pg_proc AS p WHERE p.pronamespace = 'idealab_private'::regnamespace
              AND ((p.oid <> 'idealab_private.has_current_verified_email_v1()'::regprocedure
                    AND has_function_privilege('authenticated', p.oid, 'EXECUTE'))
                OR has_function_privilege('anon', p.oid, 'EXECUTE')
                OR has_function_privilege('service_role', p.oid, 'EXECUTE'))
          ), 'the existing helper remains the only API-callable private routine');
SELECT * FROM finish(true);
ROLLBACK TO SAVEPOINT profile_candidate_tests;
RELEASE SAVEPOINT profile_candidate_tests;
