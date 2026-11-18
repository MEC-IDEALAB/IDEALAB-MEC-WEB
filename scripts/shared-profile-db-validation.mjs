// Isolated native PostgreSQL runtime smoke check. Never accepts a database URL,
// existing data directory, application SQL or production credentials.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { access, appendFile, mkdir, mkdtemp, readFile, realpath, rm, rmdir, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use the project\'s Node 24 runtime.');
const project = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const grow = await realpath(process.env.IDEALAB_GROW_ROOT ?? resolve(project, '../Grow'));
assert.equal(grow, await realpath(resolve(project, '../Grow')), 'Only the sibling Grow candidate is accepted.');
const fixedFiles = [
  'supabase/tests/shared_profile_contract_v1_fixture.sql',
  'supabase/candidates/shared_profile_contract_v1.sql',
  'supabase/tests/shared_profile_contract_v1_candidate_checks.sql',
  'supabase/tests/shared_profile_contract_v1_legacy_fixture_checks.sql',
  'supabase/tests/shared_profile_contract_v1_behavior_checks.sql',
  'supabase/candidates/shared_profile_contract_v1_rollback.sql',
  'supabase/tests/shared_profile_contract_v1_rollback_checks.sql',
];
const publicProfileFiles = [
  'supabase/migrations/003_profile_ecosystem.sql',
  'supabase/migrations/006_profile_rls_hardening.sql',
  'supabase/tests/shared_public_profile_v1_fixture.sql',
  'supabase/candidates/shared_public_profile_v1.sql',
  'supabase/tests/shared_public_profile_v1_checks.sql',
  'supabase/candidates/shared_public_profile_v1_rollback.sql',
  'supabase/tests/shared_public_profile_v1_rollback_checks.sql',
];
const sqlSources = [];
const publicProfileSources = [];
const sourceSha256 = {};
for (const file of fixedFiles) {
  const path = await realpath(resolve(grow, file));
  assert(path.startsWith(grow + (process.platform === 'win32' ? '\\' : '/')), 'SQL must remain in sibling Grow.');
  const source = await readFile(path, 'utf8');
  sqlSources.push(source);
  sourceSha256[file] = createHash('sha256').update(source).digest('hex');
}
for (const file of publicProfileFiles) {
  const path = await realpath(resolve(grow, file));
  assert(path.startsWith(grow + (process.platform === 'win32' ? '\\' : '/')), 'Public-profile SQL must remain in sibling Grow.');
  const source = await readFile(path, 'utf8');
  publicProfileSources.push(source);
  sourceSha256[file] = createHash('sha256').update(source).digest('hex');
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
assert(Number(version.match(/PostgreSQL\) (\d+)/)?.[1]) === 17, 'This migration test requires PostgreSQL 17.');

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
const summary = { capturedAt: new Date().toISOString(), nodeVersion: process.version, version, scope: 'Disposable SQL-only fixture and candidate behavior; no Supabase Auth, PostgREST, Storage, provider or shared project accessed.', checks: { privateScratchDirectory: true } };
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
  const sql = (command, passwordFile = passfile) => run('psql', [...args, '--command', command], { env: { ...environment, PGPASSFILE: passwordFile } });
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
  stage = 'shared-profile-sql';
  const sqlFile = join(clusterReal, 'profile-checks.sql');
  await writeFile(sqlFile, "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s';\n"
    + sqlSources.slice(0,5).map((source,index) => index === 1
      ? source + "\nSET LOCAL idealab.profile_rollback_check_phase='installed';\n" + sqlSources[6]
        + "\nSET LOCAL idealab.profile_rollback_check_phase='restored';\n" : source)
      .join('\nSET LOCAL ROLE postgres;\n') + '\nSET LOCAL ROLE postgres; SET CONSTRAINTS ALL IMMEDIATE; ROLLBACK;\n'
    + "SELECT to_regnamespace('idealab_private') IS NULL AND to_regclass('auth.users') IS NULL;\n", {flag:'wx',mode:0o600});
  const application = await run('psql', [...args, '--file', sqlFile], {env:{...environment,PGPASSFILE:passfile},timeout:60000});
  assert(application.stdout.trim().endsWith('t'), 'Application fixture/schema must roll back completely.');
  summary.checks.profileSqlFixturesAndAssertions = true;
  summary.checks.applicationTransactionRolledBack = true;
  summary.checks.persistedBaselinePrivateAndOwnerBound = true;
  stage = 'shared-public-profile-sql';
  const publicProfileSqlFile = join(clusterReal, 'public-profile-checks.sql');
  const publicProfileSql = "BEGIN; SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='5s';\n"
    + sqlSources[0] + '\nSET LOCAL ROLE postgres;\n' + sqlSources[1]
    + '\nSET LOCAL ROLE postgres;\n' + publicProfileSources[0]
    + '\nSET LOCAL ROLE postgres;\n' + publicProfileSources[1]
    + '\nSET LOCAL ROLE postgres;\n' + publicProfileSources[2]
    + '\nSAVEPOINT public_profile_pristine;\n' + publicProfileSources[3]
    + '\nSET LOCAL ROLE postgres;\n' + publicProfileSources[5]
    + '\nSET LOCAL ROLE postgres;\n' + publicProfileSources[6]
    + '\nROLLBACK TO SAVEPOINT public_profile_pristine; RELEASE SAVEPOINT public_profile_pristine;\n'
    + publicProfileSources[3] + '\nSET LOCAL ROLE postgres;\n' + publicProfileSources[4]
    + "\nROLLBACK; SELECT to_regnamespace('idealab_private') IS NULL AND to_regclass('auth.users') IS NULL;\n";
  await writeFile(publicProfileSqlFile, publicProfileSql, { flag: 'wx', mode: 0o600 });
  const publicProfileResult = await run('psql', [...args, '--file', publicProfileSqlFile], { env: { ...environment, PGPASSFILE: passfile }, timeout: 90000 });
  assert(publicProfileResult.stdout.trim().endsWith('t'), 'Public profile candidate, behavior checks and pristine rollback must leave no fixture schema.');
  summary.checks.publicProfileCandidateAndBehavior = true;
  summary.checks.publicProfilePristineRollback = true;
  summary.checks.publicProfileLegacyPrivacyAndAnonymousProjection = true;
  summary.checks.publicProfileOwnerEligibilityAndDirectDmlDenial = true;
  stage = 'normalized-duplicate-preflight';
  const candidateLiteral = '$idealab_disposable_candidate$';
  assert(!sqlSources[1].includes(candidateLiteral), 'Candidate literal delimiter must not occur in SQL.');
  const duplicateFile = join(clusterReal, 'duplicate-check.sql');
  await writeFile(duplicateFile, "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s';\n"
    + sqlSources[0]
    + "\nSET LOCAL ROLE postgres; UPDATE public.users SET college_roll='mdl00ts001' WHERE id='00000000-0000-4000-8000-000000000002';\n"
    + 'DO $duplicate_test$ BEGIN BEGIN EXECUTE ' + candidateLiteral + sqlSources[1] + candidateLiteral
    + "; RAISE EXCEPTION 'duplicate migration unexpectedly succeeded'; EXCEPTION WHEN raise_exception THEN "
    + "IF SQLERRM <> 'legacy registration comparison conflict; reconcile before rollout' THEN RAISE; END IF; END; "
    + "IF to_regnamespace('idealab_private') IS NOT NULL OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='profile_revision') THEN RAISE EXCEPTION 'rejected migration retained DDL'; END IF; END $duplicate_test$;\nROLLBACK;\nSELECT to_regnamespace('auth') IS NULL;\n",
    {flag:'wx',mode:0o600});
  const duplicateResult = await run('psql', [...args, '--file', duplicateFile], {env:{...environment,PGPASSFILE:passfile},timeout:60000});
  assert(duplicateResult.stdout.trim().endsWith('t'), 'Rejected duplicate fixture must roll back fully.');
  summary.checks.normalizedDuplicateMigrationRejected = true;
  stage = 'pristine-operational-rollback';
  const rollbackFile = join(clusterReal, 'rollback-check.sql');
  const maintenance = "SET LOCAL ROLE postgres; SET LOCAL idealab.profile_rollback_maintenance='clients_offline'; SET LOCAL idealab.profile_rollback_provenance='reviewed-local-fixture';\n";
  await writeFile(rollbackFile, "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s';\n"
    + sqlSources[0] + '\n' + maintenance
    + "SET LOCAL idealab.profile_rollback_action='capture';\n" + sqlSources[5]
    + '\n' + sqlSources[1] + "\nSET LOCAL idealab.profile_rollback_action='rollback';\n"
    + sqlSources[5] + '\n' + sqlSources[6]
    + "\nROLLBACK; SELECT to_regnamespace('auth') IS NULL;\n", {flag:'wx',mode:0o600});
  const rollbackResult = await run('psql', [...args, '--file', rollbackFile], {env:{...environment,PGPASSFILE:passfile},timeout:60000});
  assert(rollbackResult.stdout.trim().endsWith('t'), 'Pristine rollback fixture must clean up fully.');
  summary.checks.pristineOperationalRollback = true;
  stage = 'committed-pristine-rollback';
  // This database exists only in the verified disposable cluster. Keeping the
  // psql connection open preserves its protected TEMP snapshot across COMMIT.
  await sql('CREATE DATABASE idealab_pristine_rollback');
  await appendFile(passfile, `127.0.0.1:${port}:idealab_pristine_rollback:${username}:${password}\n`);
  const committedFile = join(clusterReal, 'committed-rollback-check.sql');
  await writeFile(committedFile, "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s';\n"
    + sqlSources[0] + '\n' + maintenance
    + "SET LOCAL idealab.profile_rollback_action='capture';\n" + sqlSources[5]
    + '\n' + sqlSources[1] + '\nCOMMIT;\n'
    + "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s'; SET LOCAL idealab.sql_fixture_only='true';\n"
    + maintenance + "SET LOCAL idealab.profile_rollback_action='rollback';\n"
    + sqlSources[5] + '\n' + sqlSources[6] + '\nCOMMIT;\n'
    + "SELECT to_regnamespace('idealab_private') IS NULL AND to_regclass('auth.users') IS NOT NULL;\n", {flag:'wx',mode:0o600});
  const committedResult = await run('psql', [...args.map(arg => arg === '--dbname=postgres' ? '--dbname=idealab_pristine_rollback' : arg), '--file', committedFile], {env:{...environment,PGPASSFILE:passfile},timeout:60000});
  assert(committedResult.stdout.trim().endsWith('t'), 'Committed pristine installation must restore its exact baseline.');
  await sql('DROP DATABASE idealab_pristine_rollback');
  // These NOLOGIN fixture roles were committed only for the separate database
  // rehearsal. All their owned objects disappeared with that disposable DB.
  await sql('DROP ROLE postgres, anon, authenticated, service_role');
  summary.checks.committedPristineOperationalRollback = true;
  stage = 'reconnected-persisted-rollback';
  await sql('CREATE DATABASE idealab_persisted_rollback');
  await appendFile(passfile, `127.0.0.1:${port}:idealab_persisted_rollback:${username}:${password}\n`);
  const persistedArgs = args.map(arg => arg === '--dbname=postgres' ? '--dbname=idealab_persisted_rollback' : arg);
  const installFile = join(clusterReal, 'persisted-install.sql');
  await writeFile(installFile, 'BEGIN;\n' + sqlSources[0] + '\nSET LOCAL ROLE postgres;\n'
    + sqlSources[1] + '\nCOMMIT;\n', {flag:'wx',mode:0o600});
  await run('psql', [...persistedArgs,'--file',installFile], {env:{...environment,PGPASSFILE:passfile},timeout:60000});
  const reconnectFile = join(clusterReal, 'persisted-reconnect-rollback.sql');
  await writeFile(reconnectFile, "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s'; SET LOCAL ROLE postgres; SET LOCAL idealab.sql_fixture_only='true'; SET LOCAL idealab.profile_rollback_check_phase='installed';\n"
    + sqlSources[6]
    + "\nSET LOCAL idealab.profile_rollback_maintenance='clients_offline'; SET LOCAL idealab.profile_rollback_provenance='shared-profile-contract-v1-reviewed-preinstall'; SET LOCAL idealab.profile_rollback_action='persisted-rollback';\n"
    + sqlSources[5] + "\nSET LOCAL idealab.profile_rollback_check_phase='restored';\n" + sqlSources[6]
    + "\nCOMMIT; SELECT to_regnamespace('idealab_private') IS NULL AND to_regclass('auth.users') IS NOT NULL;\n", {flag:'wx',mode:0o600});
  const reconnected = await run('psql', [...persistedArgs,'--file',reconnectFile], {env:{...environment,PGPASSFILE:passfile},timeout:60000});
  assert(reconnected.stdout.trim().endsWith('t'), 'A new administrative connection must restore the committed pristine baseline.');
  await sql('DROP DATABASE idealab_persisted_rollback');
  await sql('DROP ROLE postgres, anon, authenticated, service_role');
  summary.checks.reconnectedCommittedPersistedRollback = true;
  stage = 'rollback-refusal';
  const rollbackLiteral = '$idealab_rollback_source$';
  assert(!sqlSources[5].includes(rollbackLiteral));
  const expectRollbackRefusal = message => 'DO $refusal_test$ BEGIN BEGIN EXECUTE '
    + rollbackLiteral + sqlSources[5] + rollbackLiteral
    + "; RAISE EXCEPTION 'rollback unexpectedly succeeded'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> '"
    + message + "' THEN RAISE; END IF; END; END $refusal_test$;\n";
  const refusalFile = join(clusterReal, 'rollback-refusal.sql');
  await writeFile(refusalFile, "BEGIN; SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='3s';\n"
    + sqlSources[0] + '\n' + maintenance
    + "SET LOCAL idealab.profile_rollback_action='rollback';\n"
    + expectRollbackRefusal('genuine original session snapshot required; use forward fix')
    + "SET LOCAL idealab.profile_rollback_action='capture';\n" + sqlSources[5]
    + '\n' + sqlSources[1]
    + "\nUPDATE public.users SET institution='Synthetic postinstall entry' WHERE id='00000000-0000-4000-8000-000000000002';\n"
    + "SET LOCAL idealab.profile_rollback_action='rollback';\n"
    + expectRollbackRefusal('postinstall account/claim activity detected; rollback refused, preserve data and forward fix')
    + "DO $preserved$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.users WHERE institution='Synthetic postinstall entry') OR to_regnamespace('idealab_private') IS NULL THEN RAISE EXCEPTION 'refused rollback discarded state'; END IF; END $preserved$;\n"
    + "ROLLBACK; SELECT to_regnamespace('auth') IS NULL;\n", {flag:'wx',mode:0o600});
  const refusal = await run('psql', [...args, '--file', refusalFile], {env:{...environment,PGPASSFILE:passfile},timeout:60000});
  assert(refusal.stdout.trim().endsWith('t'), 'Rollback refusal fixtures must clean up.');
  summary.checks.rollbackWithoutSnapshotRefused = true;
  summary.checks.rollbackAfterNewDataRefusedAndDataPreserved = true;
  stage = 'concurrent-profile-saves';
  await sql('CREATE DATABASE idealab_account_concurrency');
  await appendFile(passfile, `127.0.0.1:${port}:idealab_account_concurrency:${username}:${password}\n`);
  const concurrencyArgs = args.map(arg => arg === '--dbname=postgres' ? '--dbname=idealab_account_concurrency' : arg);
  const bootstrapFile = join(clusterReal, 'concurrency-bootstrap.sql');
  await writeFile(bootstrapFile, 'BEGIN;\n' + sqlSources[0] + '\nSET LOCAL ROLE postgres;\n'
    + sqlSources[1] + '\nCOMMIT;\n', {flag:'wx',mode:0o600});
  await run('psql', [...concurrencyArgs,'--file',bootstrapFile], {env:{...environment,PGPASSFILE:passfile}});
  const concurrentSql = (command, app = 'idealab_fixture_observer') => run('psql', [...concurrencyArgs,'--command',command], {env:{...environment,PGPASSFILE:passfile,PGAPPNAME:app},timeout:20000});
  const poll = async (command, query = concurrentSql) => {
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      if ((await query(command)).stdout.trim() === 't') return true;
      await new Promise(done => setTimeout(done,25));
    }
    return false;
  };
  const identitySql = "SET LOCAL request.jwt.claims='{}'; SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';";
  const payload = {name:'Synthetic first writer',phone:'+12025550102',college_roll:'MDL00TS002',institution:'Model Engineering College',department:'Synthetic testing',study_year:2};
  const saveSql = name => "SELECT row_to_json(r) FROM public.save_own_profile_v1('"
    + JSON.stringify({...payload,name}) + "'::jsonb,'0') r;";
  let contender;
  const holder = concurrentSql("BEGIN; SET LOCAL ROLE postgres; SET LOCAL statement_timeout='10s'; "
    + "SELECT 1 FROM public.users WHERE id='00000000-0000-4000-8000-000000000002' FOR UPDATE; SELECT pg_sleep(3); "
    + "SET LOCAL ROLE authenticated; " + identitySql + saveSql(payload.name) + ' COMMIT;', 'idealab_fixture_holder')
    .then(value => ({value}), error => ({error}));
  try {
    assert(await poll("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='idealab_fixture_holder' AND wait_event='PgSleep')"), 'The first independent connection must hold its account row lock.');
    contender = concurrentSql("BEGIN; SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='7s'; SET LOCAL ROLE authenticated; "
      + identitySql + saveSql('Synthetic stale writer') + ' COMMIT;', 'idealab_fixture_contender')
      .then(value => ({value}), error => ({error}));
    assert(await poll("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='idealab_fixture_contender' AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0)"), 'The second independent connection must observably block on the first.');
    const [first, second] = await Promise.all([holder,contender]);
    if (first.error) throw first.error;
    if (second.error) throw second.error;
    const result = output => JSON.parse(output.stdout.trim().split(/\r?\n/).filter(line => line.startsWith('{')).at(-1));
    assert.deepEqual(result(first.value), {status:'saved',profile_revision:'1'});
    assert.deepEqual(result(second.value), {status:'conflict',profile_revision:'1'});
    const final = await concurrentSql("SELECT name='Synthetic first writer' AND profile_revision=1 FROM public.users WHERE id='00000000-0000-4000-8000-000000000002'");
    assert.equal(final.stdout.trim(),'t','A stale concurrent save must not overwrite the acknowledged writer.');
    summary.checks.concurrentProfileSavesObservedAndSerialized = true;
  } finally {
    await holder;
    if (contender) await contender;
  }
  stage = 'concurrent-registration-claims';
  await concurrentSql("BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims='{}'; SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000003'; "
    + "DO $prepare$ DECLARE r record; BEGIN SELECT * INTO r FROM public.save_own_profile_v1('"
    + JSON.stringify({...payload,name:'Synthetic claim competitor',college_roll:'MDL00TS003'})
    + "','0'); IF r.status<>'saved' OR r.profile_revision<>'1' THEN RAISE EXCEPTION 'claim competitor preparation failed'; END IF; END $prepare$; COMMIT;");
  const claimSql = "SELECT row_to_json(r) FROM public.claim_mec_registration_v1('MDL00TS099','1',true) r;";
  let claimContender;
  const claimHolder = concurrentSql("BEGIN; SET LOCAL statement_timeout='10s'; SET LOCAL ROLE authenticated; "
    + identitySql + claimSql + ' SELECT pg_sleep(3); COMMIT;', 'idealab_claim_holder')
    .then(value => ({value}), error => ({error}));
  try {
    assert(await poll("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='idealab_claim_holder' AND wait_event='PgSleep')"), 'First claim must hold an uncommitted unique reservation.');
    claimContender = concurrentSql("BEGIN; SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='7s'; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims='{}'; SET LOCAL request.jwt.claim.sub='00000000-0000-4000-8000-000000000003'; "
      + claimSql + ' COMMIT;', 'idealab_claim_contender').then(value => ({value}),error => ({error}));
    assert(await poll("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='idealab_claim_contender' AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0)"), 'Competing claim must observably block on the unique reservation.');
    const [winner,loser] = await Promise.all([claimHolder,claimContender]);
    if (winner.error) throw winner.error;
    if (loser.error) throw loser.error;
    const result = output => JSON.parse(output.stdout.trim().split(/\r?\n/).filter(line => line.startsWith('{')).at(-1));
    assert.deepEqual(result(winner.value),{status:'claimed',profile_revision:'2'});
    assert.deepEqual(result(loser.value),{status:'not_claimed',profile_revision:'1'});
    const invariants = await concurrentSql("SELECT (SELECT count(*) FROM idealab_private.mec_registration_claims_v1 WHERE claim_state='current')=1 AND NOT EXISTS(SELECT 1 FROM idealab_private.mec_registration_claims_v1 WHERE claim_state='pending') AND (SELECT cardinality(collision_times) FROM idealab_private.mec_registration_collision_state_v1 WHERE user_id='00000000-0000-4000-8000-000000000003')=1 AND (SELECT college_roll='MDL00TS003' AND profile_revision=1 FROM public.users WHERE id='00000000-0000-4000-8000-000000000003')");
    assert.equal(invariants.stdout.trim(),'t','The losing claim must preserve its profile and record one generic collision.');
    summary.checks.concurrentClaimsObservedOneWinnerAndPreservedLoser = true;
  } finally {
    await claimHolder;
    if (claimContender) await claimContender;
  }
  await sql('DROP DATABASE idealab_account_concurrency');
  await sql('DROP ROLE postgres, anon, authenticated, service_role');
  stage = 'concurrent-public-profile-first-saves';
  await sql('CREATE DATABASE idealab_public_profile_concurrency');
  await appendFile(passfile, `127.0.0.1:${port}:idealab_public_profile_concurrency:${username}:${password}\n`);
  const publicRaceArgs = args.map(arg => arg === '--dbname=postgres' ? '--dbname=idealab_public_profile_concurrency' : arg);
  const publicRaceBootstrap = join(clusterReal, 'public-profile-concurrency-bootstrap.sql');
  await writeFile(publicRaceBootstrap, 'BEGIN;\n' + sqlSources[0] + '\nSET LOCAL ROLE postgres;\n'
    + sqlSources[1] + '\nSET LOCAL ROLE postgres;\n' + publicProfileSources.slice(0,4).join('\nSET LOCAL ROLE postgres;\n')
    + '\nCOMMIT;\n', { flag:'wx', mode:0o600 });
  await run('psql', [...publicRaceArgs,'--file',publicRaceBootstrap], { env:{...environment,PGPASSFILE:passfile},timeout:60000 });
  const publicRaceSql = (command, app = 'idealab_public_profile_observer') => run('psql', [...publicRaceArgs,'--command',command], {
    env:{...environment,PGPASSFILE:passfile,PGAPPNAME:app},timeout:20000,
  });
  const publicPayload = { display_name:'Synthetic public first writer',bio:'First accepted snapshot',interests:[],skills:[],links:[],visibility:'public' };
  const publicSaveSql = (value, revision) => "SELECT public.save_own_public_profile_v1('" + JSON.stringify(value) + "'::jsonb," + revision + ');';
  const publicResult = output => JSON.parse(output.stdout.trim().split(/\r?\n/).filter(line => line.startsWith('{')).at(-1));
  const observePublicRace = async ({holderSql,contenderSql,holderName,contenderName}) => {
    let second;
    const first = publicRaceSql(holderSql,holderName).then(value => ({value}),error => ({error}));
    try {
      assert(await poll("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='" + holderName + "' AND wait_event='PgSleep')",publicRaceSql), 'Public-profile holder must observably retain its account lock.');
      second = publicRaceSql(contenderSql,contenderName).then(value => ({value}),error => ({error}));
      assert(await poll("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='" + contenderName + "' AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid))>0)",publicRaceSql), 'Public-profile contender must observably block on the holder.');
      const [winner,loser] = await Promise.all([first,second]);
      if (winner.error) throw winner.error;
      if (loser.error) throw loser.error;
      return [publicResult(winner.value),publicResult(loser.value)];
    } finally {
      await first;
      if (second) await second;
    }
  };
  const publicBegin = "BEGIN; SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='7s'; ";
  const [firstPublicSave,staleFirstSave] = await observePublicRace({
    holderName:'idealab_public_first_holder',contenderName:'idealab_public_first_contender',
    holderSql:publicBegin + "SET LOCAL ROLE postgres; SELECT 1 FROM public.users WHERE id='00000000-0000-4000-8000-000000000002' FOR UPDATE; SELECT pg_sleep(3); SET LOCAL ROLE authenticated; "
      + identitySql + publicSaveSql(publicPayload,0) + ' COMMIT;',
    contenderSql:publicBegin + 'SET LOCAL ROLE authenticated; ' + identitySql
      + publicSaveSql({...publicPayload,display_name:'Synthetic losing first writer'},0) + ' COMMIT;',
  });
  assert.equal(firstPublicSave.status,'saved');
  assert.equal(staleFirstSave.status,'conflict');
  assert.equal(firstPublicSave.profile.revision,'1');
  assert.deepEqual(staleFirstSave.profile,firstPublicSave.profile,'Losing first save must return the same stable public ID and accepted snapshot.');
  assert.match(firstPublicSave.profile.public_id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const firstInvariant = await publicRaceSql("SELECT count(*)=1 AND bool_and(public_revision_v1=1 AND public_initialized_v1 AND public_id_v1='"
    + firstPublicSave.profile.public_id + "'::uuid AND public_display_name_v1='Synthetic public first writer') FROM public.user_profiles WHERE user_id='00000000-0000-4000-8000-000000000002'");
  assert.equal(firstInvariant.stdout.trim(),'t','Concurrent first saves create exactly one initialized profile.');
  summary.checks.concurrentPublicProfileFirstSavesObservedOneWinnerStableId = true;
  stage = 'concurrent-public-profile-visibility';
  const [privacySave,staleRepublish] = await observePublicRace({
    holderName:'idealab_public_privacy_holder',contenderName:'idealab_public_stale_contender',
    holderSql:publicBegin + 'SET LOCAL ROLE authenticated; ' + identitySql
      + publicSaveSql({...publicPayload,visibility:'private'},1) + ' SELECT pg_sleep(3); COMMIT;',
    contenderSql:publicBegin + 'SET LOCAL ROLE authenticated; ' + identitySql
      + publicSaveSql({...publicPayload,bio:'Stale content would republish'},1) + ' COMMIT;',
  });
  assert.equal(privacySave.status,'saved');
  assert.equal(privacySave.profile.revision,'2');
  assert.equal(privacySave.profile.visibility,'private');
  assert.equal(staleRepublish.status,'conflict');
  assert.deepEqual(staleRepublish.profile,privacySave.profile,'A stale public snapshot must preserve the accepted privacy change.');
  assert.equal(privacySave.profile.public_id,firstPublicSave.profile.public_id);
  const visibilityInvariant = await publicRaceSql("SELECT public_revision_v1=2 AND public_visibility_v1='private' AND public_bio_v1='First accepted snapshot' FROM public.user_profiles WHERE user_id='00000000-0000-4000-8000-000000000002'");
  assert.equal(visibilityInvariant.stdout.trim(),'t','Blocked stale save cannot overwrite private visibility or biography.');
  const hiddenPublicRead = publicResult(await publicRaceSql("BEGIN; SET LOCAL ROLE anon; SET LOCAL request.jwt.claim.sub=''; SELECT public.get_public_profile_v1('" + firstPublicSave.profile.public_id + "'::uuid); COMMIT;"));
  assert.deepEqual(hiddenPublicRead,{status:'not_found'},'Anonymous read stays hidden after concurrent stale republish attempt.');
  summary.checks.concurrentPublicProfilePrivacySaveBlocksStaleRepublish = true;
  await sql('DROP DATABASE idealab_public_profile_concurrency');
  await sql('DROP ROLE postgres, anon, authenticated, service_role');
  summary.sqlFiles = [...fixedFiles, ...publicProfileFiles];
  summary.sourceSha256 = sourceSha256;
  summary.runnerSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
  summary.database.icuVersion = (await sql("select collversion from pg_collation where collprovider='i' order by oid limit 1")).stdout.trim();

} catch (error) {
  // Do not forward native command errors: their argument/env records may contain
  // sensitive process context. This harness handles only its synthetic cluster.
  failure = error instanceof assert.AssertionError ? error.message : 'Disposable SQL validation failed; no shared database was accessed.';
  summary.failure = { stage, code: error.code ?? null, signal: error.signal ?? null };
  if (['identity','shared-profile-sql','shared-public-profile-sql','normalized-duplicate-preflight','pristine-operational-rollback','committed-pristine-rollback','rollback-refusal'].includes(stage)) summary.failure.diagnostic = String(error.stderr ?? '').replaceAll(password, '[redacted]').replaceAll(username, '[scratch-user]').split(/\r?\n/).filter(line => /ERROR:|FATAL:|CONTEXT:|PL\/pgSQL|LINE \d/.test(line)).slice(0,8).join('\n').slice(0,1500);
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
