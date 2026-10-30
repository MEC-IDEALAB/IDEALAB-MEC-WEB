// Focused browser storage check. Synthetic payloads only; no backend requests.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = {};
for (const name of ['sample-catalog', 'request-services', 'draft-storage', 'work-request-contract', 'pending-submission']) {
  const text = await readFile(new URL(`../src/features/requests/${name}.ts`, import.meta.url), 'utf8');
  source[name] = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
}
const server = createServer((_request, response) => { response.writeHead(200, { 'content-type': 'text/html' }); response.end('<!doctype html><title>Storage test</title>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ bypassCSP: true });
  const pages = await Promise.all([context.newPage(), context.newPage()]);
  await Promise.all(pages.map(page => page.goto(base)));
  async function install(page) {
    await page.evaluate(async modules => {
      const urls = {};
      for (const name of ['sample-catalog', 'request-services', 'draft-storage', 'work-request-contract', 'pending-submission']) {
        let code = modules[name];
        for (const [dependency, url] of Object.entries(urls)) code = code.replaceAll(`'./${dependency}.ts'`, `'${url}'`).replaceAll(`"./${dependency}.ts"`, `"${url}"`);
        urls[name] = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      }
      window.journal = await import(urls['pending-submission']);
    }, source);
  }
  await Promise.all(pages.map(install));
  const account = '11111111-2222-4333-8444-555555555555';
  const other = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const fixture = { kind: 'machine', service_id: '3d-printing', title: 'Test request', description: 'A synthetic request for storage testing.', technical_details: '', preferred_at: null, references: [] };
  const ids = ['11111111-aaaa-4aaa-8aaa-111111111111', '22222222-aaaa-4aaa-8aaa-222222222222'];
  const results = await Promise.all(pages.map((page, index) => page.evaluate(({ account, id, fixture }) => window.journal.preparePending(account, id, fixture), { account, id: ids[index], fixture })));
  assert.equal(results[0].status, 'ready');
  assert.deepEqual(results[0].pending, results[1].pending);
  const winner = results[0].pending.commandId;
  const changed = await pages[1].evaluate(({ account, id, fixture }) => window.journal.preparePending(account, id, { ...fixture, title: 'Different request' }), { account, id: ids[1], fixture });
  assert.deepEqual(changed.pending, results[0].pending);
  await pages[0].reload(); await install(pages[0]);
  assert.equal((await pages[0].evaluate(account => window.journal.readPending(account), account)).pending.commandId, winner);
  assert.equal((await pages[1].evaluate(account => window.journal.readPending(account), other)).status, 'empty');
  assert.equal(await pages[1].evaluate(({ account, id }) => window.journal.clearPending(account, id), { account, id: ids.find(id => id !== winner) }), false);
  assert.equal(await pages[0].evaluate(({ account, winner }) => window.journal.clearPending(account, winner), { account, winner }), true);
  assert.equal((await pages[1].evaluate(account => window.journal.readPending(account), account)).status, 'empty');
  const evicted = await pages[1].evaluate(async ({ account, id, fixture }) => {
    const prepared = await window.journal.preparePending(account, id, fixture);
    if (prepared.status !== 'ready' || !window.journal.markPending(prepared.pending)) return false;
    await new Promise((resolve, reject) => {
      const open = indexedDB.open('idealab-mec-validation-request-journal-v1', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('pending', 'readwrite');
        tx.objectStore('pending').delete(account);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
    return (await window.journal.readPending(account)).status === 'unavailable' &&
      (await window.journal.preparePending(account, id, fixture)).status === 'unavailable';
  }, { account: other, id: ids[0], fixture });
  assert.equal(evicted, true);
  assert.deepEqual(await pages[1].evaluate(account => window.journal.recoverableMarkers(account), other), [ids[0]]);
  assert.equal(await pages[1].evaluate(({ account, id }) => window.journal.clearConfirmedMarker(account, id), { account: other, id: ids[0] }), true);
  assert.equal((await pages[1].evaluate(account => window.journal.readPending(account), other)).status, 'empty');
  const protectedOther = await pages[1].evaluate(async ({ account, first, second, fixture }) => {
    const prepared = await window.journal.preparePending(account, first, fixture);
    if (prepared.status !== 'ready' || !window.journal.markPending(prepared.pending)) return false;
    const wrong = await window.journal.clearConfirmedMarker(account, second);
    const stillThere = await window.journal.readPending(account);
    return wrong === false && stillThere.status === 'ready' && stillThere.pending.commandId === first;
  }, { account: other, first: ids[0], second: ids[1], fixture });
  assert.equal(protectedOther, true);
  const staleMarker = await pages[1].evaluate(async ({ account, oldCommand, newCommand }) => {
    localStorage.setItem(`idealab-mec:validation-pending:v1:${account}:${oldCommand}`, '1');
    if ((await window.journal.readPending(account)).status !== 'unavailable') return false;
    if (!await window.journal.clearConfirmedMarker(account, oldCommand)) return false;
    const current = await window.journal.readPending(account);
    return current.status === 'ready' && current.pending.commandId === newCommand;
  }, { account: other, oldCommand: ids[1], newCommand: ids[0] });
  assert.equal(staleMarker, true);
  const cleanupFailure = await pages[1].evaluate(async ({ account, id }) => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => { throw new Error('synthetic failure'); };
    try { return await window.journal.clearConfirmedMarker(account, id); }
    finally { Storage.prototype.removeItem = remove; }
  }, { account: other, id: ids[0] });
  assert.equal(cleanupFailure, false);
  assert.equal((await pages[1].evaluate(account => window.journal.readPending(account), other)).status, 'unavailable');
  const unavailable = await pages[0].evaluate(async ({ account, id, fixture }) => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
    return window.journal.preparePending(account, id, fixture);
  }, { account, id: ids[0], fixture });
  assert.equal(unavailable.status, 'unavailable');
  console.log('IndexedDB cross-tab, reload, account isolation and conditional cleanup checks passed.');
  await context.close();
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
