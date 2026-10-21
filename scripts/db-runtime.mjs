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

const execute = promisify(execFile);
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use the project\'s Node 24 runtime.');
const project = await realpath(fileURLToPath(new URL('../', import.meta.url)));
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
} catch (error) {
  // Do not forward native command errors: their argument/env records may contain
  // sensitive process context. This harness handles only its synthetic cluster.
  failure = error instanceof assert.AssertionError ? error.message : 'Native runtime probe failed; no application or shared database was changed.';
  summary.failure = { stage, code: error.code ?? null, signal: error.signal ?? null };
  if (stage === 'identity') summary.failure.diagnostic = String(error.stderr ?? '').replaceAll(password, '[redacted]').replaceAll(username, '[scratch-user]').trim().slice(-1500);
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
