import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchSupabase } from '../src/lib/supabase-fetch.ts';

const url = 'data:text/plain,ready';

test('Supabase fetch preserves cancellation from explicit options and Request objects', async () => {
  const reason = new Error('caller cancelled');
  const signal = AbortSignal.abort(reason);
  await assert.rejects(fetchSupabase(url, { signal }), error => error === reason);
  await assert.rejects(fetchSupabase(new Request(url, { signal })), error => error === reason);
  assert.equal(await (await fetchSupabase(url)).text(), 'ready');
});
