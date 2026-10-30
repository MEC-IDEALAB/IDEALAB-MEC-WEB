import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProfileSavePayload, initialProfileSaveState, parseProfileSaveResponse,
  profileSaveFieldErrors,
} from '../src/features/profile/profile-save.ts';

const values = {
  name: 'Student Fixture', phone: '+919876543210', college_roll: 'mdl24cs219',
  institution: 'Model Engineering College', department: 'Computer Science', study_year: '2',
};
function form(changes = {}) {
  const data = new FormData();
  for (const [name, value] of Object.entries({ ...values, expected_revision: '1', ...changes })) data.append(name, value);
  return data;
}

test('a profile form forwards exactly six values and a decimal revision without authority', () => {
  const data = form({ role: 'super_admin', is_active: 'true', profile_completed: 'true',
    id: 'foreign-actor', mec_admitted: 'true', '$ACTION_ID_fixture': 'framework value' });
  const result = buildProfileSavePayload(data);
  assert.equal(result.ok, true);
  assert.deepEqual(result.profile, { ...values, study_year: 2 });
  assert.equal(result.expected_revision, '1');
  assert.equal(Object.keys(result.profile).length, 6);
  assert.equal('role' in result.profile, false);
  assert.equal('id' in result.profile, false);
  assert.equal('expected_revision' in result.profile, false);
  assert.equal(data.get('role'), 'super_admin');
  assert.deepEqual(initialProfileSaveState, { status: 'idle', message: '' });
});

test('partial progress maps blank fields to null without rewriting nonblank display values', () => {
  const partial = buildProfileSavePayload(form({ name: '  ', phone: '', college_roll: '',
    institution: '', department: '\u00a0', study_year: '' }));
  assert.deepEqual(partial, { ok: true, profile: { name: '', phone: null, college_roll: null,
    institution: null, department: null, study_year: null }, expected_revision: '1' });
  const display = '  mdl24' + ' '.repeat(100) + 'CS219  ';
  const saved = buildProfileSavePayload(form({ name: '  Student Fixture  ', college_roll: display }));
  assert.equal(saved.ok, true);
  assert.equal(saved.profile.college_roll, display);
  assert.equal(saved.profile.name, '  Student Fixture  ');
});

test('missing or duplicate known fields, files and non-FormData values are invalid', () => {
  for (const name of [...Object.keys(values), 'expected_revision']) {
    const missing = form(); missing.delete(name);
    assert.equal(buildProfileSavePayload(missing).ok, false, name);
    const duplicate = form(); duplicate.append(name, 'extra');
    assert.equal(buildProfileSavePayload(duplicate).ok, false, name);
    const file = form(); file.set(name, new Blob(['fixture']), 'fixture.txt');
    assert.equal(buildProfileSavePayload(file).ok, false, name);
  }
  assert.equal(buildProfileSavePayload({}).ok, false);
});

test('year and revisions use canonical scalar forms without numeric coercion', () => {
  for (const study_year of ['0', '9', '-1', '02', '2.0', '2e0', 'true', 'null', ' 2 ', '2\n']) {
    assert.equal(buildProfileSavePayload(form({ study_year })).ok, false, study_year);
  }
  for (const expected_revision of ['', '-1', '+1', '01', '1.0', '1e3', '1\n', '9223372036854775808']) {
    assert.equal(buildProfileSavePayload(form({ expected_revision })).ok, false, expected_revision);
  }
  for (const expected_revision of ['0', '9007199254740993', '9223372036854775807']) {
    const result = buildProfileSavePayload(form({ expected_revision }));
    assert.equal(result.ok, true);
    assert.equal(result.expected_revision, expected_revision);
  }
});

test('entry feedback rejects malformed nonblank details and supports complete-profile constraints', () => {
  for (const changes of [{ name: 'a'.repeat(121) }, { department: 'a'.repeat(121) },
    { name: 'Name\nInjected' }, { phone: '+919876543210\n' }, { phone: '9876543210' },
    { phone: '+0123' }, { college_roll: 'a'.repeat(65) }, { institution: 'MEC' },
    { college_roll: 'MDL\t219' }]) {
    assert.equal(buildProfileSavePayload(form(changes)).ok, false);
  }
  assert.equal(buildProfileSavePayload(form({ name: '𐐀'.repeat(120), college_roll: 'bounded-unknown-format' })).ok, true);
  assert.equal(Object.keys(profileSaveFieldErrors({ ...values, name: '' })).length, 0);
  assert.ok(profileSaveFieldErrors({ ...values, name: '' }, true).name);
});

test('only the exact saved result with a canonical revision claims a successful save', () => {
  assert.deepEqual(parseProfileSaveResponse([{ status: 'saved', profile_revision: '9007199254740993' }]), {
    status: 'saved', message: 'Profile saved. Student admission is checked separately.', revision: '9007199254740993',
  });
  for (const response of [null, undefined, {}, [], [null], [{ status: 'saved', profile_revision: null }],
    [{ status: 'saved', profile_revision: 1 }], [{ status: 'saved', profile_revision: '01' }],
    [{ status: 'saved', profile_revision: '1\n' }], [{ status: 'saved', profile_revision: '9223372036854775808' }],
    [{ status: 'saved', profile_revision: '1', role: 'super_admin' }],
    [{ status: 'saved', profile_revision: '1' }, { status: 'saved', profile_revision: '2' }]]) {
    assert.equal(parseProfileSaveResponse(response).status, 'error');
  }
});

test('safe status mapping neither grants admission nor forwards raw provider text', () => {
  const expected = { invalid: 'invalid', conflict: 'conflict', inactive: 'error',
    verification_required: 'error', unavailable: 'error', claim_transition_required: 'error', not_saved: 'error' };
  for (const [status, mapped] of Object.entries(expected)) {
    const result = parseProfileSaveResponse([{ status, profile_revision: null }]);
    assert.equal(result.status, mapped, status);
    assert.equal('revision' in result, false);
    assert.equal('mec_admitted' in result, false);
  }
  const secretText = 'fixture-only raw database detail';
  for (const response of [[{ status: secretText, profile_revision: null }],
    [{ status: 'unavailable', profile_revision: null, message: secretText }], { error: secretText }]) {
    const result = parseProfileSaveResponse(response);
    assert.equal(result.status, 'error');
    assert.equal(JSON.stringify(result).includes(secretText), false);
  }
  const accessor = { profile_revision: null };
  Object.defineProperty(accessor, 'status', { enumerable: true, get() { throw new Error(secretText); } });
  assert.equal(parseProfileSaveResponse([accessor]).status, 'error');
});
