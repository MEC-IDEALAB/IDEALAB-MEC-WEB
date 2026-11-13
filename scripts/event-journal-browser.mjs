// Real browser storage tests only. No Supabase or auth is simulated.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import ts from 'typescript';
const modules = {};
for (const name of ['event-contract', 'management-contract', 'pending-event']) {
  const source = await readFile(new URL(`../src/features/events/${name}.ts`, import.meta.url), 'utf8');
  modules[name] = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
}
const server = createServer((_, response) => { response.writeHead(200, { 'content-type': 'text/html' }); response.end('<!doctype html><title>Event journal tests</title>'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const pages = await Promise.all([context.newPage(), context.newPage()]);
  async function install(page) {
    await page.evaluate(async sources => {
      const urls = {};
      for (const [name, source] of Object.entries(sources)) {
        let code = source;
        for (const [dependency, url] of Object.entries(urls)) code = code.replaceAll(`'./${dependency}.ts'`, `'${url}'`).replaceAll(`"./${dependency}.ts"`, `"${url}"`);
        urls[name] = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      }
      window.eventsJournal = await import(urls['pending-event']);
    }, modules);
  }
  await Promise.all(pages.map(async page => { await page.goto(`http://127.0.0.1:${server.address().port}`); await install(page); }));
  const accountId = '00000000-0000-0000-0000-000000000002', scopeId = '20000000-0000-0000-0000-000000000001';
  const details = { title: 'Synthetic event', description: 'A synthetic workshop for journal testing.', venue: 'Test room', event_type: 'workshop', event_date: '2099-11-03T09:00:00Z', end_date: null, capacity: 20, audience: 'open', attendee_visibility: 'registered', fee_paise: '0' };
  const first = { accountId, scopeId, commandId: '11111111-1111-4111-8111-111111111111', command: { action: 'create', scope_id: scopeId, details } };
  const second = { ...first, commandId: '22222222-2222-4222-8222-222222222222', command: { ...first.command, details: { ...details, title: 'Other tab event' } } };
  const results = await Promise.all(pages.map((page, index) => page.evaluate(value => window.eventsJournal.preparePendingEvent(value), index ? second : first)));
  assert.equal(results[0].status, 'ready'); assert.deepEqual(results[0], results[1], 'one account slot across tabs');
  const winner = results[0].pending;
  assert.equal(await pages[0].evaluate(value => window.eventsJournal.markPendingEvent(value), winner), true);
  await pages[1].reload(); await install(pages[1]);
  assert.deepEqual((await pages[1].evaluate(id => window.eventsJournal.readPendingEvent(id), accountId)).pending, winner, 'reload retains exact details');
  assert.equal((await pages[1].evaluate(id => window.eventsJournal.readPendingEvent(id), '00000000-0000-0000-0000-000000000003')).status, 'empty', 'account isolation');
  assert.equal(await pages[0].evaluate(value => window.eventsJournal.clearPendingEvent(value.accountId, value.commandId), winner.commandId === first.commandId ? second : first), false, 'no wrong-command cleanup');
  assert.equal(await pages[0].evaluate(value => window.eventsJournal.clearPendingEvent(value.accountId, value.commandId), winner), true);
  assert.equal((await pages[1].evaluate(id => window.eventsJournal.readPendingEvent(id), accountId)).status, 'empty');
  // A stale tab can retain a confirmed command after another tab removed it.
  assert.equal(await pages[1].evaluate(value => window.eventsJournal.markPendingEvent(value), winner), true);
  assert.equal(await pages[1].evaluate(value => window.eventsJournal.clearPendingEvent(value.accountId, value.commandId), winner), true, 'confirmed stale tab clears matching orphan marker');
  assert.equal((await pages[0].evaluate(id => window.eventsJournal.readPendingEvent(id), accountId)).status, 'empty');
  const newPending = await pages[0].evaluate(value => window.eventsJournal.preparePendingEvent(value), second);
  assert.equal(await pages[0].evaluate(value => window.eventsJournal.markPendingEvent(value), newPending.pending), true);
  const oldId = second.commandId === winner.commandId ? first.commandId : winner.commandId;
  assert.equal(await pages[1].evaluate(({ accountId, oldId }) => window.eventsJournal.clearPendingEvent(accountId, oldId), { accountId, oldId }), false, 'old confirmation cannot remove newer command');
  assert.equal((await pages[0].evaluate(id => window.eventsJournal.readPendingEvent(id), accountId)).pending.commandId, second.commandId);
  assert.equal(await pages[0].evaluate(value => window.eventsJournal.clearPendingEvent(value.accountId, value.commandId), second), true);
  const evicted = await pages[0].evaluate(async value => {
    await window.eventsJournal.preparePendingEvent(value);
    if (!window.eventsJournal.markPendingEvent(value)) return false;
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('idealab-mec-validation-event-journal-v1', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('pending', 'readwrite');
        tx.objectStore('pending').delete(value.accountId);
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = tx.onerror = () => reject(tx.error);
      };
    });
    return (await window.eventsJournal.readPendingEvent(value.accountId)).status === 'unavailable'
      && (await window.eventsJournal.preparePendingEvent(value)).status === 'unavailable';
  }, first);
  assert(evicted, 'surviving marker blocks create when journal row disappears');
  const unavailable = await pages[1].evaluate(async value => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
    return window.eventsJournal.preparePendingEvent(value);
  }, { ...first, accountId: '00000000-0000-0000-0000-000000000003' });
  assert.equal(unavailable.status, 'unavailable', 'blocked storage never authorizes a send');
  await context.close();
  console.log('PASS: event journal cross-tab, exact retry, reload, account isolation, conditional cleanup, eviction and blocked storage.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
