import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLabOpening, buildLabOpeningCommand, parseLabOpeningAction } from '../src/lib/lab-opening.ts';
import { matchesFormAccount } from '../src/lib/form-account.ts';
const event = (revision = '1', action = 'open') => ({ revision, action, actor_name: 'Test duty member', actor_duty: 'Lab opening duty', occurred_at: '2026-10-22T09:00:00+05:30' });
const projection = (changes = []) => ({ status: changes[0] ? changes[0].action === 'open' ? 'open' : 'closed' : 'unknown', revision: changes[0]?.revision ?? '0', can_manage: false, changes });
test('unknown is distinct from closed, errors and contradictory data', () => {
  assert.equal(parseLabOpening(projection()).status, 'ready');
  for (const value of [null, [], {}, { ...projection(), status: 'closed' }, { ...projection(), revision: '1' }, { ...projection(), can_manage: 'true' }, { ...projection(), email: 'private@example.invalid' }]) assert.equal(parseLabOpening(value).status, 'unavailable');
});
test('bounded journal requires consecutive alternating revisions and server-time order', () => {
  assert.equal(parseLabOpening(projection([event('2', 'close'), event()])).status, 'ready');
  for (const changes of [[event('2')], [event('2'), event()], [event('3', 'close'), event()], [event('2', 'close'), { ...event(), occurred_at: '2026-10-23T09:00:00Z' }], [event('9223372036854775808')], Array.from({ length: 21 }, () => event())]) assert.equal(parseLabOpening(projection(changes)).status, 'unavailable');
});
test('journal rejects private extras, getters, empty/control labels and malformed time', () => {
  for (const change of [{ ...event(), actor_id: 'hidden' }, { ...event(), actor_name: '' }, { ...event(), actor_duty: 'a\nrole' }, { ...event(), occurred_at: 'yesterday' }, { ...event(), get actor_name() { throw new Error('must not execute'); } }]) assert.equal(parseLabOpening(projection([change])).status, 'unavailable');
});
test('commands pass no actor/role/time and reject duplicate, unsafe or overflow fields', () => {
  const form = new FormData(); form.set('action', 'open'); form.set('expected_revision', '0'); form.set('command_id', '11111111-1111-4111-8111-111111111111'); form.set('actor', 'forged');
  assert.deepEqual(Object.keys(buildLabOpeningCommand(form)), ['p_action', 'p_expected_revision', 'p_command_id']);
  form.append('action', 'close'); assert.equal(buildLabOpeningCommand(form), null);
  form.set('action', 'open'); form.set('expected_revision', '9223372036854775808'); assert.equal(buildLabOpeningCommand(form), null);
  form.set('expected_revision', '0'); form.set('command_id', 'not-an-id'); assert.equal(buildLabOpeningCommand(form), null);
});
test('opening form is bound to its rendered account without passing it to the RPC', () => {
  const first='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', second='11111111-2222-4333-8444-555555555555';
  const form=new FormData(); form.set('action','open'); form.set('expected_revision','0'); form.set('command_id','11111111-1111-4111-8111-111111111111'); form.set('expected_account',first);
  assert.equal(matchesFormAccount(form,first),true); assert.equal(matchesFormAccount(form,second),false);
  assert.deepEqual(Object.keys(buildLabOpeningCommand(form)),['p_action','p_expected_revision','p_command_id']);
  form.append('expected_account',first); assert.equal(matchesFormAccount(form,first),false);
});
test('mutation results never infer current opening state from the submitted command', () => {
  assert.equal(parseLabOpeningAction({ status: 'applied', revision: '4' }).status, 'saved');
  assert.equal(parseLabOpeningAction({ status: 'unchanged', revision: '4' }).status, 'saved');
  for (const value of [null, { status: 'applied' }, { status: 'denied' }, { status: 'conflict' }, { status: 'applied', revision: '4', role: 'core' }]) assert.equal(parseLabOpeningAction(value).status, 'error');
});
