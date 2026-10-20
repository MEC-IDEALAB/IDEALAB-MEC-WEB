import { readdir, readFile, access } from 'node:fs/promises';
import { dirname, resolve, relative, sep, isAbsolute } from 'node:path';

const root = resolve('.');
const files = ['README.md', 'AGENTS.md'];
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await visit(path);
    else if (entry.name.endsWith('.md')) files.push(path);
  }
}
await visit(resolve('docs'));
const errors = [];
let checked = 0;
for (const file of files) {
  const body = await readFile(file, 'utf8');
  for (const match of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, '');
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    target = decodeURIComponent(target.split('#')[0]);
    if (!target) continue;
    const path = resolve(dirname(resolve(file)), target);
    const inside = relative(root, path);
    if (isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`)) { errors.push(`${file}: reference outside standalone repository: ${target}`); continue; }
    try { await access(path); checked++; } catch { errors.push(`${file}: missing ${target}`); }
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${files.length} documentation files; ${checked} local links resolve within the standalone repository.`);
