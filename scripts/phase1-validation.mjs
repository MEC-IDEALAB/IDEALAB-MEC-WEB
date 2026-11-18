// Isolated regression runner. These SDK fixtures do not contact Supabase.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const project = fileURLToPath(new URL('../', import.meta.url));
const suites = ['auth-entry', 'recovery-authority', 'recovery-update', 'active-session'];
const relevant = ['src/lib/config.ts','src/lib/auth-config.ts','src/lib/auth-entry.ts',
  'src/lib/recovery-authority.ts','src/app/auth/actions.ts','src/lib/local-auth-exit.ts',
  'src/lib/active-session.ts','src/app/app/projects/page.tsx'];
const report = { capturedAt: new Date().toISOString(), node: process.version,
  configuredEnvironment: 'validation', intendedValidationProject: 'gvvqlfachzbufstzoiwi',
  verificationLevel: 'Local regression tests with explicit SDK fixtures; no network or database acceptance.',
  sourceHashes: {}, suites: [] };
for (const path of relevant) report.sourceHashes[path] = createHash('sha256')
  .update(await readFile(new URL('../'+path, import.meta.url))).digest('hex');
for (const name of suites) {
  const path = 'scripts/'+name+'.test.mjs';
  report.sourceHashes[path] = createHash('sha256').update(await readFile(new URL('../'+path, import.meta.url))).digest('hex');
  let result;
  try {
    result = await execute(process.execPath, [path], { cwd: project,
      env: { ...process.env, ACCOUNT_ENVIRONMENT: 'validation' }, encoding: 'utf8', windowsHide: true });
    result.exitCode = 0;
  } catch (error) {
    result = { stdout: error.stdout ?? '', stderr: error.stderr ?? '', exitCode: error.code ?? 1 };
  }
  report.suites.push({ name, command: 'node '+path, ...result });
  console.log(name+': exit '+result.exitCode);
}
const directory = new URL('../docs/research/', import.meta.url);
await mkdir(directory, {recursive:true});
await writeFile(new URL('phase1-validation-2026-11-06.json', directory), JSON.stringify(report,null,2)+'\n');
assert(report.suites.every(s => s.exitCode===0), 'All requested suites must pass.');
