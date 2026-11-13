import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = text => createHash('sha256').update(text).digest('hex');
const sortBy = (rows, fields) => [...rows].sort((a, b) => fields.map(field => a[field]).join('/').localeCompare(fields.map(field => b[field]).join('/')));
const metadataQuery = `SELECT jsonb_build_object(
  'rls',(SELECT jsonb_build_object('enabled',relrowsecurity,'forced',relforcerowsecurity) FROM pg_class WHERE oid='public.users'::regclass),
  'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
    'default',pg_get_expr(d.adbin,d.adrelid),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid='public.users'::regclass AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid)) ORDER BY conname) FROM pg_constraint WHERE conrelid='public.users'::regclass),
  'indexes',(SELECT jsonb_agg(pg_get_indexdef(indexrelid) ORDER BY indexrelid::regclass::text) FROM pg_index WHERE indrelid='public.users'::regclass),
  'policies',coalesce((SELECT jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,
    'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END) FROM unnest(p.polroles) r),
    'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname)
    FROM pg_policy p WHERE p.polrelid='public.users'::regclass),'[]'::jsonb),
  'table_acl',coalesce((SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable)
    ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM pg_class c,LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid='public.users'::regclass),'[]'::jsonb),
  'column_acl',coalesce((SELECT jsonb_agg(jsonb_build_object('column',c.attname,'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable)
    ORDER BY c.attname,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM pg_attribute c,LATERAL aclexplode(c.attacl) a WHERE c.attrelid='public.users'::regclass AND c.attnum>0 AND NOT c.attisdropped),'[]'::jsonb)) metadata`;

export async function rehearsePreprofileMetadata(sql, { fixture, migration, rollback, rollbackChecks, catalogText }) {
  const captured = JSON.parse(catalogText);
  assert.equal(captured.columns.length, 19);
  assert.equal(captured.constraints.length, 7);
  assert.equal(captured.policies.length, 4);
  const expected = Object.fromEntries(['rls','columns','constraints','indexes','policies','table_acl','column_acl'].map(key => [key,captured[key]]));
  expected.constraints = sortBy(expected.constraints, ['name']);
  expected.indexes = [...expected.indexes].sort();
  expected.policies = sortBy(expected.policies.map(row => ({ ...row, roles: [...row.roles].sort() })), ['name']);
  expected.table_acl = sortBy(expected.table_acl, ['grantee','privilege']);
  expected.column_acl = sortBy(expected.column_acl, ['column','grantee','privilege']);
  // Metadata is data, never text interpolated into a dollar-quoted DO body.
  const expectedHex = Buffer.from(JSON.stringify(expected), 'utf8').toString('hex');
  const result = await sql(`BEGIN;
    ${fixture}
    REVOKE TRUNCATE,TRIGGER,REFERENCES,MAINTAIN ON public.users FROM anon,authenticated;
    CREATE TEMP TABLE preprofile_metadata_before AS ${metadataQuery};
    CREATE TEMP TABLE preprofile_metadata_expected AS
      SELECT convert_from(decode('${expectedHex}','hex'),'UTF8')::jsonb metadata;
    DO $compare$ BEGIN
      IF (SELECT metadata FROM preprofile_metadata_before) IS DISTINCT FROM (SELECT metadata FROM preprofile_metadata_expected) THEN
        RAISE EXCEPTION 'Users preprofile metadata does not match captured metadata; no forward or rollback rehearsal attempted';
      END IF;
    END $compare$;
    SET LOCAL idealab.profile_rollback_maintenance='clients_offline';
    SET LOCAL idealab.profile_rollback_provenance='reviewed-local-fixture';
    SET LOCAL idealab.profile_rollback_action='capture';
    ${rollback}
    ${migration}
    SET LOCAL idealab.profile_rollback_check_phase='installed';
    ${rollbackChecks}
    SET LOCAL idealab.profile_rollback_action='rollback';
    ${rollback}
    SET LOCAL idealab.profile_rollback_check_phase='restored';
    ${rollbackChecks}
    CREATE TEMP TABLE preprofile_metadata_after AS ${metadataQuery};
    SELECT json_build_object(
      'capturedMetadataMatch',(SELECT metadata FROM preprofile_metadata_before)=(SELECT metadata FROM preprofile_metadata_expected),
      'restoredMetadataMatch',(SELECT metadata FROM preprofile_metadata_after)=(SELECT metadata FROM preprofile_metadata_before),
      'restoredMetadata',(SELECT metadata FROM preprofile_metadata_after),
      'syntheticUserAndSelectedAuthFingerprintsPreserved',(SELECT
        md5(coalesce((SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM public.users u),'[]'::jsonb)::text)=snapshot->>'users_fingerprint'
        AND md5(coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'email',email,
          'confirmed',email_confirmed_at,'anonymous',is_anonymous) ORDER BY id) FROM auth.users),'[]'::jsonb)::text)=snapshot->>'auth_fingerprint'
        FROM pg_temp.idealab_profile_v1_original_snapshot));
    ROLLBACK;`);
  const output = result.stdout.trim().split(/\r?\n/);
  assert.equal(output.shift(), 't', 'Unchanged fixture must report readiness.');
  assert.equal(output.shift(), 'installed|t', 'Canonical rollback checks must confirm the installed phase.');
  assert.equal(output.shift(), 'restored|t', 'Canonical rollback checks must confirm the restored phase.');
  const observed = JSON.parse(output.join('\n'));
  assert(observed.capturedMetadataMatch, 'All captured preprofile metadata fields must match.');
  assert(observed.restoredMetadataMatch, 'Rollback must restore all compared metadata.');
  assert(observed.syntheticUserAndSelectedAuthFingerprintsPreserved, 'Synthetic user and selected Auth fingerprints must be preserved.');
  return { sources: {
    fixtureSha256: hash(fixture), canonicalMigrationSha256: hash(migration),
    rollbackSha256: hash(rollback), rollbackChecksSha256: hash(rollbackChecks),
    capturedCatalogSha256: hash(catalogText),
  }, modeledPriorHardening: 'REVOKE TRUNCATE,TRIGGER,REFERENCES,MAINTAIN ON public.users FROM anon,authenticated, in the disposable fixture only',
  ...observed,
  limits: 'Users-table preprofile metadata and pristine same-session maintenance forward/rollback rehearsal on synthetic rows only. The canonical rollback checks compare fingerprints inside PostgreSQL; row values and fingerprints are not output. Does not establish the full nineteen-table baseline, deployment provenance, live Auth/provider behavior, Flutter compatibility or authorization for any production rollback.' };
}

export async function verifyPreprofileDelimiterRegression(sql, sources) {
  const harmlessMismatch = JSON.parse(sources.catalogText);
  harmlessMismatch.columns[0].default = '$compare$';
  await assert.rejects(() => rehearsePreprofileMetadata(sql, {
    ...sources, catalogText: JSON.stringify(harmlessMismatch),
  }), error => error.code === 3
    && String(error.stderr).includes('Users preprofile metadata does not match captured metadata; no forward or rollback rehearsal attempted')
    && !/syntax error/i.test(String(error.stderr)),
  'A dollar-quote delimiter in metadata must reach the intended metadata mismatch guard.');
  const rollback = await sql(`SELECT to_regnamespace('auth') IS NULL
    AND to_regnamespace('idealab_private') IS NULL
    AND to_regclass('public.users') IS NULL
    AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role'));`);
  assert.equal(rollback.stdout.trim(), 't', 'The rejected connection must roll back fixture objects and roles.');
  return { metadataDelimiterRejectedByMismatchGuard: true, failedConnectionFixtureRolledBack: true,
    scope: 'Harmless $compare$ string in a cloned captured default. Expected mismatch only; no injected SQL is executed.' };
}
