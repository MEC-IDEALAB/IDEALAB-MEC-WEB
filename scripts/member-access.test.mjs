import test from 'node:test';
import assert from 'node:assert/strict';
import { hasVerifiedEmail, loadProfileForVerifiedUser } from '../src/lib/member-access.ts';

test('only a non-empty Supabase confirmation timestamp satisfies email verification', () => {
  assert.equal(hasVerifiedEmail({ email_confirmed_at: '2026-10-21T08:30:00.000Z' }), true);
  assert.equal(hasVerifiedEmail({}), false);
  assert.equal(hasVerifiedEmail({ email_confirmed_at: '' }), false);
  assert.equal(hasVerifiedEmail({ email_confirmed_at: null }), false);
});

test('an unverified identity never triggers a member-profile lookup', async () => {
  let profileReads = 0;
  const result = await loadProfileForVerifiedUser({}, async () => {
    profileReads += 1;
    return { id: 'profile-fixture' };
  });

  assert.deepEqual(result, { emailVerified: false });
  assert.equal(profileReads, 0);
});

test('a confirmed identity may load its profile but the helper does not claim onboarding completion', async () => {
  const profile = { id: 'profile-fixture', profile_completed: false };
  const result = await loadProfileForVerifiedUser({ email_confirmed_at: '2026-10-21T08:30:00.000Z' }, async () => profile);

  assert.deepEqual(result, { emailVerified: true, profile });
  assert.equal('onboardingComplete' in result, false);
});
