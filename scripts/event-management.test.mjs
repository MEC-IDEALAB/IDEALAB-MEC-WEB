import test from 'node:test';
import assert from 'node:assert/strict';
import { eventEditorDetails, managementEnabled, parseEventDraftDetails, parseEventManagementCommand, parseEventSaved, parseEventScopes, parseEventDraftList, savedEventMatches, terminalEventRejection } from '../src/features/events/management-contract.ts';
const id = '11111111-1111-4111-8111-111111111111';
const details = () => ({ title: 'A test event', description: 'A workshop description for a synthetic test.', venue: 'Test room', event_type: 'workshop', event_date: '2099-11-03T09:00:00+05:30', end_date: null, capacity: 20, audience: 'open', attendee_visibility: 'registered', fee_paise: '0' });
const item = () => ({ id, revision: '1', details: details(), state: 'draft', created_at: '2026-11-03T09:00:00.000001Z' });
test('only authoritative terminal rejections allow clearing the exact browser command', () => {
  assert.deepEqual(terminalEventRejection('40001', 'Event revision conflict'), { status: 'rejected', reason: 'conflict' });
  assert.deepEqual(terminalEventRejection('22023', 'Check event details before publication'), { status: 'rejected', reason: 'invalid' });
  for (const [code, message] of [['42501', 'Staff scope access denied'], ['22023', 'Event command conflict'], ['40001', 'serialization error'], ['57014', 'statement timeout'], [undefined, undefined]]) assert.equal(terminalEventRejection(code, message), null);
});
test('event management validation flag cannot enable shared or production environments', () => {
  assert.equal(managementEnabled('validation', 'true'), true);
  for (const env of ['shared-local', 'production', undefined]) assert.equal(managementEnabled(env, 'true'), false);
  assert.equal(managementEnabled('validation', 'false'), false);
});
test('draft payloads reject authority fields, unsafe values, malformed dates and getters', () => {
  assert.deepEqual(parseEventDraftDetails(details()), details());
  for (const patch of [{ title: ' x' }, { title: 'Bad\0title' }, { venue: ' ' }, { description: 'short' }, { event_date: '2099-02-30T09:00:00Z' }, { end_date: '2098-11-03T09:00:00Z' }, { capacity: 0 }, { capacity: 1.5 }, { fee_paise: '1.50' }, { fee_paise: '-1' }, { attendee_visibility: 'public' }, { created_by: id }]) assert.equal(parseEventDraftDetails({ ...details(), ...patch }), null);
  assert.equal(parseEventDraftDetails({ get title() { throw Error('getter'); } }), null);
  assert.equal(parseEventDraftDetails({ ...details(), title: '🚀'.repeat(160) })?.title.length, 320);
});
test('commands bind exact action, scope or event revision without accepting role claims', () => {
  const create = { action: 'create', scope_id: id, details: details() };
  assert.deepEqual(parseEventManagementCommand(create), create);
  assert.equal(parseEventManagementCommand({ ...create, role: 'event_head' }), null);
  assert.equal(parseEventManagementCommand({ action: 'publish', event_id: id, revision: 1 }), null);
  assert.equal(parseEventManagementCommand({ action: 'publish', event_id: id, revision: '0' }), null);
  assert.equal(parseEventManagementCommand({ action: 'publish', event_id: id, revision: '1', details: details() }), null);
});
test('saved responses must match the submitted resource, revision and action', () => {
  const response = { status: 'saved', event_id: id, revision: '2', state: 'draft' };
  assert.deepEqual(parseEventSaved(response), response);
  assert(savedEventMatches(response, { action: 'edit', event_id: id, revision: '1', details: details() }));
  assert.equal(savedEventMatches(response, { action: 'publish', event_id: id, revision: '1' }), false);
  assert.equal(savedEventMatches(response, { action: 'create', scope_id: id, details: details() }), false);
  assert.equal(parseEventSaved({ ...response, user_id: id }), null);
});
test('management read projections reject duplicates, private extras and unrelated scopes', () => {
  assert.deepEqual(parseEventScopes({ items: [{ id, label: 'Assigned area' }] }), [{ id, label: 'Assigned area' }]);
  assert.equal(parseEventScopes({ items: [{ id, label: 'Area' }, { id, label: 'Area' }] }), null);
  assert.equal(parseEventScopes({ items: [{ id, label: 'Area', head_id: id }] }), null);
  const payload = { scope_id: id, items: [item()], cursor: null };
  assert(parseEventDraftList(payload, id));
  assert.equal(parseEventDraftList({ ...payload, items: [item(), item()] }, id), null);
  assert.equal(parseEventDraftList({ ...payload, cursor: { created_at: item().created_at, id } }, id), null);
  assert.equal(parseEventDraftList({ ...payload, scope_id: '22222222-1111-4111-8111-111111111111' }, id), null);
  assert.equal(parseEventDraftList({ ...payload, items: [{ ...item(), created_by: id }] }, id), null);
});
test('editor converts IST and rupees exactly and rejects duplicate fields', () => {
  const form = new FormData();
  const values = { ...details(), event_date: '2099-11-03T09:00', end_date: '', capacity: '20', fee: '3.15' };
  delete values.fee_paise;
  for (const [key, value] of Object.entries(values)) form.set(key, String(value));
  assert.equal(eventEditorDetails(form)?.event_date, '2099-11-03T09:00:00+05:30');
  assert.equal(eventEditorDetails(form)?.fee_paise, '315');
  form.set('fee', '0.01'); assert.equal(eventEditorDetails(form)?.fee_paise, '1');
  form.set('fee', '3.141'); assert.equal(eventEditorDetails(form), null);
  form.set('fee', '3'); form.append('title', 'Duplicate'); assert.equal(eventEditorDetails(form), null);
});
