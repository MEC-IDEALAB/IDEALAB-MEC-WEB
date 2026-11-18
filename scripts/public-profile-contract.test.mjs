import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyPublicProfile, normalizeProfileUrl, parsePublicProfile, parsePublicProfileRead,
  parsePublicProfileSave, profilePayloadFromForm, publicProfileId,
  publicProfileRevision, validPublicProfilePayload,
} from '../src/features/profile/public-profile-contract.ts';

const id = '12345678-1234-4123-8123-123456789abc';
const otherId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const payload = {
  display_name: 'Maker', bio: 'A short bio\nwith a second line', interests: ['Robotics', 'Art'],
  skills: ['CAD'], links: [{ label: 'Portfolio', url: 'https://mec.ac.in/caf%C3%A9' }], visibility: 'public',
};
const profile = { ...payload, public_id: id, revision: '1', initialized: true };

function form(changes = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    display_name: payload.display_name, bio: payload.bio, interests: JSON.stringify(payload.interests),
    skills: JSON.stringify(payload.skills), links: JSON.stringify(payload.links), visibility: payload.visibility,
    revision: '1', expected_account: id, ...changes,
  })) data.append(key, value);
  return data;
}

test('profile payload supports LF biographies and exact bounded display fields', () => {
  assert.equal(validPublicProfilePayload(payload), true);
  assert.equal(validPublicProfilePayload({ ...payload, display_name: 'x'.repeat(81) }), false);
  assert.equal(validPublicProfilePayload({ ...payload, bio: 'x'.repeat(1001) }), false);
  for (const bio of ['tab\there', 'carriage\rreturn', 'null\u0000byte', 'control\u0085byte']) {
    assert.equal(validPublicProfilePayload({ ...payload, bio }), false, JSON.stringify(bio));
  }
  assert.equal(validPublicProfilePayload({ ...payload, interests: Array.from({ length: 21 }, (_, n) => `interest-${n}`) }), false);
  assert.equal(validPublicProfilePayload({ ...payload, skills: ['x'.repeat(49)] }), false);
  assert.equal(validPublicProfilePayload({ ...payload, links: Array.from({ length: 9 }, () => payload.links[0]) }), false);
});

test('payload is exact, duplicate interests and skills are rejected case-insensitively', () => {
  assert.equal(validPublicProfilePayload({ ...payload, role: 'super_admin' }), false);
  assert.equal(validPublicProfilePayload({ ...payload, interests: ['CAD', 'cad'] }), false);
  assert.equal(validPublicProfilePayload({ ...payload, skills: ['Laser', ' laser '] }), false);
  assert.equal(validPublicProfilePayload({ ...payload, links: [{ label: 'Portfolio', url: 'https://mec.ac.in', visibility: 'private' }] }), false);
});

test('HTTPS URL support matches the SQL contract and normalizes safe Unicode paths', () => {
  assert.equal(normalizeProfileUrl('https://mec.ac.in/café'), 'https://mec.ac.in/caf%C3%A9');
  assert.equal(normalizeProfileUrl('https://MEC.ac.in/path'), 'https://mec.ac.in/path');
  for (const url of [
    'http://mec.ac.in', 'HTTPS://mec.ac.in', 'https://mec.ac.in:443', 'https://mec.ac.in:8443/a',
    'https://mec.ac.in:abc/a', 'https://user@mec.ac.in', 'https://name:pass@mec.ac.in',
    'https://mec.ac.in.', 'https://[::1]/', 'https://localhost/', 'https://mec.ac.in/a b',
    'https://999.999/', 'https://example.123/', 'https://example.0x7f/',
    'https://mec.ac.in\\attacker.example/path',
  ]) assert.equal(normalizeProfileUrl(url), null, url);
});

test('URL validity depends on URL syntax and excludes control characters', () => {
  assert.equal(normalizeProfileUrl('https://github.com/IDEALAB-MEC/profile?tab=readme#top'), 'https://github.com/IDEALAB-MEC/profile?tab=readme#top');
  assert.equal(normalizeProfileUrl('https://example.0b11/'), 'https://example.0b11/');
  assert.equal(normalizeProfileUrl('https://example.0o77/'), 'https://example.0o77/');
  for (const url of ['https://', 'https://-bad.mec.ac.in', 'https://mec..ac.in', `https://mec.ac.in/${'x'.repeat(2050)}`, 'https://mec.ac.in/line\nbreak']) {
    assert.equal(normalizeProfileUrl(url), null, url.slice(0, 80));
  }
});

test('legacy uninitialized projection has no share ID, and public lookup requires an active public profile', () => {
  assert.equal(emptyPublicProfile.public_id, null);
  assert.deepEqual(parsePublicProfile({ ...emptyPublicProfile }), emptyPublicProfile);
  const legacy = { status: 'ready', profile: { ...emptyPublicProfile } };
  assert.deepEqual(parsePublicProfileRead(legacy), emptyPublicProfile);
  assert.equal(parsePublicProfileRead(legacy, id), null);
  assert.equal(parsePublicProfileRead({ status: 'ready', profile: { ...profile, visibility: 'private' } }, id), null);
  assert.deepEqual(parsePublicProfileRead({ status: 'ready', profile }, id), profile);
  assert.equal(parsePublicProfileRead({ status: 'not_found' }), null);
});

test('profile projections reject IDs, extra fields, malformed revisions and executable accessors', () => {
  assert.equal(publicProfileId(id), true);
  assert.equal(publicProfileId(otherId), true);
  assert.equal(publicProfileId(`${id}\n`), false);
  assert.equal(parsePublicProfile({ ...profile, account_id: otherId }), null);
  assert.equal(parsePublicProfile({ ...profile, public_id: otherId, revision: '01' }), null);
  assert.equal(parsePublicProfile({ ...profile, bio: 'unsafe\tcontrol' }), null);
  const accessor = { ...profile };
  Object.defineProperty(accessor, 'bio', { enumerable: true, get() { throw new Error('must not execute'); } });
  assert.equal(parsePublicProfile(accessor), null);
});

test('64-bit revisions stay exact decimal strings', () => {
  for (const revision of ['0', '9007199254740993', '9223372036854775807']) assert.equal(publicProfileRevision(revision), true);
  for (const revision of ['', '01', '-1', '+1', '1.0', '1e3', '1\n', '9223372036854775808', 1]) assert.equal(publicProfileRevision(revision), false);
});

test('form projection accepts only known single values and canonicalizes URLs before persistence', () => {
  const result = profilePayloadFromForm(form({ links: JSON.stringify([{ label: 'Portfolio', url: 'https://mec.ac.in/café' }]), '$ACTION_ID_test': 'framework metadata' }));
  assert.deepEqual(result, { payload: { ...payload, links: [{ label: 'Portfolio', url: 'https://mec.ac.in/caf%C3%A9' }] }, revision: '1' });
  for (const changed of [
    (() => { const value = form(); value.append('bio', 'duplicate'); return value; })(),
    (() => { const value = form(); value.delete('expected_account'); return value; })(),
    form({ links: JSON.stringify([{ label: 'Portfolio', url: 'https://mec.ac.in:abc' }]) }),
    form({ unexpected: 'role' }), form({ revision: '01' }),
  ]) assert.equal(profilePayloadFromForm(changed), null);
  const file = form(); file.set('bio', new Blob(['bio']), 'bio.txt');
  assert.equal(profilePayloadFromForm(file), null);
});

test('save responses allow only bounded saved/conflict profiles and never leak provider errors', () => {
  assert.equal(parsePublicProfileSave({ status: 'saved', profile }).status, 'saved');
  assert.equal(parsePublicProfileSave({ status: 'conflict', profile }).status, 'conflict');
  assert.equal(parsePublicProfileSave({ status: 'saved', profile: { ...profile, visibility: 'private' } }).status, 'saved');
  for (const response of [
    null, {}, { status: 'invalid', message: 'secret database detail' },
    { status: 'saved', profile: { ...profile, account_id: otherId } },
    { status: 'saved', profile: { ...profile, revision: '0', initialized: false, public_id: null } },
  ]) {
    const state = parsePublicProfileSave(response);
    assert.equal(state.status, 'error');
    assert.equal(JSON.stringify(state).includes('secret database detail'), false);
  }
});

async function draftAction({ enabled = true, own = profile, result, account = id } = {}) {
  const path = new URL('../src/features/profile/public-profile-actions.ts', import.meta.url);
  const source = stripTypeScriptTypes(await readFile(path, 'utf8'))
    .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
  const createAction = new Function('serverClient', 'hasVerifiedEmail', 'evaluateOwnProfile',
    'matchesFormAccount', 'publicProfileEnabled', 'parsePublicProfileRead', 'parsePublicProfileSave',
    'profilePayloadFromForm', 'inspectMemberSessionScope', source + '\nreturn savePrivateProfileDraft;');
  const { hasVerifiedEmail } = await import('../src/lib/member-access.ts');
  const { evaluateOwnProfile } = await import('../src/lib/member-profile.ts');
  const { matchesFormAccount } = await import('../src/lib/form-account.ts');
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: {
      id: account, email: 'student@example.invalid', email_confirmed_at: '2026-11-15', is_anonymous: false,
    } } }) },
    async rpc(name, params) {
      calls.push([name, params]);
      if (name === 'get_own_profile_v1') return { data: [{
        id: account, name: 'Fixture', phone: '+919000000000', college_roll: 'MDLFIXTURE',
        institution: 'Model Engineering College', department: 'Engineering', study_year: 2,
        role: 'student', is_active: true, profile_completed: true,
        profile_contract_version: 1, profile_revision: '7', mec_admitted: true,
      }] };
      if (name === 'get_own_public_profile_v1') return { data: { status: 'ready', profile: own } };
      return { data: result };
    },
  };
  const action = createAction(async () => client, hasVerifiedEmail, evaluateOwnProfile, matchesFormAccount,
    () => enabled, parsePublicProfileRead, parsePublicProfileSave, profilePayloadFromForm,
    async () => 'normal');
  return { calls, save: data => action({ status: 'idle', message: '' }, data) };
}

function privateDraftForm(changes) {
  const data = form(changes);
  data.delete('visibility');
  return data;
}

test('private drafts reject a submitted visibility and a stale account before database reads', async () => {
  for (const [options, data] of [
    [{}, form()],
    [{}, form({ visibility: 'private' })],
    [{ account: otherId }, privateDraftForm()],
    [{ enabled: false }, privateDraftForm()],
  ]) {
    const fixture = await draftAction(options);
    assert.equal((await fixture.save(data)).status, 'error');
    assert.deepEqual(fixture.calls, []);
  }
});

test('private draft save preserves a published revision and rejects stale draft revisions', async () => {
  const published = await draftAction();
  assert.equal((await published.save(privateDraftForm())).status, 'error');
  assert.deepEqual(published.calls.map(([name]) => name), ['get_own_profile_v1', 'get_own_public_profile_v1']);
  const stale = await draftAction({ own: { ...profile, visibility: 'private', revision: '2' } });
  assert.equal((await stale.save(privateDraftForm())).status, 'conflict');
  assert.deepEqual(stale.calls.map(([name]) => name), ['get_own_profile_v1', 'get_own_public_profile_v1']);
});

test('private draft saves force private visibility and verify the resulting draft revision and ID', async () => {
  const own = { ...profile, visibility: 'private' };
  const returned = { ...own, revision: '2' };
  for (const [receipt, status] of [
    [returned, 'saved'],
    [{ ...returned, visibility: 'public' }, 'error'],
    [{ ...returned, revision: '3' }, 'error'],
    [{ ...returned, public_id: otherId }, 'error'],
  ]) {
    const fixture = await draftAction({ own, result: { status: 'saved', profile: receipt } });
    assert.equal((await fixture.save(privateDraftForm())).status, status);
    assert.deepEqual(fixture.calls.at(-1), ['save_own_public_profile_v1', {
      p_payload: { ...payload, visibility: 'private' }, p_expected_revision: '1',
    }]);
  }
  const first = await draftAction({ own: emptyPublicProfile, result: { status: 'saved', profile: own } });
  assert.equal((await first.save(privateDraftForm({ revision: '0' }))).status, 'saved');
});
