// Isolated native PostgreSQL runtime smoke check. Never accepts a database URL,
// existing data directory, application SQL or production credentials.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access, appendFile, mkdir, mkdtemp, readFile, realpath, rm, rmdir, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { checkStaffScopeConcurrency } from './staff-scope-concurrency.mjs';
import { checkEventDraftConcurrency } from './event-drafts-concurrency.mjs';
import { checkProjectAdmissionConcurrency } from './project-admission-concurrency.mjs';
import { compareProfileEcosystem } from './profile-ecosystem-parity.mjs';
import { compareSharedProfileFunctions } from './shared-profile-function-parity.mjs';
import { rehearsePreprofileMetadata, verifyPreprofileDelimiterRegression } from './preprofile-metadata-rehearsal.mjs';
import { rehearseSharedFkIndexes } from './shared-fk-index-rehearsal.mjs';

const execute = promisify(execFile);
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use the project\'s Node 24 runtime.');
const rehearsalModes = ['--maker-publication', '--shared-fk-indexes', '--recovery-consumption', '--preprofile-metadata-rehearsal', '--shared-profile-function-parity', '--default-acl-probe', '--profile-ecosystem-parity', '--project-admission', '--shared-ledger-replay', '--restore-drill', '--staff-scope', '--staff-scope-shared', '--lab-presence', '--event-drafts', '--lab-opening'].filter(mode => process.argv.includes(mode));
assert(rehearsalModes.length <= 1, 'Run each schema rehearsal in its own disposable cluster.');
const project = await realpath(fileURLToPath(new URL('../', import.meta.url)));

// Exercises Lab close/open serialization only inside db-runtime's disposable
// cluster. The IDs refer only to synthetic shared-profile fixtures.
async function checkLabOpeningConcurrency(sql) {
  const coreA = '00000000-0000-4000-8000-000000000006';
  const coreB = '00000000-0000-4000-8000-000000000005';
  const visitor = '00000000-0000-4000-8000-000000000001';
  const marker = 'lab-close-race-' + randomBytes(8).toString('hex');
  const tag = 'lab_opening_' + randomBytes(6).toString('hex');
  const uuid = () => {
    const value = randomBytes(16).toString('hex');
    return value.slice(0, 8) + '-' + value.slice(8, 12) + '-4' + value.slice(13, 16)
      + '-a' + value.slice(17, 20) + '-' + value.slice(20);
  };
  const transaction = (actor, application, body) => [
    'BEGIN;',
    "SET LOCAL statement_timeout='10s';",
    "SET LOCAL lock_timeout='8s';",
    "SET LOCAL application_name='" + application + "';",
    'SET LOCAL ROLE authenticated;',
    "SELECT set_config('request.jwt.claim.sub','" + actor + "',true);",
    body,
    'COMMIT;',
  ].join('\n');
  const observe = request => request.then(
    value => ({ ok: true, value }),
    error => ({ ok: false, error }),
  );
  async function waitForSession(application, waitType) {
    for (let attempt = 0; attempt < 160; attempt++) {
      const result = await sql("SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE application_name='"
        + application + "' AND state='active' AND wait_event_type='" + waitType + "');");
      if (result.stdout.trim() === 't') return;
      await delay(25);
    }
    assert.fail('Did not observe Lab operation waiting on ' + waitType);
  }
  async function settleTogether(pending) {
    const results = await Promise.all(pending);
    for (const result of results) if (!result.ok) throw result.error;
  }

  await sql([
    "INSERT INTO idealab_private.lab_opening_permissions_v1(user_id,duty_label,grant_reason,is_active)",
    "VALUES ('" + coreA + "','Synthetic core A','Disposable concurrency test',true),",
    "       ('" + coreB + "','Synthetic core B','Disposable concurrency test',true)",
    'ON CONFLICT(user_id) DO UPDATE SET duty_label=EXCLUDED.duty_label,',
    '  grant_reason=EXCLUDED.grant_reason,is_active=true;',
    'BEGIN;',
    'SET LOCAL ROLE authenticated;',
    "SELECT set_config('request.jwt.claim.sub','" + coreA + "',true);",
    'DO $open_setup$',
    'DECLARE state jsonb; result jsonb;',
    'BEGIN',
    '  state:=public.get_lab_opening_v1();',
    "  IF state->>'status'<>'open' THEN",
    "    result:=public.set_lab_opening_v1('open',state->>'revision',gen_random_uuid());",
    "    IF result->>'status'<>'applied' THEN RAISE EXCEPTION 'Could not prepare the disposable Lab as open'; END IF;",
    '  END IF;',
    'END $open_setup$;',
    'COMMIT;',
    "INSERT INTO public.lab_sessions(user_id,checkin_time,checkout_time,purpose,created_at)",
    "VALUES ('" + coreA + "',clock_timestamp()-interval '20 minutes',NULL,'" + marker + ":core',clock_timestamp()),",
    "       ('" + visitor + "',clock_timestamp()-interval '12 minutes',NULL,'" + marker + ":visitor',clock_timestamp());",
  ].join('\n'));

  const closeApp = tag + '_close';
  const checkinApp = tag + '_checkin';
  const closeBody = [
    'DO $close$',
    'DECLARE state jsonb; result jsonb;',
    'BEGIN',
    '  state:=public.get_lab_opening_v1();',
    "  result:=public.set_lab_opening_v1('close',state->>'revision','" + uuid() + "'::uuid);",
    "  IF result->>'status'<>'applied' THEN RAISE EXCEPTION 'Core close did not apply'; END IF;",
    '  PERFORM pg_sleep(3);',
    'END $close$;',
  ].join('\n');
  const closing = observe(sql(transaction(coreA, closeApp, closeBody)));
  let checkin;
  try {
    await waitForSession(closeApp, 'Timeout');
    const checkinBody = [
      'DO $checkin$',
      'DECLARE result jsonb;',
      'BEGIN',
      "  result:=public.check_in_lab_v1('Concurrent close fixture',gen_random_uuid());",
      "  IF result->>'status'<>'closed' THEN RAISE EXCEPTION 'Check-in passed a serialized Lab closure'; END IF;",
      'END $checkin$;',
    ].join('\n');
    checkin = observe(sql(transaction(coreB, checkinApp, checkinBody)));
    await waitForSession(checkinApp, 'Lock');
  } finally {
    await settleTogether([closing, ...(checkin ? [checkin] : [])]);
  }
  const closed = JSON.parse((await sql([
    'SELECT json_build_object(',
    "  'active',count(*) FILTER (WHERE s.checkout_time IS NULL),",
    "  'closed_at_match',count(*) FILTER (WHERE s.checkout_time=c.occurred_at),",
    "  'closure_events',count(DISTINCT c.revision))",
    'FROM public.lab_sessions s',
    'CROSS JOIN LATERAL (SELECT revision,occurred_at FROM idealab_private.lab_opening_changes_v1',
    "  WHERE action='close' ORDER BY revision DESC LIMIT 1) c",
    "WHERE s.purpose IN ('" + marker + ":core','" + marker + ":visitor');",
  ].join('\n'))).stdout);
  assert.deepEqual(closed, { active: 0, closed_at_match: 2, closure_events: 1 },
    'Lab closure checks out active sessions at its recorded time before a queued check-in proceeds.');
  const closedVisitId = (await sql("SELECT id::text FROM public.lab_sessions WHERE purpose='" + marker + ":core';")).stdout.trim();
  await sql(transaction(coreA, tag + '_close_first_checkout', [
    'DO $checkout$',
    'DECLARE result jsonb;',
    'BEGIN',
    "  result:=public.check_out_lab_v1('" + closedVisitId + "'::uuid,gen_random_uuid());",
    "  IF result->>'status'<>'already_out' THEN RAISE EXCEPTION 'Close-first checkout did not return the recorded closure'; END IF;",
    'END $checkout$;',
  ].join('\n')));
  assert.equal((await sql("SELECT s.checkout_time=c.occurred_at FROM public.lab_sessions s JOIN idealab_private.lab_opening_changes_v1 c ON c.action='close' AND c.revision=(SELECT max(revision) FROM idealab_private.lab_opening_changes_v1 WHERE action='close') WHERE s.id='" + closedVisitId + "';")).stdout.trim(),
    't', 'A close-first manual checkout returns the server-recorded closure time without overwriting it.');

  // Two active core members may race to open. The state row lock and expected
  // revision permit one opening event and reject the stale caller.
  const closeRevision = (await sql(
    'SELECT revision::text FROM idealab_private.lab_opening_state_v1 WHERE singleton=1;')).stdout.trim();
  const openApp = tag + '_open_a';
  const openBodyA = [
    'DO $open$',
    'DECLARE result jsonb;',
    'BEGIN',
    "  result:=public.set_lab_opening_v1('open','" + closeRevision + "','" + uuid() + "'::uuid);",
    "  IF result->>'status'<>'applied' THEN RAISE EXCEPTION 'First core open did not apply'; END IF;",
    '  PERFORM pg_sleep(3);',
    'END $open$;',
  ].join('\n');
  const openA = observe(sql(transaction(coreA, openApp, openBodyA)));
  let openB;
  try {
    await waitForSession(openApp, 'Timeout');
    const openBodyB = [
      'DO $open$',
      'DECLARE result jsonb;',
      'BEGIN',
      "  result:=public.set_lab_opening_v1('open','" + closeRevision + "','" + uuid() + "'::uuid);",
      "  IF result->>'status'<>'conflict' THEN RAISE EXCEPTION 'Stale concurrent core open was not rejected'; END IF;",
      'END $open$;',
    ].join('\n');
    openB = observe(sql(transaction(coreB, tag + '_open_b', openBodyB)));
    await waitForSession(tag + '_open_b', 'Lock');
  } finally {
    await settleTogether([openA, ...(openB ? [openB] : [])]);
  }
  const openCount = (await sql('SELECT count(*) FROM idealab_private.lab_opening_changes_v1 WHERE action=\'open\' AND revision>'
    + closeRevision + ';')).stdout.trim();
  assert.equal(openCount, '1', 'Only one event is recorded when two core members race to open the Lab.');

  const checkoutFirstPurpose = marker + ':checkout-first';
  await sql("INSERT INTO public.lab_sessions(user_id,checkin_time,checkout_time,purpose,created_at) VALUES ('"
    + coreB + "',clock_timestamp()-interval '10 minutes',NULL,'" + checkoutFirstPurpose + "',clock_timestamp());");
  const checkoutFirstVisit = (await sql("SELECT id::text FROM public.lab_sessions WHERE purpose='" + checkoutFirstPurpose + "';")).stdout.trim();
  const checkoutApp = tag + '_checkout_first';
  const checkoutBody = [
    'DO $checkout$',
    'DECLARE result jsonb;',
    'BEGIN',
    "  result:=public.check_out_lab_v1('" + checkoutFirstVisit + "'::uuid,gen_random_uuid());",
    "  IF result->>'status'<>'checked_out' THEN RAISE EXCEPTION 'Checkout-first action did not apply'; END IF;",
    '  PERFORM pg_sleep(3);',
    'END $checkout$;',
  ].join('\n');
  const checkout = observe(sql(transaction(coreB, checkoutApp, checkoutBody)));
  let checkoutRaceClose;
  try {
    await waitForSession(checkoutApp, 'Timeout');
    const closeBody = [
      'DO $close$',
      'DECLARE state jsonb; result jsonb;',
      'BEGIN',
      '  state:=public.get_lab_opening_v1();',
      "  result:=public.set_lab_opening_v1('close',state->>'revision','" + uuid() + "'::uuid);",
      "  IF result->>'status'<>'applied' THEN RAISE EXCEPTION 'Close after completed checkout did not apply'; END IF;",
      'END $close$;',
    ].join('\n');
    checkoutRaceClose = observe(sql(transaction(coreA, tag + '_after_checkout_close', closeBody)));
    await waitForSession(tag + '_after_checkout_close', 'Lock');
  } finally {
    await settleTogether([checkout, ...(checkoutRaceClose ? [checkoutRaceClose] : [])]);
  }
  assert.equal((await sql("SELECT s.checkout_time<c.occurred_at AND s.checkout_time IS NOT NULL FROM public.lab_sessions s JOIN idealab_private.lab_opening_changes_v1 c ON c.action='close' AND c.revision=(SELECT max(revision) FROM idealab_private.lab_opening_changes_v1 WHERE action='close') WHERE s.id='" + checkoutFirstVisit + "';")).stdout.trim(),
    't', 'A checkout-first action linearizes before closure and retains its own earlier time.');
  await sql([
    'DELETE FROM idealab_private.own_visit_commands_v1 AS command',
    'USING public.lab_sessions AS session',
    "WHERE command.result_visit_id=session.id AND session.purpose IN ('" + marker + ":core','" + marker + ":visitor','" + checkoutFirstPurpose + "');",
    "DELETE FROM public.lab_sessions WHERE purpose IN ('" + marker + ":core','" + marker + ":visitor','" + checkoutFirstPurpose + "');",
  ].join('\n'));
}
const bin = process.env.IDEALAB_PG_BIN;
assert(bin && isAbsolute(bin), 'Set IDEALAB_PG_BIN to an existing absolute PostgreSQL bin directory. Nothing is installed automatically.');
const executable = name => join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
for (const name of ['postgres', 'initdb', 'pg_ctl', 'psql']) await access(executable(name));

// Do not inherit connection targets, service files, options or credentials.
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('PG')));
environment.PGCONNECT_TIMEOUT = '5';
environment.PGSSLMODE = 'disable'; // Only this process's loopback scratch cluster.
const controller = new AbortController();
const interrupt = () => controller.abort();
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
const run = (name, args, options = {}) => execute(executable(name), args, {
  env: environment, encoding: 'utf8', windowsHide: true, timeout: 25000,
  maxBuffer: 1024 * 1024, signal: controller.signal, ...options,
});
const version = (await run('postgres', ['--version'])).stdout.trim();
assert(Number(version.match(/PostgreSQL\) (\d+)/)?.[1]) >= 16, 'PostgreSQL 16 or newer is required for this smoke check.');

const artifacts = resolve(project, 'artifacts');
await mkdir(artifacts, { recursive: true });
const artifactsReal = await realpath(artifacts);
const artifactLocation = relative(project, artifactsReal);
assert(artifactLocation && !artifactLocation.startsWith('..') && !isAbsolute(artifactLocation), 'Artifact parent must stay inside the website workspace.');
const evidenceRoot = resolve(artifactsReal, 'database-runtime');
await mkdir(evidenceRoot, { recursive: true });
const evidenceReal = await realpath(evidenceRoot);
const outside = relative(project, evidenceReal);
assert(outside && !outside.startsWith('..') && !isAbsolute(outside), 'Evidence must stay inside the website workspace.');
const clusterRoot = await mkdtemp(join(evidenceReal, 'cluster-'));
const clusterReal = await realpath(clusterRoot);
if (process.platform === 'win32') {
  try {
    const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', join(project, 'scripts', 'db-runtime-acl.ps1'), '-Path', clusterReal], { env: environment, windowsHide: true, encoding: 'utf8', timeout: 15000 });
    assert.equal(JSON.parse(stdout).aclProtected, true, 'Password files require a verified private Windows directory.');
  } catch {
    assert.equal(await realpath(clusterRoot), clusterReal);
    assert.equal(dirname(clusterReal), evidenceReal);
    await rmdir(clusterReal); // Only removes an empty directory; no credentials exist yet.
    throw new Error('Private Windows scratch directory could not be verified; the empty run directory was removed.');
  }
}
const marker = randomBytes(24).toString('hex');
const markerPath = join(clusterReal, '.idealab-owned');
const data = join(clusterReal, 'data');
const bootstrapPassword = join(clusterReal, 'bootstrap-password');
const passfile = join(clusterReal, 'client-password');
const wrongPassfile = join(clusterReal, 'wrong-password');
const username = 'idealab_probe_' + randomBytes(8).toString('hex');
const password = randomBytes(36).toString('base64url');
const summary = { capturedAt: new Date().toISOString(), nodeVersion: process.version, version, scope: 'Native PostgreSQL runtime only; no application schema, Supabase Auth, Data API or shared project accessed.', checks: { privateScratchDirectory: true } };
await writeFile(markerPath, marker, { flag: 'wx', mode: 0o600 });
let started = false;
let initialized = false;
let failure;
let stage = 'initialization';

try {
  await writeFile(bootstrapPassword, password + '\n', { flag: 'wx', mode: 0o600 });
  await run('initdb', ['--pgdata', data, '--username', username, '--pwfile', bootstrapPassword, '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--locale=C', '--encoding=UTF8', '--no-instructions']);
  initialized = true;
  await unlink(bootstrapPassword);
  const reservation = createServer();
  await new Promise((accept, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', accept); });
  const port = reservation.address().port;
  await new Promise((accept, reject) => reservation.close(error => error ? reject(error) : accept()));
  await appendFile(join(data, 'postgresql.auto.conf'), `\nlisten_addresses = '127.0.0.1'\nport = ${port}\nunix_socket_directories = ''\nlog_statement = 'none'\n`);
  await writeFile(passfile, `127.0.0.1:${port}:postgres:${username}:${password}\n`, { flag: 'wx', mode: 0o600 });
  await writeFile(wrongPassfile, `127.0.0.1:${port}:postgres:${username}:${randomBytes(36).toString('base64url')}\n`, { flag: 'wx', mode: 0o600 });
  stage = 'start';
  await run('pg_ctl', ['start', '--pgdata', data, '--log', join(clusterReal, 'server.log'), '--wait', '--timeout=20']);
  started = true;
  const args = ['--no-psqlrc', '--no-password', '--quiet', '--no-align', '--tuples-only', '--host=127.0.0.1', '--port', String(port), '--username', username, '--dbname=postgres', '--set=ON_ERROR_STOP=1'];
  const sql = async (command, passwordFile = passfile) => {
    // Windows command lines have a small size limit. Keep longer synthetic
    // rehearsals in this process-owned directory, removed with the cluster.
    const options = { env: { ...environment, PGPASSFILE: passwordFile } };
    if (command.length < 8000) return run('psql', [...args, '--command', command], options);
    const input = join(clusterReal, `probe-${randomBytes(8).toString('hex')}.sql`);
    await writeFile(input, command, { flag: 'wx', mode: 0o600 });
    return run('psql', [...args, '--file', input], options);
  };
  stage = 'identity';
  const identity = JSON.parse((await sql("select json_build_object('data',current_setting('data_directory'),'host',host(inet_server_addr()),'port',inet_server_port(),'encoding',current_setting('server_encoding'),'locale',(select datcollate from pg_database where datname=current_database()),'version',current_setting('server_version'))")).stdout);
  assert.equal(await realpath(identity.data), await realpath(data), 'Connected only to this run\'s fresh data directory.');
  assert.equal(identity.host, '127.0.0.1');
  assert.equal(identity.port, port);
  assert.equal(identity.encoding, 'UTF8');
  summary.checks.isolatedIdentity = true;
  summary.database = { version: identity.version, encoding: identity.encoding, locale: identity.locale };
  stage = 'wrong-credential';
  let rejected = false;
  try { await sql('select 1', wrongPassfile); }
  catch (error) { rejected = /password authentication failed/i.test(error.stderr ?? ''); }
  assert(rejected, 'The isolated TCP listener must reject the wrong credential.');
  summary.checks.wrongCredentialDenied = true;
  stage = 'transaction';
  const transaction = (await sql('begin; create temporary table idealab_runtime_probe(value integer); insert into idealab_runtime_probe values (19),(23); select sum(value) from idealab_runtime_probe; rollback; select to_regclass(\'pg_temp.idealab_runtime_probe\') is null;')).stdout.trim();
  assert.equal(transaction.replaceAll('\r', ''), '42\nt', 'Real SQL runs and the temporary table creation rolls back.');
  summary.checks.transactionRollback = true;
  if (process.argv.includes('--maker-publication')) {
    stage = 'maker-publication';
    assert.equal(Number(identity.version.split('.')[0]), 17, 'Maker profile rehearsal requires PostgreSQL 17.');
    const grow = await realpath(resolve(project, '../Grow'));
    const sqlSources = await Promise.all([
      readFile(join(grow, 'supabase/tests/shared_profile_contract_v1_fixture.sql'), 'utf8'),
      readFile(join(grow, 'supabase/migrations/20261102130200_shared_profile_contract_v1.sql'), 'utf8'),
      readFile(new URL('../supabase/validation/mec_maker_publication_candidate.sql', import.meta.url), 'utf8'),
      readFile(new URL('../supabase/tests/database/mec_maker_publication.test.sql', import.meta.url), 'utf8'),
    ]);
    await sql(['BEGIN; SET LOCAL plpgsql.check_asserts = on;', ...sqlSources, 'ROLLBACK;'].join('\n'));
    assert.equal((await sql("SELECT to_regnamespace('idealab_private') IS NULL AND to_regnamespace('auth') IS NULL")).stdout.trim(), 't');
    summary.scope = 'Disposable PostgreSQL with synthetic accounts, maker draft/publication transitions and legacy row sentinel.';
    summary.checks.makerPublicationTransitions = true;
    summary.checks.makerPublicationFixtureRolledBack = true;

    await sql(['BEGIN;', ...sqlSources.slice(0, 3), 'COMMIT;'].join('\n'));
    const actor = '00000000-0000-4000-8000-000000000005';
    const draft = '{"display_name":"Race fixture","bio":"Race fixture","interests":["Art"],"skills":[],"links":[]}';
    const command = async (body) => JSON.parse((await sql(
      "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='" + actor + "';" + body + 'COMMIT;'
    )).stdout.trim());
    assert.equal((await command("SELECT public.mutate_maker_profile_v1('save_draft','0','" + draft + "'::jsonb);")).revision, '1');
    const publish = "SELECT public.mutate_maker_profile_v1('publish','1');";
    const results = await Promise.all([command(publish), command(publish)]);
    assert.deepEqual(results.map(result => result.status).sort(), ['conflict', 'saved']);
    assert.equal((await sql('SELECT count(*) FROM idealab_private.maker_publication_history_v1;')).stdout.trim(), '1');
    summary.checks.concurrentPublishCreatesOneTransition = true;
  }
  if (process.argv.includes('--shared-fk-indexes')) {
    stage = 'shared-fk-indexes';
    summary.sharedFkIndexes = await rehearseSharedFkIndexes(sql);
    summary.scope = 'Disposable synthetic FK index forward/idempotence/rollback rehearsal. No shared database writes.';
  }
  if (process.argv.includes('--preprofile-metadata-rehearsal')) {
    stage = 'preprofile-metadata-rehearsal';
    assert.equal(Number(identity.version.split('.')[0]), 17, 'Preprofile metadata rehearsal requires PostgreSQL 17.');
    const grow = await realpath(resolve(project, '../Grow'));
    const [fixture, migration, rollback, rollbackChecks, catalogText] = await Promise.all([
      readFile(join(grow, 'supabase/tests/shared_profile_contract_v1_fixture.sql'), 'utf8'),
      readFile(join(grow, 'supabase/migrations/20261102130200_shared_profile_contract_v1.sql'), 'utf8'),
      readFile(join(grow, 'supabase/candidates/shared_profile_contract_v1_rollback.sql'), 'utf8'),
      readFile(join(grow, 'supabase/tests/shared_profile_contract_v1_rollback_checks.sql'), 'utf8'),
      readFile(join(project, 'docs/research/shared-preprofile-metadata-2026-11-04.json'), 'utf8'),
    ]);
    const sources = { fixture, migration, rollback, rollbackChecks, catalogText };
    summary.preprofileDelimiterRegression = await verifyPreprofileDelimiterRegression(sql, sources);
    summary.preprofileMetadata = await rehearsePreprofileMetadata(sql, sources);
    const revision = await execute('git', ['-C', grow, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    summary.preprofileMetadata.growCommit = revision.stdout.trim();
    assert.equal((await sql("SELECT to_regnamespace('idealab_private') IS NULL AND to_regnamespace('auth') IS NULL")).stdout.trim(), 't');
    summary.scope = 'Disposable PG17 users-table preprofile metadata, canonical forward and pristine same-session rollback on synthetic identities only.';
    summary.checks.preprofileCapturedMetadataMatch = true;
    summary.checks.preprofileForwardAndPristineRollback = true;
    summary.checks.preprofileRestoredMetadataMatch = true;
    summary.checks.preprofileSyntheticFingerprintsPreserved = true;
    summary.checks.preprofileFixtureRolledBack = true;
  }
  if (process.argv.includes('--shared-profile-function-parity')) {
    stage = 'shared-profile-function-parity';
    assert.equal(Number(identity.version.split('.')[0]), 17, 'The shared profile function comparison requires PostgreSQL 17.');
    const grow = await realpath(resolve(project, '../Grow'));
    const [fixture, migration, catalogText] = await Promise.all([
      readFile(join(grow, 'supabase/tests/shared_profile_contract_v1_fixture.sql'), 'utf8'),
      readFile(join(grow, 'supabase/migrations/20261102130200_shared_profile_contract_v1.sql'), 'utf8'),
      readFile(join(project, 'docs/research/shared-function-fingerprints-2026-11-04.json'), 'utf8'),
    ]);
    summary.sharedProfileFunctions = await compareSharedProfileFunctions(sql, fixture, migration, catalogText);
    const growRevision = await execute('git', ['-C', grow, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
    summary.sharedProfileFunctions.growCommit = growRevision.stdout.trim();
    assert.equal((await sql("SELECT to_regnamespace('idealab_private') IS NULL AND to_regnamespace('auth') IS NULL")).stdout.trim(), 't');
    summary.scope = 'Disposable PG17 exact shared-profile function metadata comparison on synthetic fixture. No live database, provider or member data accessed.';
    assert(summary.sharedProfileFunctions.capturedMetadataMatch, 'Targeted shared-profile function descriptors must match the captured catalog.');
    summary.checks.sharedProfileFunctionComparisonCompleted = true;
    summary.checks.sharedProfileFunctionCapturedMetadataMatch = summary.sharedProfileFunctions.capturedMetadataMatch;
    summary.checks.sharedProfileFunctionFixtureRolledBack = true;
  }
  if (process.argv.includes('--recovery-consumption')) {
    stage = 'recovery-consumption';
    const [fixture, candidate, rollback] = await Promise.all([
      '../supabase/tests/database/mec_recovery_consumption.test.sql',
      '../supabase/validation/mec_recovery_consumption_candidate.sql',
      '../supabase/validation/mec_recovery_consumption_rollback.sql',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
    const parts = fixture.split('-- INSTALL VALIDATION CANDIDATE HERE');
    assert.equal(parts.length, 2, 'Recovery fixture must have one installation point.');
    await assert.rejects(sql(parts[0] + `
      RESET ROLE;
      REVOKE USAGE ON SCHEMA idealab_private FROM authenticated;
      SET LOCAL ROLE recovery_fixture_owner;
    ` + candidate), error => error.stderr?.includes(
      'Recovery candidate requires authenticated private schema usage'));
    summary.checks.recoveryPrivateSchemaUsagePreflightDenied = true;
    await assert.rejects(sql(parts[0] + `
      RESET ROLE;
      REVOKE UPDATE ON auth.sessions FROM recovery_fixture_owner;
      SET LOCAL ROLE recovery_fixture_owner;
    ` + candidate), error => error.stderr?.includes(
      'Recovery candidate owner cannot lock the required Auth relation: auth.sessions'));
    summary.checks.recoveryOwnerPreflightDeniedMissingGrant = true;
    await sql(parts.join(candidate));
    assert.equal((await sql("SELECT to_regnamespace('auth') IS NULL AND to_regprocedure('public.consume_recovery_session_v1(uuid,uuid)') IS NULL")).stdout.trim(), 't');
    // A second fixture instance lives only until this scratch cluster is removed.
    await sql(parts[0] + candidate + '\nCOMMIT;');
    await sql('BEGIN; SET LOCAL ROLE recovery_fixture_owner;\n' + rollback + '\nCOMMIT;');
    assert.equal((await sql("SELECT to_regclass('idealab_private.recovery_session_consumptions_v1') IS NULL AND to_regprocedure('public.consume_recovery_session_v1(uuid,uuid)') IS NULL AND to_regprocedure('idealab_private.consume_recovery_session_v1(uuid,uuid)') IS NULL")).stdout.trim(), 't');
    await sql('BEGIN; SET LOCAL ROLE recovery_fixture_owner;\n' + candidate + '\nCOMMIT;');
    const consume = `BEGIN; SET LOCAL ROLE authenticated;
      SELECT set_config('request.jwt.claims', jsonb_build_object(
        'role','authenticated','sub','00000000-0000-4000-8000-000000000001',
        'session_id','00000000-0000-4000-8000-000000000011',
        'exp',extract(epoch FROM now())+3600,'amr',jsonb_build_array(
          jsonb_build_object('method','recovery','timestamp',extract(epoch FROM now())-60)))::text,true);
      SELECT public.consume_recovery_session_v1(
        '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011');
      SELECT pg_sleep(0.25); COMMIT;`;
    const contenders = await Promise.all([sql(consume), sql(consume)]);
    assert.deepEqual(contenders.map(result => result.stdout.trim().split(/\r?\n/).at(-1)).sort(), ['f', 't']);
    const expiringSession = '00000000-0000-4000-8000-000000000015';
    await sql(`UPDATE auth.sessions SET not_after = clock_timestamp() + interval '4 seconds' WHERE id = '${expiringSession}';`);
    const holder = sql(`BEGIN; SET LOCAL application_name = 'recovery_expiry_holder';
      SELECT id FROM auth.sessions WHERE id = '${expiringSession}' FOR UPDATE;
      SELECT pg_sleep(5); COMMIT;`);
    const waitFor = async (application, event) => {
      for (let attempt = 0; attempt < 50; attempt++) {
        const observed = await sql(`SELECT EXISTS (SELECT FROM pg_stat_activity
          WHERE application_name = '${application}' AND wait_event_type = '${event}');`);
        if (observed.stdout.trim() === 't') return;
        await delay(30);
      }
      assert.fail(`Did not observe ${application} waiting on ${event}`);
    };
    try {
      await waitFor('recovery_expiry_holder', 'Timeout');
      const waiting = sql(consume
        .replace('SET LOCAL ROLE authenticated;', "SET LOCAL ROLE authenticated; SET LOCAL application_name = 'recovery_expiry_contender';")
        .replaceAll('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002')
        .replaceAll('00000000-0000-4000-8000-000000000011', expiringSession));
      const [result] = await Promise.all([waiting, waitFor('recovery_expiry_contender', 'Lock')]);
      assert.equal(result.stdout.trim().split(/\r?\n/).at(-1), 'f');
    } finally {
      await holder;
    }
    assert.equal((await sql(`SELECT count(*) FROM idealab_private.recovery_session_consumptions_v1 WHERE session_id = '${expiringSession}';`)).stdout.trim(), '0');
    await assert.rejects(sql('BEGIN; SET LOCAL ROLE recovery_fixture_owner;\n' + rollback + '\nCOMMIT;'),
      error => error.stderr?.includes('Retained recovery receipts require a recovery plan'));
    assert.equal((await sql('SELECT count(*) FROM idealab_private.recovery_session_consumptions_v1')).stdout.trim(), '1');
    summary.scope = 'Disposable synthetic recovery claims and receipt checks; no provider or live accounts.';
    summary.checks.recoveryConsumption = true;
    summary.checks.recoveryFixtureRolledBack = true;
    summary.checks.recoverySingleWinner = true;
    summary.checks.recoveryExpiryWhileBlocked = true;
    summary.checks.recoveryPreUseRollback = true;
    summary.checks.recoveryRollbackPreservesReceipts = true;
  }
  if (process.argv.includes('--default-acl-probe')) {
    stage = 'default-acl-probe';
    const probe = await readFile(new URL('../supabase/tests/database/default_acl_probe.sql', import.meta.url), 'utf8');
    const result = await sql(probe);
    assert.equal(result.stdout.trim(), 't', 'Default-ACL probe must roll back all synthetic roles and objects.');
    summary.scope = 'Disposable PG17 default privilege behavior probe with synthetic creator roles. No Supabase or live permission changes.';
    summary.checks.defaultAclInheritanceProbe = true;
    summary.checks.defaultAclNarrowingPreservesOtherGrants = true;
    summary.checks.defaultAclProbeRolledBack = true;
  }
  if (process.argv.includes('--profile-ecosystem-parity')) {
    stage = 'profile-ecosystem-parity';
    const [source, catalogText, structuralText, authorizationText] = await Promise.all([
      '../../Grow/supabase/migrations/003_profile_ecosystem.sql',
      '../docs/research/shared-public-catalog-2026-11-04.json',
      '../docs/research/shared-structural-fingerprints-2026-11-04.json',
      '../docs/research/profile-authorization-catalog-2026-11-04.json',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
    summary.profileEcosystem = await compareProfileEcosystem(sql, source, catalogText, structuralText, authorizationText);
    assert.equal((await sql("SELECT to_regclass('public.user_profiles') IS NULL AND to_regclass('auth.users') IS NULL")).stdout.trim(), 't');
    summary.scope = 'Disposable PG16+ metadata comparison of exact Grow migration 003 against captured profile catalog. No live database or member rows accessed. A completed comparison is not schema parity or shared compatibility.';
    summary.checks.profileEcosystemComparisonCompleted = true;
    summary.checks.profileEcosystemCapturedMetadataMatch = summary.profileEcosystem.capturedMetadataMatch;
    summary.checks.profileEcosystemRolledBack = true;
  }
  if (process.argv.includes('--shared-ledger-replay')) {
    stage = 'shared-ledger-replay';
    const migrations = await Promise.all([
      '../docs/research/shared-ledger-20260503073726.sql',
      '../docs/research/shared-ledger-20260503073744.sql',
      '../../Grow/supabase/migrations/20261102083307_shared_access_hardening_v1.sql',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
    // Minimal local stand-ins for Supabase-managed objects used by the May DDL.
    await sql(`
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT current_user::text';
    `);
    for (const migration of migrations.slice(0, 2)) await sql(migration);
    const tableCount = await sql("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'");
    assert.equal(tableCount.stdout.trim(), '11', 'May ledger replays eleven public tables.');
    await assert.rejects(() => sql(migrations[2]),
      error => /table\/ACL baseline changed; review again/.test(error.stderr ?? ''),
      'November hardening must refuse the incomplete May baseline.');
    summary.scope = 'Disposable replay of the two May ledger entries with synthetic Auth objects, followed by the November hardening preflight.';
    summary.checks.mayLedgerReplay = true;
    summary.checks.novemberPreflightRefusedIncompleteBaseline = true;
    const catalog = JSON.parse(await readFile(new URL(
      '../docs/research/shared-public-catalog-2026-11-04.json', import.meta.url), 'utf8'));
    const structural = JSON.parse(await readFile(new URL(
      '../docs/research/shared-structural-fingerprints-2026-11-04.json', import.meta.url), 'utf8'));
    const readShape = async () => JSON.parse((await sql(`
      SELECT json_build_object(
        'tables', (SELECT json_agg(t ORDER BY relation) FROM (
          SELECT c.relname AS relation, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
        ) t),
        'columns', (SELECT json_agg(c ORDER BY table_name, ordinal_position) FROM (
          SELECT table_name, ordinal_position, column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public'
        ) c),
        'constraints', (SELECT json_agg(c ORDER BY relation, conname) FROM (
          SELECT r.relname AS relation, con.conname, pg_get_constraintdef(con.oid) AS definition
          FROM pg_constraint con JOIN pg_class r ON r.oid = con.conrelid
          WHERE r.relnamespace = 'public'::regnamespace
        ) c),
        'policies', (SELECT json_agg(p) FROM (
          SELECT tablename, policyname, roles::text, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'
        ) p));
    `)).stdout);
    const raw = await readShape();
    const mayTables = new Set(raw.tables.map(row => row.relation));
    assert.equal(mayTables.size, 11);
    for (const name of mayTables) assert(catalog.tables.some(row => row.relation === name), `May table missing in capture: ${name}`);
    const structuralQuery = await readFile(new URL('../supabase/inspection/shared_structural_fingerprints.sql', import.meta.url), 'utf8');
    const publicFingerprints = `SELECT coalesce(json_agg(s), '[]') FROM (${structuralQuery.trim().replace(/;$/, '')}) s WHERE schema_name = 'public'`;
    const rawFingerprints = JSON.parse((await sql(publicFingerprints)).stdout);
    const capturedFingerprints = [
      ...structural.defaults.map(row => ({ kind: 'default', schema_name: row.schema_name, table_name: row.table_name, object_name: row.column_name, definition_md5: row.expression_md5 })),
      ...structural.indexes.map(row => ({ kind: 'index', schema_name: row.schema_name, table_name: row.table_name, object_name: row.index_name, definition_md5: row.definition_md5 })),
      ...structural.triggers.map(row => ({ kind: 'trigger', schema_name: row.schema_name, table_name: row.table_name, object_name: row.trigger_name, definition_md5: row.definition_md5 })),
    ].filter(row => row.schema_name === 'public');
    const differences = (replay, captured) => {
      const signature = row => JSON.stringify(Object.entries(row).sort(([left], [right]) => left.localeCompare(right)));
      const replayKeys = new Set(replay.map(signature));
      const capturedKeys = new Set(captured.map(signature));
      return { replayOnly: replay.filter(row => !capturedKeys.has(signature(row))), capturedOnly: captured.filter(row => !replayKeys.has(signature(row))) };
    };
    summary.mayLedgerDrift = Object.fromEntries([...mayTables].map(name => [name, {
      rls: differences(raw.tables.filter(row => row.relation === name), catalog.tables.filter(row => row.relation === name).map(({ relation, rls, force_rls }) => ({ relation, rls, force_rls }))),
      columns: differences(raw.columns.filter(row => row.table_name === name), catalog.columns.filter(row => row.table_name === name)),
      constraints: differences(raw.constraints.filter(row => row.relation === name), catalog.constraints.filter(row => row.relation === name)),
      policies: differences(raw.policies.filter(row => row.tablename === name), catalog.policies.filter(row => row.tablename === name)),
      fingerprints: differences(rawFingerprints.filter(row => row.table_name === name), capturedFingerprints.filter(row => row.table_name === name)),
    }]));
    const rc43Source = await readFile(new URL('../../Grow/supabase/migrations/rc43_backend_authority.sql', import.meta.url), 'utf8');
    const rc43 = JSON.parse((await sql(`
      BEGIN;
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      ${rc43Source}
      SELECT json_build_object(
        'functions', (SELECT json_agg(json_build_object('name',p.proname,'definitionMd5',md5(pg_get_functiondef(p.oid))) ORDER BY p.proname)
          FROM pg_proc p WHERE p.pronamespace = 'private'::regnamespace
            AND p.proname IN ('notify_booking_status_change','notify_project_member_join') AND p.pronargs=0),
        'fingerprints', (${publicFingerprints}),
        'bookingConstraints', (SELECT json_agg(json_build_object('relation','tool_bookings','conname',conname,'definition',pg_get_constraintdef(oid)))
          FROM pg_constraint WHERE conrelid='public.tool_bookings'::regclass)
      );
      ROLLBACK;
    `)).stdout);
    const capturedNotificationFunctions = [
      { name: 'notify_booking_status_change', definitionMd5: '9184087e21b9fd86458a897440509170' },
      { name: 'notify_project_member_join', definitionMd5: 'cab40bf2cf97986e04d019fb79367419' },
    ];
    summary.rc43NotificationFunctionDrift = differences(rc43.functions, capturedNotificationFunctions);
    assert.equal(rc43.functions.length, capturedNotificationFunctions.length);
    const rc43Added = differences(rc43.fingerprints, rawFingerprints).replayOnly;
    assert(rc43Added.length > 0, 'RC4.3 replay must add structural fingerprints.');
    summary.rc43StructuralAdditions = {
      matchingCapture: rc43Added.filter(row => differences([row], capturedFingerprints).replayOnly.length === 0),
      absentFromCapture: differences(rc43Added, capturedFingerprints).replayOnly,
      bookingConstraintDrift: differences(rc43.bookingConstraints, catalog.constraints.filter(row => row.relation === 'tool_bookings')),
    };
    const bookingIntakeCandidate = await readFile(new URL('../supabase/validation/legacy_booking_intake_candidate.sql', import.meta.url), 'utf8');
    for (const changedBaseline of [
      'ALTER TABLE public.tool_bookings DISABLE ROW LEVEL SECURITY;',
      'ALTER POLICY bookings_insert_own ON public.tool_bookings WITH CHECK (true);',
      'CREATE ROLE authenticated NOLOGIN; ALTER POLICY bookings_insert_own ON public.tool_bookings TO authenticated;',
    ]) {
      await assert.rejects(() => sql(`BEGIN; ${changedBaseline} ${bookingIntakeCandidate} ROLLBACK;`),
        error => /Legacy booking intake baseline changed; review again/.test(error.stderr ?? ''),
        'Changed booking intake baseline must fail preflight.');
      const unchanged = await sql(`SELECT NOT EXISTS (SELECT 1 FROM pg_policy
        WHERE polrelid='public.tool_bookings'::regclass AND polname='tool_bookings_pending_intake_only')
        AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated');`);
      assert.equal(unchanged.stdout.trim(), 't', 'Failed preflight must roll back policy and role changes.');
    }
    summary.checks.restrictiveBookingIntakeRejectsThreeBaselineChanges = true;
    const bookingAuthority = await sql(`
      BEGIN;
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated;
      GRANT INSERT ON public.tool_bookings TO anon, authenticated;
      INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001');
      INSERT INTO public.users (id, name, email)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Synthetic member', 'member@example.invalid');
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
      INSERT INTO public.tool_bookings (user_id, slot_start, slot_end, status, approved_by, approved_at)
        VALUES (auth.uid(), now(), now() + interval '1 hour', 'approved', auth.uid(), now());
      RESET ROLE;
      SELECT count(*) = 1 FROM public.tool_bookings WHERE status = 'approved' AND user_id = approved_by;
      ${bookingIntakeCandidate}
      GRANT SELECT ON public.tool_bookings TO authenticated;
      SET LOCAL ROLE authenticated;
      DO $booking_intake$
      DECLARE bad_input record;
      BEGIN
        FOR bad_input IN SELECT * FROM (VALUES
          ('approved', NULL::uuid, NULL::timestamptz, NULL::timestamptz, NULL::timestamptz, false),
          (NULL, NULL, NULL, NULL, NULL, false),
          ('pending', auth.uid(), NULL, NULL, NULL, false),
          ('pending', NULL, now(), NULL, NULL, false),
          ('pending', NULL, NULL, now(), NULL, false),
          ('pending', NULL, NULL, NULL, now(), false),
          ('pending', NULL, NULL, NULL, NULL, true)
        ) AS inputs(status, approver, approved_at, checkout_at, returned_at, reminded)
        LOOP
          BEGIN
            INSERT INTO public.tool_bookings
              (user_id, slot_start, slot_end, status, approved_by, approved_at, checkout_at, returned_at, return_reminder_sent)
            VALUES (auth.uid(), now(), now() + interval '1 hour', bad_input.status, bad_input.approver,
              bad_input.approved_at, bad_input.checkout_at, bad_input.returned_at, bad_input.reminded);
            RAISE EXCEPTION 'Untrusted booking insert unexpectedly passed';
          EXCEPTION WHEN insufficient_privilege THEN NULL;
          END;
        END LOOP;
      END $booking_intake$;
      INSERT INTO public.tool_bookings (user_id, slot_start, slot_end, status)
        VALUES (auth.uid(), now(), now() + interval '1 hour', 'pending') RETURNING status;
      RESET ROLE;
      SET LOCAL request.jwt.claim.sub = '';
      SET LOCAL ROLE anon;
      DO $anonymous$ BEGIN
        INSERT INTO public.tool_bookings (slot_start, slot_end) VALUES (now(), now() + interval '1 hour');
        RAISE EXCEPTION 'Anonymous booking unexpectedly passed';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END $anonymous$;
      ROLLBACK;
    `);
    assert.deepEqual(bookingAuthority.stdout.trim().split(/\r?\n/), ['t', 'pending'], 'Legacy self-approval reproduces and restrictive intake preserves pending insert/return.');
    summary.checks.legacyBookingSelfApprovalReproduced = true;
    summary.checks.restrictiveBookingIntakeRejectsSevenUntrustedInputs = true;
    summary.checks.restrictiveBookingIntakeRejectsAnonymousWithoutIdentity = true;
    // Model the observed column rename only after recording raw replay drift.
    await sql('ALTER TABLE public.projects RENAME COLUMN stage TO status');
    const projectShape = await readShape();
    const projectTables = new Set(['projects', 'project_members']);
    assert.deepEqual(projectShape.columns.filter(row => projectTables.has(row.table_name)), catalog.columns.filter(row => projectTables.has(row.table_name)));
    assert.deepEqual(projectShape.constraints.filter(row => projectTables.has(row.relation)), catalog.constraints.filter(row => projectTables.has(row.relation)));
    summary.checks.projectColumnsAndConstraintsMatchCapturedCatalog = true;
    const membershipProbe = await sql(`
      BEGIN;
      CREATE ROLE authenticated NOLOGIN;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT INSERT ON public.project_members TO authenticated;
      INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001');
      INSERT INTO public.users (id, name, email)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Synthetic member', 'member@example.invalid');
      INSERT INTO public.projects (id, title, visibility) VALUES
        ('00000000-0000-0000-0000-000000000002', 'Synthetic project', 'private'),
        ('00000000-0000-0000-0000-000000000003', 'Second synthetic project', 'private');
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
      INSERT INTO public.project_members (project_id, user_id, role)
        VALUES ('00000000-0000-0000-0000-000000000002', auth.uid(), 'admin');
      RESET ROLE;
      SELECT count(*) = 1 FROM public.project_members WHERE role = 'admin';
      REVOKE INSERT ON public.project_members FROM authenticated;
      SET LOCAL ROLE authenticated;
      DO $probe$
      BEGIN
        INSERT INTO public.project_members (project_id, user_id, role)
          VALUES ('00000000-0000-0000-0000-000000000003', auth.uid(), 'member');
        RAISE EXCEPTION 'Direct membership insert unexpectedly succeeded';
      EXCEPTION WHEN insufficient_privilege THEN
        NULL;
      END;
      $probe$;
      RESET ROLE;
      SELECT count(*) = 1 FROM public.project_members WHERE role = 'admin';
      ROLLBACK;
    `);
    assert.equal(membershipProbe.stdout.trim().replaceAll('\r', ''), 't\nt',
      'Legacy policy allows self-assigned admin with the observed grant. Revocation denies a new insert and preserves existing rows.');
    summary.checks.legacyProjectRoleEscalationReproduced = true;
    summary.checks.directInsertRevocationPreservesExistingMembership = true;
    const projectCandidate = await readFile(new URL(
      '../supabase/validation/mec_projects_candidate.sql', import.meta.url), 'utf8');
    const controlsDdl = projectCandidate.match(/CREATE TABLE idealab_private\.project_controls_v1 \([\s\S]+?\r?\n\);/)?.[0];
    assert(controlsDdl, 'Read the control table definition from the existing candidate.');
    const candidateSection = (start, end) => {
      const from = projectCandidate.indexOf(start);
      const to = projectCandidate.indexOf(end, from + start.length);
      assert(from >= 0 && to > from, 'Expected project candidate section.');
      return projectCandidate.slice(from, to);
    };
    const readSupport = candidateSection('CREATE TABLE idealab_private.project_join_requests_v1',
      'CREATE TABLE idealab_private.project_commands_v1');
    const projectReads = candidateSection('CREATE FUNCTION idealab_private.project_card_v1',
      'CREATE FUNCTION idealab_private.get_own_project_requests_v1');
    const readWrappers = candidateSection('CREATE FUNCTION public.get_projects_v1',
      'CREATE FUNCTION public.get_own_project_requests_v1');
    const controlBackfill = await sql(`
      BEGIN;
      CREATE SCHEMA idealab_private;
      ${controlsDdl}
      INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000001');
      INSERT INTO public.users (id, name, email)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Synthetic creator', 'creator@example.invalid');
      INSERT INTO public.projects (id, title, visibility, created_by) VALUES
        ('00000000-0000-0000-0000-000000000002', 'Synthetic private project', 'private', '00000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000003', 'Synthetic public project', 'public', '00000000-0000-0000-0000-000000000001');
      INSERT INTO public.project_members (project_id, user_id, role)
        VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'lead');
      CREATE TEMP TABLE original_projects AS TABLE public.projects;
      CREATE TEMP TABLE original_members AS TABLE public.project_members;
      INSERT INTO idealab_private.project_controls_v1 (project_id) SELECT id FROM public.projects;
      CREATE TEMP TABLE original_controls AS TABLE idealab_private.project_controls_v1;
      INSERT INTO idealab_private.project_controls_v1 (project_id) SELECT id FROM public.projects
        ON CONFLICT (project_id) DO NOTHING;
      SELECT count(*) = 2 AND count(DISTINCT join_code) = 2 AND bool_and(revision = 1)
        FROM idealab_private.project_controls_v1;
      SELECT NOT EXISTS (SELECT * FROM original_controls EXCEPT SELECT * FROM idealab_private.project_controls_v1);
      SELECT NOT EXISTS (SELECT * FROM original_projects EXCEPT SELECT * FROM public.projects)
        AND (SELECT count(*) FROM public.projects) = 2;
      SELECT NOT EXISTS (SELECT * FROM original_members EXCEPT SELECT * FROM public.project_members)
        AND (SELECT count(*) FROM public.project_members) = 1;
      ${readSupport}
      -- This probe isolates the projection. Admission is exercised separately.
      CREATE FUNCTION idealab_private.lab_opening_member_ready_v1() RETURNS boolean
        LANGUAGE sql STABLE AS 'SELECT auth.uid() IS NOT NULL';
      ${projectReads}
      ${readWrappers}
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE anon NOLOGIN;
      GRANT USAGE ON SCHEMA auth, idealab_private TO anon, authenticated;
      GRANT SELECT ON public.projects, public.project_members TO anon, authenticated;
      SET LOCAL ROLE anon;
      SELECT count(*) = 1 AND bool_and(visibility = 'public') FROM public.projects;
      RESET ROLE;
      REVOKE SELECT ON public.projects, public.project_members FROM anon, authenticated;
      REVOKE EXECUTE ON FUNCTION idealab_private.project_card_v1(uuid),
        idealab_private.get_projects_v1(text,text,timestamptz,uuid), idealab_private.get_project_v1(uuid),
        public.get_projects_v1(text,text,timestamptz,uuid), public.get_project_v1(uuid) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION idealab_private.get_projects_v1(text,text,timestamptz,uuid),
        idealab_private.get_project_v1(uuid), public.get_projects_v1(text,text,timestamptz,uuid),
        public.get_project_v1(uuid) TO authenticated;
      SELECT NOT has_table_privilege('anon', 'public.projects', 'SELECT')
        AND NOT has_table_privilege('authenticated', 'public.project_members', 'SELECT')
        AND NOT has_function_privilege('anon', 'public.get_project_v1(uuid)', 'EXECUTE')
        AND NOT has_function_privilege('authenticated', 'idealab_private.project_card_v1(uuid)', 'EXECUTE');
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
      SELECT public.get_project_v1('00000000-0000-0000-0000-000000000002') IS NULL;
      SELECT jsonb_array_length(public.get_projects_v1('discover', '', NULL, NULL)->'items') = 1
        AND (public.get_project_v1('00000000-0000-0000-0000-000000000003')->'join_code') = 'null'::jsonb;
      SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
      SELECT (public.get_project_v1('00000000-0000-0000-0000-000000000002')->'project'->>'relation') = 'creator'
        AND (public.get_project_v1('00000000-0000-0000-0000-000000000002')->>'join_code') IS NOT NULL;
      ROLLBACK;
    `);
    assert.equal(controlBackfill.stdout.trim().replaceAll('\r', ''), 't\nt\nt\nt\nt\nt\nt\nt\nt',
      'Backfill preserves legacy rows and codes, and guarded reads preserve project privacy.');
    summary.checks.projectControlBackfillPreservesLegacyRecords = true;
    summary.checks.legacyProjectReadPrivacyWithSyntheticIdentity = true;
    summary.checks.legacyAnonymousProjectReadAndGuardedAclCutover = true;
  }
  if (process.argv.includes('--restore-drill')) {
    stage = 'restore-drill';
    const archive = join(clusterReal, 'restore-drill.dump');
    const restorePassfile = join(clusterReal, 'restore.pgpass');
    await writeFile(restorePassfile, `127.0.0.1:${port}:idealab_restore:${username}:${password}\n`, { flag: 'wx', mode: 0o600 });
    const connection = ['--host=127.0.0.1', '--port', String(port), '--username', username, '--no-password'];
    await sql(`
      CREATE ROLE restore_member NOLOGIN;
      CREATE TABLE public.restore_probe (id integer PRIMARY KEY, owner_name name NOT NULL, amount integer NOT NULL CHECK (amount > 0));
      INSERT INTO public.restore_probe VALUES (1, 'restore_member', 42), (2, 'other_member', 9);
      ALTER TABLE public.restore_probe ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.restore_probe FORCE ROW LEVEL SECURITY;
      CREATE POLICY restore_owner ON public.restore_probe FOR SELECT TO restore_member USING (owner_name = current_user);
      GRANT SELECT ON public.restore_probe TO restore_member;
    `);
    await run('pg_dump', [...connection, '--dbname=postgres', '--format=custom', '--file', archive],
      { env: { ...environment, PGPASSFILE: passfile } });
    await sql('CREATE DATABASE idealab_restore TEMPLATE template0');
    const restoreOptions = { env: { ...environment, PGPASSFILE: restorePassfile } };
    await run('pg_restore', [...connection, '--dbname=idealab_restore', '--single-transaction', '--exit-on-error', archive], restoreOptions);
    const restoreSql = command => run('psql', [...connection, '--dbname=idealab_restore', '--no-psqlrc',
      '--quiet', '--no-align', '--tuples-only', '--set=ON_ERROR_STOP=1', '--command', command], restoreOptions);
    const recovered = await restoreSql(`
      SELECT count(*) = 2 AND sum(amount) = 51 FROM public.restore_probe;
      SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'public.restore_probe'::regclass;
      SET ROLE restore_member;
      SELECT count(*) = 1 AND sum(amount) = 42 FROM public.restore_probe;
      SELECT NOT has_table_privilege(current_user, 'public.restore_probe', 'INSERT');
    `);
    assert.equal(recovered.stdout.trim().replaceAll('\r', ''), 't\nt\nt\nt', 'Restore preserves data, RLS and restricted grants.');
    summary.checks.disposableArchiveRestore = true;
  }
  if (process.argv.includes('--project-admission')) {
    stage = 'project-admission';
    const sources = await Promise.all([
      '../../Grow/supabase/tests/shared_profile_contract_v1_fixture.sql',
      '../../Grow/supabase/candidates/shared_profile_contract_v1.sql',
      '../../Grow/supabase/tests/shared_profile_contract_v1_behavior_checks.sql',
      '../supabase/validation/mec_lab_opening_candidate.sql',
      '../supabase/validation/mec_projects_candidate.sql',
      '../supabase/tests/database/mec_projects_catalog.test.sql',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
    const result = await sql([
      'BEGIN; SET LOCAL plpgsql.check_asserts = on;',
      ...sources.slice(0, 3),
      'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS banned_until timestamptz;',
      ...sources.slice(3),
      `
        CREATE TEMP TABLE project_admission_state(project_id uuid, join_code text, request_id uuid);
        GRANT SELECT, INSERT, UPDATE ON project_admission_state TO authenticated;
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000007';
        DO $admitted$
        DECLARE receipt jsonb; detail jsonb;
        BEGIN
          ASSERT (SELECT mec_admitted FROM public.get_own_profile_v1());
          receipt := public.mutate_project_v1(
            '{"kind":"create","title":"Synthetic project","description":"Fixture","visibility":"private"}', gen_random_uuid());
          ASSERT receipt->>'status' = 'saved', 'admitted account creates a project';
          detail := public.get_project_v1((receipt->>'project_id')::uuid);
          ASSERT detail#>>'{project,relation}' = 'creator';
          INSERT INTO project_admission_state(project_id,join_code)
            VALUES((receipt->>'project_id')::uuid,detail->>'join_code');
        END $admitted$;
        SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000005';
        DO $join_request$
        DECLARE receipt jsonb;
        BEGIN
          receipt := public.mutate_project_v1(jsonb_build_object('kind','join',
            'code',(SELECT join_code FROM project_admission_state)),gen_random_uuid());
          ASSERT receipt->>'status' = 'requested', 'eligible applicant can request private project access';
          UPDATE project_admission_state SET request_id=(receipt->>'request_id')::uuid;
        END $join_request$;
        RESET ROLE;
        UPDATE auth.users SET banned_until = statement_timestamp() + interval '1 hour'
          WHERE id = '00000000-0000-4000-8000-000000000005';
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000007';
        DO $banned_applicant$
        DECLARE receipt jsonb;
        BEGIN
          receipt := public.mutate_project_v1(jsonb_build_object('kind','decide',
            'request_id',(SELECT request_id FROM project_admission_state),
            'expected_revision','1','decision','approve'),gen_random_uuid());
          ASSERT receipt->>'status' = 'applicant_unavailable', 'currently banned applicant cannot be approved';
        END $banned_applicant$;
        RESET ROLE;
        DO $request_still_pending$
        BEGIN
          ASSERT (SELECT status FROM idealab_private.project_join_requests_v1
            WHERE id=(SELECT request_id FROM project_admission_state)) = 'pending',
            'rejected approval leaves the request pending';
        END $request_still_pending$;
        UPDATE auth.users SET banned_until = NULL
          WHERE id = '00000000-0000-4000-8000-000000000005';
        SET LOCAL ROLE authenticated;
        SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000005';
        DO $no_latent_access$
        BEGIN
          ASSERT public.get_project_v1((SELECT project_id FROM project_admission_state)) IS NULL,
            'rejected applicant does not gain private access after unban';
        END $no_latent_access$;
        COMMIT;
        SELECT true;
      `,
    ].join('\n'));
    assert(result.stdout.trim().endsWith('t'), 'Project and profile fixtures committed only in the disposable cluster.');
    await checkProjectAdmissionConcurrency(sql);
    await sql(`
      BEGIN;
      UPDATE auth.users SET banned_until=statement_timestamp()+interval '1 hour'
        WHERE id='00000000-0000-4000-8000-000000000007';
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000007';
      DO $banned_reads$
      BEGIN
        BEGIN PERFORM public.get_projects_v1('mine','',NULL,NULL); RAISE EXCEPTION 'Banned account could read projects';
        EXCEPTION WHEN insufficient_privilege THEN NULL; END;
        BEGIN PERFORM public.get_own_project_requests_v1(); RAISE EXCEPTION 'Banned account could read project requests';
        EXCEPTION WHEN insufficient_privilege THEN NULL; END;
      END $banned_reads$;
      ROLLBACK;
      SELECT true;
    `);
    summary.scope = 'Disposable shared-profile and project candidates with synthetic Auth identities.';
    summary.checks.projectAdmissionAndBanEnforced = true;
    summary.checks.bannedPrivateProjectApplicantCannotGainMembership = true;
    summary.checks.profileRevocationSerializedWithProjectMutation = true;
    summary.checks.bannedMemberProjectReadsDenied = true;
  }
  if (process.argv.includes('--lab-opening')) {
    stage = 'lab-opening-rehearsal';
    assert.equal(Number(identity.version.split('.')[0]), 17, 'Shared profile fixtures require PostgreSQL 17.');
    const grow = await realpath(resolve(project, '../Grow'));
    const sources = await Promise.all([
      readFile(join(grow, 'supabase/tests/shared_profile_contract_v1_fixture.sql'), 'utf8'),
      readFile(join(grow, 'supabase/candidates/shared_profile_contract_v1.sql'), 'utf8'),
      readFile(join(grow, 'supabase/tests/shared_profile_contract_v1_behavior_checks.sql'), 'utf8'),
      '../supabase/validation/mec_own_visits_read_candidate.sql',
      '../supabase/validation/mec_lab_opening_candidate.sql',
      '../supabase/validation/mec_own_visit_writes_candidate.sql',
      '../supabase/tests/database/mec_lab_opening.test.sql',
      '../supabase/tests/database/mec_lab_opening_transitions.test.sql',
      '../supabase/tests/database/mec_own_visit_writes.test.sql',
    ].map(source => typeof source === 'string' && source.endsWith('.sql')
      ? readFile(new URL(source, import.meta.url), 'utf8')
      : source));
    const install = [
      'BEGIN; SET LOCAL statement_timeout=\'30s\'; SET LOCAL plpgsql.check_asserts=on;',
      ...sources.slice(0, 3),
      'ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS banned_until timestamptz;',
      ...sources.slice(3, 6),
      "INSERT INTO idealab_private.lab_opening_permissions_v1(user_id,duty_label,grant_reason)",
      "VALUES ('00000000-0000-4000-8000-000000000006','Synthetic Lab core','Disposable validation fixture');",
      'COMMIT;',
    ].join('\n');
    await sql(install);
    await sql(['BEGIN;', sources[6], 'ROLLBACK;'].join('\n'));
    await sql(['BEGIN;', sources[8], 'ROLLBACK;'].join('\n'));
    await sql(sources[7]);
    await checkLabOpeningConcurrency(sql);
    summary.scope = 'Disposable PostgreSQL with synthetic shared-profile, attendance and Lab opening fixtures. No live Supabase services accessed.';
    summary.checks.labOpeningCatalog = true;
    summary.checks.labClosureAtRecordedTimestamp = true;
    summary.checks.labClosureRetryIdempotent = true;
    summary.checks.labClosureCheckinSerialization = true;
    summary.checks.concurrentLabOpening = true;
  }
  if (process.argv.includes('--staff-scope-shared')) {
    stage = 'staff-scope-rehearsal';
    assert.equal(Number(identity.version.split('.')[0]), 17, 'The shared profile fixture requires PostgreSQL 17.');
    const grow = await realpath(resolve(project, '../Grow'));
    const sharedFixture = await readFile(join(grow, 'supabase/tests/shared_profile_contract_v1_fixture.sql'), 'utf8');
    const sharedProfile = await readFile(join(grow, 'supabase/candidates/shared_profile_contract_v1.sql'), 'utf8');
    const sources = await Promise.all([
      '../supabase/tests/database/mec_staff_scope_shared_accounts.sql',
      '../supabase/validation/mec_staff_scope_candidate.sql',
      '../supabase/tests/database/mec_staff_scope.test.sql',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
    const rehearsalFile = join(clusterReal, 'staff-shared-profile.sql');
    await writeFile(rehearsalFile, [
      "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='5s';",
      sharedFixture, 'SET LOCAL ROLE postgres;', sharedProfile,
      'SET LOCAL ROLE postgres;', ...sources,
      "ROLLBACK; SELECT to_regnamespace('idealab_private') IS NULL AND to_regnamespace('auth') IS NULL;",
    ].join('\n'), { flag: 'wx', mode: 0o600 });
    const result = await run('psql', [...args, '--file', rehearsalFile], { env: { ...environment, PGPASSFILE: passfile }, timeout: 60000 });
    assert(result.stdout.trim().endsWith('t'), 'shared profile and staff candidate roll back together');
    summary.scope = 'Disposable PostgreSQL with shared profile SQL and synthetic staff checks. No live Supabase services accessed.';
    summary.checks.staffScopeOnSharedProfile = true;
    summary.checks.sharedProfileAndStaffRolledBack = true;
  }
  if (process.argv.includes('--event-drafts')) {
    stage = 'staff-scope-rehearsal';
    const sources = await Promise.all([
      '../supabase/tests/database/mec_staff_scope_fixture.sql',
      '../supabase/validation/mec_staff_scope_candidate.sql',
      '../supabase/tests/database/mec_event_drafts_fixture.sql',
      '../supabase/validation/mec_event_drafts_candidate.sql',
      '../supabase/tests/database/mec_event_drafts.test.sql',
      '../supabase/validation/mec_event_management_reads_candidate.sql',
      '../supabase/tests/database/mec_event_management_reads.test.sql',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
    await sql(['BEGIN;', ...sources, 'ROLLBACK;'].join('\n'));
    assert.equal((await sql("SELECT to_regclass('idealab_private.event_management_v1') IS NULL AND to_regclass('public.events') IS NULL;")).stdout.trim(), 't', 'event candidate and fixtures rolled back');
    await assert.rejects(sql(['BEGIN;', ...sources.slice(0, 3),
      'GRANT INSERT ON public.rsvps TO authenticated;', sources[3], 'ROLLBACK;'].join('\n')),
    error => /Existing direct event\/RSVP writes require coordinated hardening/.test(error.stderr ?? ''), 'legacy RSVP writes refuse candidate');
    await assert.rejects(sql(['BEGIN;', ...sources.slice(0, 3),
      'CREATE FUNCTION public.increment_rsvp_count(row_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ UPDATE public.events SET rsvp_count=rsvp_count+1 WHERE id=row_id $$;',
      sources[3], 'ROLLBACK;'].join('\n')),
    error => /Legacy RSVP counter routines require coordinated hardening/.test(error.stderr ?? ''), 'legacy privileged counter refuses candidate');
    await sql(['BEGIN;', ...sources, 'COMMIT;'].join('\n'));
    await checkEventDraftConcurrency(sql);
    const rollback = await readFile(new URL('../supabase/validation/mec_event_drafts_rollback.sql', import.meta.url), 'utf8');
    await assert.rejects(sql(['BEGIN;', rollback, 'COMMIT;'].join('\n')),
      error => /Retained event data requires a recovery plan/.test(error.stderr ?? ''), 'pre-use rollback preserves event records');
    // Remove only this process's synthetic rows, never shared application data.
    await sql('DELETE FROM idealab_private.event_management_commands_v1; DELETE FROM idealab_private.event_management_history_v1; DELETE FROM idealab_private.event_management_v1;');
    await sql(['BEGIN;', rollback, 'COMMIT;'].join('\n'));
    assert.equal((await sql("SELECT to_regclass('idealab_private.event_management_v1') IS NULL AND to_regprocedure('public.mutate_event_draft_v1(jsonb,uuid,uuid)') IS NULL AND (SELECT count(*)=2 FROM public.events);")).stdout.trim(), 't', 'pre-use rollback removes only candidate objects and preserves public events');
    summary.scope = 'Disposable PostgreSQL with synthetic event draft/publication checks. No live Supabase services accessed.';
    summary.checks.eventDrafts = true;
    summary.checks.eventDraftsRolledBack = true;
    summary.checks.legacyEventWritersRefused = true;
    summary.checks.eventDraftConcurrency = true;
    summary.checks.eventDraftPreUseRollback = true;
    summary.checks.eventManagementReads = true;
  }
  if (process.argv.includes('--staff-scope')) {
    stage = 'staff-scope-rehearsal';
    const sources = await Promise.all([
      '../supabase/tests/database/mec_staff_scope_fixture.sql',
      '../supabase/validation/mec_staff_scope_candidate.sql',
      '../supabase/tests/database/mec_staff_scope.test.sql',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
    await sql(['BEGIN;', ...sources, 'ROLLBACK;'].join('\n'));
    assert.equal((await sql("SELECT to_regclass('idealab_private.staff_scopes_v1') IS NULL AND to_regclass('idealab_private.staff_scope_assignments_v1') IS NULL;")).stdout.trim(), 't', 'staff candidate rolled back');
    await sql(['BEGIN;', ...sources, 'COMMIT;'].join('\n'));
    await checkStaffScopeConcurrency(sql);
    const rollback = await readFile(new URL('../supabase/validation/mec_staff_scope_rollback.sql', import.meta.url), 'utf8');
    await assert.rejects(sql(['BEGIN;', rollback, 'COMMIT;'].join('\n')),
      error => /Retained staff data requires a recovery plan/.test(error.stderr ?? ''),
      'rollback must preserve retained staff data');
    // Only synthetic rows in this process-owned scratch cluster are cleared.
    await sql('DELETE FROM idealab_private.student_ambassadors_v1; DELETE FROM idealab_private.staff_scope_commands_v1; DELETE FROM idealab_private.staff_scope_history_v1; DELETE FROM idealab_private.staff_scope_assignments_v1; DELETE FROM idealab_private.staff_scopes_v1;');
    await sql(['BEGIN;', rollback, 'COMMIT;'].join('\n'));
    assert.equal((await sql("SELECT to_regclass('idealab_private.staff_scopes_v1') IS NULL AND to_regclass('idealab_private.staff_scope_assignments_v1') IS NULL AND to_regprocedure('public.set_staff_scope_head_v1(uuid,bigint,uuid,text,text,uuid,uuid)') IS NULL;")).stdout.trim(), 't', 'pre-use rollback removes only the candidate');
    summary.scope = 'Disposable PostgreSQL with synthetic staff assignment fixtures. No live Supabase services accessed.';
    summary.checks.staffScope = true;
    summary.checks.staffScopeConcurrency = true;
    summary.checks.staffScopeConcurrentAssignmentCap = true;
    summary.checks.staffScopeConcurrentApproval = true;
    summary.checks.staffScopeRollback = true;
  }
  if (process.argv.includes('--lab-presence')) {
    const sources = await Promise.all([
      '../supabase/tests/database/mec_lab_presence_fixture.sql',
      '../supabase/validation/mec_lab_presence_candidate.sql',
      '../supabase/tests/database/mec_lab_presence.test.sql',
    ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
    await sql(['BEGIN;', ...sources, 'ROLLBACK;'].join('\n'));
    summary.scope = 'Disposable PostgreSQL with synthetic Lab roster fixtures. No live Supabase services accessed.';
    summary.checks.labPresence = true;
  }
} catch (error) {
  // Do not forward native command errors: their argument/env records may contain
  // sensitive process context. This harness handles only its synthetic cluster.
  failure = error instanceof assert.AssertionError ? error.message : 'Native runtime probe failed; no application or shared database was changed.';
  summary.failure = { stage, code: error.code ?? null, signal: error.signal ?? null };
  if (stage === 'identity' || stage === 'maker-publication' || stage === 'shared-fk-indexes' || stage === 'staff-scope-rehearsal' || stage === 'project-admission' || stage === 'lab-opening-rehearsal' || stage === 'recovery-consumption') summary.failure.diagnostic = String(error.stderr ?? '').replaceAll(password, '[redacted]').replaceAll(username, '[scratch-user]').trim().slice(-1500);
} finally {
  try {
    assert.equal(await realpath(clusterRoot), clusterReal);
    assert.equal(dirname(clusterReal), evidenceReal);
    assert.equal(await readFile(markerPath, 'utf8'), marker);
    const cleanupOptions = { signal: undefined };
    if (initialized) {
      try {
        await run('pg_ctl', ['status', '--pgdata', data], cleanupOptions);
        await run('pg_ctl', ['stop', '--pgdata', data, '--mode=fast', '--wait', '--timeout=20'], cleanupOptions);
      } catch (error) {
        if (error.code !== 3) throw error;
      }
      let stopped = false;
      try { await run('pg_ctl', ['status', '--pgdata', data], cleanupOptions); }
      catch (error) { stopped = error.code === 3; }
      assert(stopped, 'Do not delete data while its owned server is still running.');
    }
    await rm(clusterReal, { recursive: true });
    summary.checks.clusterStoppedAndRemoved = true;
  } catch {
    failure = 'Owned scratch-cluster cleanup is unverified. Inspect only the run directory: ' + clusterReal;
    summary.checks.clusterStoppedAndRemoved = false;
  }
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
}
summary.result = failure ? 'failed' : 'passed';
summary.started = started;
const evidencePath = join(evidenceReal, `runtime-${Date.now()}-${randomBytes(4).toString('hex')}.json`);
await writeFile(evidencePath, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(summary, null, 2));
console.log('Evidence: ' + relative(project, evidencePath));
if (failure) { console.error(failure); process.exitCode = 1; }
