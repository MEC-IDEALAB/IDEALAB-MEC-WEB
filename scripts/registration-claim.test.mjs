import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRegistrationClaimPayload, initialRegistrationClaimState, parseRegistrationClaimResponse, registrationClaimNumberError } from '../src/features/profile/registration-claim.ts';

function form(changes = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ registration_number: 'MDL24CS219', expected_revision: '1', self_declaration: 'on', ...changes })) data.append(key, value);
  return data;
}

test('only registration display, revision and explicit self-declaration become claim input', () => {
  const display = '  mdl24' + ' '.repeat(100) + 'CS219  ';
  const data = form({ registration_number: display, role: 'super_admin', id: 'another-account',
    mec_admitted: 'true', profile_completed: 'true', '$ACTION_ID_fixture': 'framework' });
  assert.deepEqual(buildRegistrationClaimPayload(data), { ok: true, display_number: display, expected_revision: '1', self_declaration: true });
  assert.equal(data.get('registration_number'), display);
  assert.deepEqual(initialRegistrationClaimState, { status: 'idle', message: '' });
});

test('declaration must be present once as the actual checked checkbox value', () => {
  const missing = form(); missing.delete('self_declaration');
  assert.equal(buildRegistrationClaimPayload(missing).ok, false);
  for (const self_declaration of ['', 'true', 'false', '1', 'ON', 'on\n']) assert.equal(buildRegistrationClaimPayload(form({ self_declaration })).ok, false);
  for (const key of ['registration_number', 'expected_revision', 'self_declaration']) {
    const duplicate = form(); duplicate.append(key, 'on');
    assert.equal(buildRegistrationClaimPayload(duplicate).ok, false);
    const file = form(); file.set(key, new Blob(['fixture']), 'fixture.txt');
    assert.equal(buildRegistrationClaimPayload(file).ok, false);
    const absent = form(); absent.delete(key);
    assert.equal(buildRegistrationClaimPayload(absent).ok, false);
  }
  assert.equal(buildRegistrationClaimPayload({}).ok, false);
});

test('number feedback enforces resource bounds and supplied prefixes without a fabricated course catalog', () => {
  for (const registration_number of ['', '  ', '\u00a0', 'ABC24CS219', 'MDL\n24CS219',
    'MDL24CS219\u0085', 'MDL' + 'x'.repeat(62), 'MDL' + ' '.repeat(4094)]) {
    assert.equal(buildRegistrationClaimPayload(form({ registration_number })).ok, false);
    assert.equal(typeof registrationClaimNumberError(registration_number), 'string');
  }
  for (const registration_number of ['LMDL24new-course', 'mdl24?unknown', 'MDL', '  LMDL24 CS219  ', 'MDL' + '𐐀'.repeat(61), 'MDL' + ' '.repeat(4093)]) {
    assert.equal(buildRegistrationClaimPayload(form({ registration_number })).ok, true, registration_number.slice(0, 30));
  }
});

test('revision values remain canonical exact SQL bigint decimal strings', () => {
  for (const expected_revision of ['0', '9007199254740993', '9223372036854775807']) {
    const result = buildRegistrationClaimPayload(form({ expected_revision }));
    assert.equal(result.ok, true); assert.equal(result.expected_revision, expected_revision);
  }
  for (const expected_revision of ['', '-1', '+1', '01', '1e2', '1.0', ' 1 ', '1\n', '9223372036854775808']) assert.equal(buildRegistrationClaimPayload(form({ expected_revision })).ok, false);
});

test('claimed needs an exact single-row response and valid text revision', () => {
  const result = parseRegistrationClaimResponse([{ status: 'claimed', profile_revision: '9007199254740993' }]);
  assert.equal(result.status, 'claimed'); assert.equal(result.revision, '9007199254740993');
  assert.equal('mec_admitted' in result, false, 'A receipt parser never grants admission');
  for (const response of [null, {}, [], [null], [{ status: 'claimed' }],
    [{ status: 'claimed', profile_revision: null }], [{ status: 'claimed', profile_revision: 1 }],
    [{ status: 'claimed', profile_revision: '01' }], [{ status: 'claimed', profile_revision: '1\n' }],
    [{ status: 'claimed', profile_revision: '9223372036854775808' }],
    [{ status: 'claimed', profile_revision: '1', mec_admitted: true }],
    [{ status: 'claimed', profile_revision: '1' }, { status: 'claimed', profile_revision: '1' }]]) assert.equal(parseRegistrationClaimResponse(response).status, 'error');
});

test('failure messages are safe and do not disclose a number holder or collision limit', () => {
  const statuses = { invalid: 'invalid', conflict: 'conflict', inactive: 'error', verification_required: 'error', profile_required: 'error', unavailable: 'error', not_claimed: 'not_claimed' };
  for (const [status, expected] of Object.entries(statuses)) {
    const result = parseRegistrationClaimResponse([{ status, profile_revision: null }]);
    assert.equal(result.status, expected); assert.equal('revision' in result, false);
    assert.doesNotMatch(result.message, /occupied|holder|collision|limit|claimed by/i);
  }
  const provider = 'fixture-only sensitive provider error';
  for (const response of [{ error: provider }, [{ status: provider, profile_revision: null }], [{ status: 'not_claimed', profile_revision: null, message: provider }]]) {
    const result = parseRegistrationClaimResponse(response);
    assert.equal(result.status, 'error'); assert.equal(JSON.stringify(result).includes(provider), false);
  }
  const accessor = { profile_revision: null };
  Object.defineProperty(accessor, 'status', { enumerable: true, get() { throw new Error(provider); } });
  assert.equal(parseRegistrationClaimResponse([accessor]).status, 'error');
});

test('generic non-acceptance explains account reuse without identifying a claim holder or suggesting a format failure', () => {
  const result = parseRegistrationClaimResponse([{ status:'not_claimed', profile_revision:'1' }]);
  assert.equal(result.status,'not_claimed');
  assert.match(result.message,/one account/);
  assert.match(result.message,/sign out and use that account/);
  assert.doesNotMatch(result.message,/LMDL|MDL|occupied|holder|already taken|invalid format|five|15 minutes/i);
});


test('claim success requires fresh exact ready Student projection for the owner and receipt', async () => {
  const { confirmClaimedProfile } = await import('../src/features/profile/registration-claim.ts');
  const id='12345678-1234-1234-1234-123456789abc';
  const row={id,name:'Sample Maker',phone:'+919876543210',college_roll:'MDL24CS219',institution:'Model Engineering College',department:'Computer Science',study_year:2,role:'student',is_active:true,profile_completed:true,profile_contract_version:1,profile_revision:'4',mec_admitted:true};
  assert.equal(confirmClaimedProfile([row],id,'4','MDL24CS219'),true);
  for (const response of [null,[],[{...row,profile_revision:'3'}],[{...row,role:'lab_admin'}],[{...row,mec_admitted:false}],[{...row,is_active:false}],[{...row,college_roll:'MDL24CS220'}]]) {
    assert.equal(confirmClaimedProfile(response,id,'4','MDL24CS219'),false);
  }
  assert.equal(confirmClaimedProfile([row],'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','4','MDL24CS219'),false);
});
