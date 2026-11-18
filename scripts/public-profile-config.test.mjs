import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/features/profile/public-profile-config.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { publicProfileEnabled } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('public-profile RPCs stay disabled until the shared migration and both clients are accepted', () => {
  const previous = process.env.ENABLE_PUBLIC_PROFILE_V1;
  process.env.ENABLE_PUBLIC_PROFILE_V1 = 'true';
  try {
    assert.equal(publicProfileEnabled(), false);
  } finally {
    if (previous === undefined) delete process.env.ENABLE_PUBLIC_PROFILE_V1;
    else process.env.ENABLE_PUBLIC_PROFILE_V1 = previous;
  }
});
