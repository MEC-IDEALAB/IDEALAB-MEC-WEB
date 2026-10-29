import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOwnVisits } from '../src/lib/own-visits.ts';
const owner = '11111111-1111-4111-8111-111111111111';
const row = { id: '22222222-2222-4222-8222-222222222222', user_id: owner, checkin_time: '2026-10-22T09:00:00+00:00', checkout_time: null, purpose: 'Project work' };
test('a successful empty projection is distinct from unavailable', () => {
  assert.deepEqual(parseOwnVisits([], owner), { status: 'ready', visits: [] });
  for (const input of [null, {}, { error: true }]) assert.equal(parseOwnVisits(input, owner).status, 'unavailable');
});
test('only exact owner-bound visits are accepted', () => {
  assert.deepEqual(parseOwnVisits([row], owner), { status: 'ready', visits: [row] });
  for (const change of [{ user_id: row.id }, { id: 'invalid' }, { private_note: 'extra' }, { purpose: 10 }, { checkin_time: null }]) {
    assert.equal(parseOwnVisits([{ ...row, ...change }], owner).status, 'unavailable');
  }
  const missing = { ...row }; delete missing.user_id;
  assert.equal(parseOwnVisits([missing], owner).status, 'unavailable');
  assert.equal(parseOwnVisits([{ ...row, checkin_time: null }], owner).status, 'unavailable', 'ambiguous legacy timestamps are unavailable, never empty');
  assert.equal(parseOwnVisits([row], '').status, 'unavailable');
});
test('invalid timestamps and reversed checkout fail closed', () => {
  for (const change of [{ checkin_time: 'yesterday' }, { checkin_time: '2026-10-22' }, { checkout_time: '2026-10-22T08:59:00Z' }, { checkout_time: 10 }]) {
    assert.equal(parseOwnVisits([{ ...row, ...change }], owner).status, 'unavailable');
  }
  assert.equal(parseOwnVisits([{ ...row, checkout_time: '2026-10-22T10:00:00Z', purpose: null }], owner).status, 'ready');
});
test('ambiguous open sessions, duplicates and excessive rows are unavailable', () => {
  assert.equal(parseOwnVisits([row, row], owner).status, 'unavailable');
  assert.equal(parseOwnVisits([row, { ...row, id: owner }], owner).status, 'unavailable');
  assert.equal(parseOwnVisits(Array(21).fill(row), owner).status, 'unavailable');
});
test('accessors and oversized or unsafe text are rejected', () => {
  const getter = { ...row }; Object.defineProperty(getter, 'purpose', { enumerable: true, get() { throw new Error('must not read'); } });
  assert.equal(parseOwnVisits([getter], owner).status, 'unavailable');
  for (const purpose of ['x'.repeat(2001), 'bad\u0000value']) assert.equal(parseOwnVisits([{ ...row, purpose }], owner).status, 'unavailable');
});
