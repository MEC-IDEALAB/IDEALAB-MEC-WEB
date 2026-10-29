import test from 'node:test';
import assert from 'node:assert/strict';
import { hasVerifiedEmail, loadProfileForVerifiedUser } from '../src/lib/member-access.ts';

const verified = {
  email: 'member@example.test',
  email_confirmed_at: '2026-10-21T08:30:00.000Z',
  is_anonymous: false,
};
const rejected = [
  ['missing identity fields', {}],
  ['anonymous identity', { ...verified, is_anonymous: true }],
  ['missing anonymous status', { email: verified.email, email_confirmed_at: verified.email_confirmed_at }],
  ['null anonymous status', { ...verified, is_anonymous: null }],
  ['missing email', { is_anonymous: false, email_confirmed_at: verified.email_confirmed_at }],
  ['null email', { ...verified, email: null }],
  ['empty email', { ...verified, email: '' }],
  ['blank email', { ...verified, email: ' \t ' }],
  ['missing confirmation', { is_anonymous: false, email: verified.email }],
  ['null confirmation', { ...verified, email_confirmed_at: null }],
  ['empty confirmation', { ...verified, email_confirmed_at: '' }],
  ['blank confirmation', { ...verified, email_confirmed_at: ' \t ' }],
];

test('only a current non-anonymous email identity with confirmation satisfies the guard', () => {
  assert.equal(hasVerifiedEmail(verified), true);
  for (const [label, identity] of rejected) assert.equal(hasVerifiedEmail(identity), false, label);
});

test('each rejected identity skips member-profile lookup', async () => {
  for (const [label, identity] of rejected) {
    let profileReads = 0;
    const result = await loadProfileForVerifiedUser(identity, async () => {
      profileReads += 1;
      return { id: 'profile-fixture' };
    });
    assert.deepEqual(result, { emailVerified: false }, label);
    assert.equal(profileReads, 0, label);
  }
});

test('a confirmed email identity may load its profile without granting onboarding or admission', async () => {
  const profile = { id: 'profile-fixture', profile_completed: false };
  const result = await loadProfileForVerifiedUser(verified, async () => profile);
  assert.deepEqual(result, { emailVerified: true, profile });
  assert.equal('onboardingComplete' in result, false);
  assert.equal('mecAdmitted' in result, false);
});

test('a profile lookup failure remains a failure rather than a successful empty profile', async () => {
  const failure = new Error('fixture lookup failure');
  await assert.rejects(loadProfileForVerifiedUser(verified, async () => { throw failure; }), error => error === failure);
});
