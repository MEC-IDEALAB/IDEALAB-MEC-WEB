import test from 'node:test';
import assert from 'node:assert/strict';
import { readSavedDraft, deleteSavedDraft, draftStorageKey } from '../src/features/requests/draft-storage.ts';
const draft = { kind: 'machine', serviceId: '', title: 'Draft fixture', details: 'Local draft fixture only', preferredTime: '' };
function storage() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }
test('existing version-one draft is readable only through its account key', () => {
  const local = storage(); local.setItem(draftStorageKey('account-a'), JSON.stringify({version:1,draft}));
  assert.equal(readSavedDraft('account-a', local).status, 'found');
  assert.equal(readSavedDraft('account-b', local).status, 'empty');
  deleteSavedDraft('account-b', local);
  assert.equal(readSavedDraft('account-a', local).status, 'found');
});
test('corrupt and out-of-bounds drafts remain preserved for explicit recovery', () => {
  const local = storage(); const key = draftStorageKey('account-a');
  for (const raw of ['{broken', JSON.stringify({version:1,draft:{...draft,title:'x'.repeat(121)}}), JSON.stringify({version:2,draft}), JSON.stringify({version:1,draft:{...draft,serviceId:'unsupported-service'}}), JSON.stringify({version:3,draft}), JSON.stringify({version:1,draft:null})]) {
    local.setItem(key, raw); assert.equal(readSavedDraft('account-a', local).status, 'invalid'); assert.equal(local.getItem(key), raw);
  }
});
test('storage denial remains unavailable, never an empty submitted list', () => {
  const denied = { getItem() { throw Error('denied'); }, removeItem() { throw Error('denied'); } };
  assert.equal(readSavedDraft('account-a', denied).status, 'unavailable');
  assert.equal(deleteSavedDraft('account-a', denied), false);
});
