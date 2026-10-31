import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Vercel builds this app as Next.js and uses the framework output', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.framework, 'nextjs');
  assert.equal(Object.hasOwn(config, 'outputDirectory'), false);
});
