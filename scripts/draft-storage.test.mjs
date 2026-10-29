import test from 'node:test';
import assert from 'node:assert/strict';
import { readSavedDraft, deleteSavedDraft, draftStorageKey, saveDraft } from '../src/features/requests/draft-storage.ts';
const draft = { kind: 'machine', serviceId: '', title: 'Draft fixture', details: 'Local draft fixture only', preferredTime: '', references: [] };
function storage() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }

test('approved intake choices round-trip without treating cross-kind services as valid', () => {
  const local=storage();
  assert.equal(saveDraft('account-a',{...draft,serviceId:'cnc'},local),'saved');
  assert.equal(readSavedDraft('account-a',local).draft.serviceId,'cnc');
  assert.equal(saveDraft('account-a',{...draft,kind:'operations',serviceId:'ics'},local),'saved');
  assert.equal(readSavedDraft('account-a',local).draft.serviceId,'ics');
  assert.equal(saveDraft('account-a',{...draft,kind:'operations',serviceId:'cnc'},local),'invalid');
  assert.equal(readSavedDraft('account-a',local).draft.serviceId,'ics','invalid change preserves prior draft');
});
test('existing version-one draft is readable only through its account key', () => {
  const local = storage(); local.setItem(draftStorageKey('account-a'), JSON.stringify({version:1,draft}));
  assert.equal(readSavedDraft('account-a', local).status, 'found');
  assert.equal(readSavedDraft('account-b', local).status, 'empty');
  deleteSavedDraft('account-b', local);
  assert.equal(readSavedDraft('account-a', local).status, 'found');
});
test('legacy v1 drafts without references restore and new saves include timestamp metadata', () => {
  const local = storage(); const key = draftStorageKey('account-a');
  local.setItem(key, JSON.stringify({version:1,draft:{kind:'machine',serviceId:'sample-3d',title:'Legacy',details:'An existing local draft without references',preferredTime:''}}));
  const legacy = readSavedDraft('account-a', local);
  assert.equal(legacy.status, 'found');
  if (legacy.status === 'found') assert.deepEqual(legacy.draft.references, []);
  assert.equal(saveDraft('account-a', {...draft, references:['https://example.edu/project']}, local), 'saved');
  const saved = readSavedDraft('account-a', local);
  assert.equal(saved.status, 'found');
  if (saved.status === 'found') {
    assert.ok(saved.savedAt);
    assert.ok(Number.isFinite(Date.parse(saved.savedAt)));
    assert.deepEqual(saved.draft.references, ['https://example.edu/project']);
  }
});
test('legacy draft with an empty IDNA label can be recovered and corrected without overwriting it', () => {
  const local = storage(); const key = draftStorageKey('account-a');
  for (const reference of ['https://xn--/', 'https://%78%6e--/', 'https://xn--.example.com/', 'https://xn--%2eexample.com/', 'https://example.com%2exn--/']) {
    const raw = JSON.stringify({version:1,draft:{...draft,references:[reference]}});
    local.setItem(key, raw);
    const restored = readSavedDraft('account-a', local);
    assert.equal(restored.status, 'found');
    assert.equal(restored.draft.title, draft.title);
    assert.deepEqual(restored.draft.references, [reference]);
    assert.equal(saveDraft('account-a', restored.draft, local), 'invalid');
    assert.equal(local.getItem(key), raw);
    assert.equal(saveDraft('account-a', {...restored.draft, references:['https://example.edu/']}, local), 'saved');
    assert.deepEqual(readSavedDraft('account-a', local).draft.references, ['https://example.edu/']);
  }
});
test('corrupt, unsupported and unsafe drafts remain preserved for explicit recovery', () => {
  const local = storage(); const key = draftStorageKey('account-a');
  for (const raw of [
    '{broken',
    JSON.stringify({version:1,draft:{...draft,title:'x'.repeat(121)}}),
    JSON.stringify({version:2,draft}),
    JSON.stringify({version:1,draft:{...draft,serviceId:'unsupported-service'}}),
    JSON.stringify({version:3,draft}),
    JSON.stringify({version:1,draft:null}),
    JSON.stringify({version:1,draft:{...draft,references:['javascript:alert(1)']}}),
    JSON.stringify({version:1,draft:{...draft,references:['https://user:pass@example.edu/']}}),
    JSON.stringify({version:1,draft:{...draft,references:['https://user:pass@xn--/']}}),
    JSON.stringify({version:1,draft:{...draft,references:Array(6).fill('https://example.edu/')}}),
  ]) {
    local.setItem(key, raw); assert.equal(readSavedDraft('account-a', local).status, 'invalid'); assert.equal(local.getItem(key), raw);
  }
});
test('storage denial remains unavailable, never an empty submitted list', () => {
  const denied = { getItem() { throw Error('denied'); }, removeItem() { throw Error('denied'); } };
  assert.equal(readSavedDraft('account-a', denied).status, 'unavailable');
  assert.equal(deleteSavedDraft('account-a', denied), false);
});
test('quota and invalid saves do not overwrite a valid draft', () => {
  const local = storage(); const key = draftStorageKey('account-a');
  local.setItem(key, JSON.stringify({version:1,draft}));
  assert.equal(saveDraft('account-a', {...draft, references:['mailto:private@example.edu']}, local), 'invalid');
  assert.equal(saveDraft('account-a', {...draft, references:['https://xn--/']}, local), 'invalid');
  assert.equal(readSavedDraft('account-a', local).status, 'found');
  const full = { ...local, setItem() { throw Error('quota'); } };
  assert.equal(saveDraft('account-a', draft, full), 'unavailable');
});
test('preview memory drafts survive same-page reads, isolate accounts and do not persist after deletion', () => {
  assert.equal(saveDraft('design-preview', draft, undefined, 'memory'), 'saved');
  assert.equal(readSavedDraft('design-preview', undefined, 'memory').status, 'found');
  assert.equal(readSavedDraft('another-preview', undefined, 'memory').status, 'empty');
  assert.equal(deleteSavedDraft('design-preview', undefined, 'memory'), true);
  assert.equal(readSavedDraft('design-preview', undefined, 'memory').status, 'empty');
});
