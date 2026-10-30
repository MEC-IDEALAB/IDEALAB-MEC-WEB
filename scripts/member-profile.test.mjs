import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateOwnProfile } from '../src/lib/member-profile.ts';

test('versioned cross-client JSON fixtures', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/own_profile_contract_v1.json', import.meta.url), 'utf8'));
  for (const item of fixture.cases) {
    assert.equal(evaluateOwnProfile([{ ...fixture.base, ...item.changes }], fixture.owner).profileState, item.state, item.name);
  }
});

// Isolated parser fixtures, not Auth accounts or a signed-session acceptance.
const ownId = '11111111-2222-4333-8444-555555555555';
const otherId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const complete = {
  id: ownId,
  name: 'Student Fixture',
  phone: '+919876543210',
  college_roll: 'MDL24CS219',
  institution: 'Model Engineering College',
  department: 'Computer Science',
  study_year: 2,
  role: 'student',
  is_active: true,
  profile_completed: true,
  profile_contract_version: 1,
  profile_revision: '1',
  mec_admitted: true,
};
const evaluate = changes => evaluateOwnProfile([{ ...complete, ...changes }], ownId);

test('a complete version-one own Student needs the backend admission result', () => {
  assert.equal(evaluate({}).profileState, 'ready');
  assert.equal(evaluate({ mec_admitted: false }).profileState, 'admission-required');
  assert.equal(evaluate({ profile_completed: false }).profileState, 'incomplete');
  assert.equal(evaluate({ profile_completed: null }).profileState, 'incomplete');
});

test('legacy and partial profiles never use the compatibility boolean to enter Home', () => {
  assert.equal(evaluate({ profile_contract_version: 0 }).profileState, 'incomplete');
  assert.equal(evaluate({ profile_contract_version: 0, name: '', phone: null,
    college_roll: null, institution: null, department: null, study_year: null }).profileState, 'incomplete');
  for (const [key, value] of [['name', ''], ['name', '  '], ['phone', null],
    ['college_roll', null], ['institution', null], ['department', null], ['study_year', null]]) {
    assert.equal(evaluate({ [key]: value }).profileState, 'incomplete', key);
  }
});

test('required-field validity is checked without inventing registration formats or ownership', () => {
  for (const changes of [
    { phone: '9876543210' }, { phone: '+01234' }, { phone: '+1' }, { phone: '+1234567890123456' },
    { phone: '+919876543210\n' }, { phone: '+919876543210\r\n' },
    { institution: 'MEC' }, { study_year: 0 }, { study_year: 9 },
    { name: 'a'.repeat(121) }, { department: 'a'.repeat(121) },
    { name: '\u00a0\u00a0' }, { department: '\u00a0\u00a0' },
    { college_roll: 'a'.repeat(65) }, { college_roll: '  ' },
    { name: 'Name\nInjected' }, { department: 'Dept\u0085Hidden' }, { college_roll: 'MDL\t219' },
  ]) assert.equal(evaluate(changes).profileState, 'incomplete');
  assert.equal(evaluate({ name: '𐐀'.repeat(120), department: 'തമിഴ്', college_roll: 'bounded-unknown-format' }).profileState, 'ready');
  assert.equal(evaluate({ college_roll: 'bounded-unknown-format', mec_admitted: false }).profileState, 'admission-required');
});

test('registration length feedback collapses repeated spaces without reserving or rewriting a number', () => {
  const display = '  MDL24' + ' '.repeat(100) + 'CS219  ';
  assert.ok(display.length > 64);
  const admitted = evaluate({ college_roll: display });
  assert.equal(admitted.profileState, 'ready');
  assert.equal(admitted.profile.college_roll, display);
  assert.equal(evaluate({ college_roll: display, mec_admitted: false }).profileState, 'admission-required');
  assert.equal(evaluate({ college_roll: 'a'.repeat(65) }).profileState, 'incomplete');
  assert.equal(evaluate({ college_roll: 'MDL24' + '\t'.repeat(100) + 'CS219' }).profileState, 'incomplete');
});

test('known staff retain their trusted path while inactive states always deny entry', () => {
  for (const role of ['lab_admin', 'super_admin']) {
    assert.equal(evaluate({ role, profile_completed: false, profile_contract_version: 0,
      name: '', phone: null, college_roll: null, institution: null, department: null,
      study_year: null, mec_admitted: false }).profileState, 'ready');
    assert.equal(evaluate({ role, is_active: false }).profileState, 'inactive');
  }
  assert.equal(evaluate({ is_active: false }).profileState, 'inactive');
  assert.equal(evaluate({ is_active: null }).profileState, 'inactive');
});

test('missing, multiple, cross-owner and unsupported-contract responses fail unavailable', () => {
  for (const response of [null, undefined, {}, complete, [], [complete, complete], [null],
    [{ ...complete, id: otherId }], [{ ...complete, id: 'not-an-id' }], [{ ...complete, id: ownId + '\n' }]]) {
    assert.deepEqual(evaluateOwnProfile(response, ownId), { profileState: 'unavailable', profile: null });
  }
  for (const profile_contract_version of [-1, 2, 100, null, '1', 1.5]) {
    assert.equal(evaluate({ profile_contract_version }).profileState, 'unavailable');
    assert.equal(evaluate({ profile_contract_version, role: 'super_admin' }).profileState, 'unavailable');
  }
  for (const expectedId of ['', 'bad-id', otherId, ownId + '\n']) {
    assert.equal(evaluateOwnProfile([complete], expectedId).profileState, 'unavailable');
  }
});

test('strict projection and primitive types reject excluded, missing and malformed values', () => {
  for (const key of Object.keys(complete)) {
    const row = { ...complete };
    delete row[key];
    assert.equal(evaluateOwnProfile([row], ownId).profileState, 'unavailable', key);
  }
  for (const changes of [{ email: 'fixture@example.test' }, { ban_reason: 'excluded' },
    { role: 'owner' }, { role: null }, { is_active: 1 }, { profile_completed: 'true' },
    { mec_admitted: 'true' }, { mec_admitted: null }, { name: null }, { phone: 12345 },
    { department: {} }, { study_year: '2' }, { study_year: true }, { study_year: 1.5 },
    { study_year: NaN }, { study_year: Infinity }]) {
    assert.equal(evaluate(changes).profileState, 'unavailable');
  }
  const inherited = Object.create(complete);
  assert.equal(evaluateOwnProfile([inherited], ownId).profileState, 'unavailable');
  const accessor = { ...complete };
  Object.defineProperty(accessor, 'mec_admitted', { enumerable: true, get() { throw new Error('must not run'); } });
  assert.equal(evaluateOwnProfile([accessor], ownId).profileState, 'unavailable');
});

test('SQL bigint revisions remain exact decimal strings and never coerce unsafe numbers', () => {
  for (const profile_revision of ['0', '9007199254740993', '9223372036854775807']) {
    const result = evaluate({ profile_revision });
    assert.equal(result.profileState, 'ready');
    assert.equal(result.profile.profile_revision, profile_revision);
  }
  for (const profile_revision of [0, 1, 9007199254740992, -1, null, '', '01', '-1', '+1',
    '1e3', ' 1', '1 ', '1\n', '1.0', '9223372036854775808', '99999999999999999999']) {
    assert.equal(evaluate({ profile_revision }).profileState, 'unavailable');
  }
});

test('fresh responses move through onboarding and admission without mutating saved display text', () => {
  const row = Object.freeze({ ...complete, name: '  Student Fixture  ', college_roll: '  mdl24cs219  ' });
  const before = structuredClone(row);
  const response = Object.freeze([row]);
  const result = evaluateOwnProfile(response, ownId.toUpperCase());
  assert.equal(result.profileState, 'ready');
  assert.deepEqual(row, before);
  assert.notEqual(result.profile, row);
  assert.equal(result.profile.name, row.name);
  assert.equal(result.profile.college_roll, row.college_roll);
  assert.equal(Object.isFrozen(result.profile), true);
  assert.deepEqual([
    evaluate({ profile_contract_version: 0, mec_admitted: false }).profileState,
    evaluate({ mec_admitted: false }).profileState,
    evaluate({}).profileState,
    evaluate({ is_active: false }).profileState,
  ], ['incomplete', 'admission-required', 'ready', 'inactive']);
});
