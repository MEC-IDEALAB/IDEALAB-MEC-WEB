// Called only after db-runtime proves its newly-created loopback cluster identity.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const specs = [
  {
    "table": "events",
    "column": "club_id",
    "fk": "events_club_id_fkey",
    "ref": "clubs",
    "index": "idealab_fk_events_club_id_v1"
  },
  {
    "table": "events",
    "column": "created_by",
    "fk": "events_created_by_fkey",
    "ref": "users",
    "index": "idealab_fk_events_created_by_v1"
  },
  {
    "table": "knowledge_articles",
    "column": "author_id",
    "fk": "knowledge_articles_author_id_fkey",
    "ref": "users",
    "index": "idealab_fk_knowledge_articles_author_id_v1"
  },
  {
    "table": "project_members",
    "column": "user_id",
    "fk": "project_members_user_id_fkey",
    "ref": "users",
    "index": "idealab_fk_project_members_user_id_v1"
  },
  {
    "table": "projects",
    "column": "club_id",
    "fk": "projects_club_id_fkey",
    "ref": "clubs",
    "index": "idealab_fk_projects_club_id_v1"
  },
  {
    "table": "tool_bookings",
    "column": "project_id",
    "fk": "fk_bookings_project",
    "ref": "projects",
    "index": "idealab_fk_tool_bookings_project_id_v1"
  },
  {
    "table": "tool_bookings",
    "column": "approved_by",
    "fk": "tool_bookings_approved_by_fkey",
    "ref": "users",
    "index": "idealab_fk_tool_bookings_approved_by_v1"
  },
  {
    "table": "users",
    "column": "club_id",
    "fk": "fk_users_club",
    "ref": "clubs",
    "index": "idealab_fk_users_club_id_v1"
  }
];
export async function rehearseSharedFkIndexes(sql) {
  const base = new URL('../supabase/validation/', import.meta.url);
  const candidate = await readFile(new URL('shared_fk_indexes_v1_candidate.sql',base),'utf8');
  const rollback = await readFile(new URL('shared_fk_indexes_v1_rollback.sql',base),'utf8');
  const transcript = [];
  const run = async (label, text) => {
    const result = await sql(text);
    transcript.push({ label, stdout: result.stdout.trim(), stderr: result.stderr.trim(), exitCode: 0 });
    return result.stdout.trim();
  };
  const reject = async (label,text,pattern) => {
    let failed = false;
    try { await sql(text); }
    catch(error) {
      const diagnostic = String(error.stderr ?? '');
      assert.match(diagnostic,pattern);
      transcript.push({ label, exitCode: error.code, expectedRejection: diagnostic.trim() });
      failed = true;
    }
    assert(failed, label+' must fail closed');
  };
  // Deliberately minimal synthetic FK topology, not a replay of Grow migrations.
  await run('synthetic baseline', `
    CREATE ROLE phase1_reader NOLOGIN;
    CREATE TABLE public.clubs (id uuid PRIMARY KEY);
    CREATE TABLE public.users (id uuid PRIMARY KEY, club_id uuid CONSTRAINT fk_users_club REFERENCES public.clubs(id));
    CREATE TABLE public.events (id uuid PRIMARY KEY,
      club_id uuid CONSTRAINT events_club_id_fkey REFERENCES public.clubs(id),
      created_by uuid CONSTRAINT events_created_by_fkey REFERENCES public.users(id));
    CREATE TABLE public.knowledge_articles (id uuid PRIMARY KEY,
      author_id uuid CONSTRAINT knowledge_articles_author_id_fkey REFERENCES public.users(id));
    CREATE TABLE public.projects (id uuid PRIMARY KEY,
      club_id uuid CONSTRAINT projects_club_id_fkey REFERENCES public.clubs(id));
    CREATE TABLE public.project_members (id uuid PRIMARY KEY,
      user_id uuid CONSTRAINT project_members_user_id_fkey REFERENCES public.users(id));
    CREATE TABLE public.tool_bookings (id uuid PRIMARY KEY,
      project_id uuid CONSTRAINT fk_bookings_project REFERENCES public.projects(id),
      approved_by uuid CONSTRAINT tool_bookings_approved_by_fkey REFERENCES public.users(id));
    INSERT INTO public.clubs VALUES ('00000000-0000-4000-8000-000000000001');
    INSERT INTO public.users VALUES ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
    CREATE INDEX phase1_unrelated ON public.users(id);
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
    CREATE POLICY own_fixture ON public.users FOR SELECT TO phase1_reader USING (false);
    GRANT SELECT ON public.users TO phase1_reader;
  `);
  const security = async () => run('schema security fingerprint', `SELECT json_build_object(
    'acl',(SELECT json_agg(json_build_array(c.relname,c.relacl,c.relrowsecurity,c.relforcerowsecurity) ORDER BY c.relname)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
    'policies',(SELECT json_agg(row_to_json(p)) FROM pg_policies p WHERE schemaname='public'),
    'constraints',(SELECT json_agg(pg_get_constraintdef(c.oid) ORDER BY c.conname) FROM pg_constraint c
      JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'),
    'users',(SELECT json_agg(row_to_json(u)) FROM public.users u));`);
  const before = await security();
  await reject('missing intent marker', candidate, /explicit reviewed shared-project intent/);
  const intent = "SET idealab.reviewed_project_ref='huftzhfqnnslvnfzvbex';\n";
  await run('create same-name collision', 'CREATE INDEX '+specs[0].index+' ON public.events(id);');
  await reject('wrong index rejected atomically', intent+candidate, /index name\/definition\/ownership collision/);
  await run('remove synthetic collision', 'DROP INDEX public.'+specs[0].index+';');
  await run('remove expected FK', 'ALTER TABLE public.users DROP CONSTRAINT fk_users_club;');
  await reject('missing late FK rolls back earlier creates', intent+candidate, /FK baseline mismatch/);
  assert.equal(await run('no partial indexes', "SELECT count(*) FROM pg_class WHERE relname LIKE 'idealab_fk_%';"), '0');
  await run('restore expected FK', 'ALTER TABLE public.users ADD CONSTRAINT fk_users_club FOREIGN KEY(club_id) REFERENCES public.clubs(id);');
  await run('external covering index fixture', 'CREATE INDEX external_cover ON public.events(club_id);');
  await reject('stale covering-index telemetry', intent+candidate, /covering index already exists/);
  await run('remove external fixture', 'DROP INDEX public.external_cover;');
  await run('first apply',intent+candidate);
  const definitions = await run('eight valid indexes', `SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
    WHERE c.relname LIKE 'idealab_fk_%' AND i.indisvalid AND i.indisready;`);
  assert.equal(definitions,'8');
  await run('idempotent second apply',intent+candidate);
  assert.equal(await security(),before,'Indexes must not change grants, policies, constraints or data');
  await run('tamper ownership marker', 'COMMENT ON INDEX public.'+specs[7].index+" IS 'external ownership';");
  await reject('rollback refuses changed index atomically',intent+rollback,/rollback refuses changed\/unowned index/);
  assert.equal(await run('failed rollback preserves all eight indexes', "SELECT count(*) FROM pg_class WHERE relname LIKE 'idealab_fk_%';"),'8');
  await run('restore synthetic marker', 'COMMENT ON INDEX public.'+specs[7].index+" IS 'IDEALAB shared FK indexes v1; reviewed candidate 2026-11-06';");
  await run('rollback',intent+rollback);
  await run('idempotent second rollback',intent+rollback);
  assert.equal(await run('candidate indexes absent', "SELECT count(*) FROM pg_class WHERE relname LIKE 'idealab_fk_%';"),'0');
  assert.equal(await run('unrelated index retained', "SELECT to_regclass('public.phase1_unrelated') IS NOT NULL;"),'t');
  assert.equal(await security(),before);
  return { verificationLevel:'Disposable PostgreSQL synthetic topology; not a full shared schema restore or performance benchmark.',
    candidateSha256:createHash('sha256').update(candidate).digest('hex'),
    rollbackSha256:createHash('sha256').update(rollback).digest('hex'),
    checks:{freshApply:true,idempotentApply:true,idempotentRollback:true,ownershipGuard:true,
      wrongBaselineGuard:true,nameCollisionGuard:true,staleTelemetryGuard:true,atomicFailure:true,
      unrelatedIndexesPreserved:true,grantsRlsConstraintsAndRowsUnchanged:true},transcript };
}
