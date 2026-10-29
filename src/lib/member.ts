import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverClient } from './supabase';
import { loadProfileForVerifiedUser } from './member-access';
import { evaluateOwnProfile } from './member-profile';

// Account status is available outside the operational workspace so onboarding,
// inactive and unavailable states never depend on rendering a protected child.
export const loadMemberAccount = cache(async () => {
  const client = await serverClient();
  if (!client) redirect('/sign-in?notice=configuration');
  let user;
  try { const result = await client.auth.getUser(); if (!result.error) user = result.data.user; } catch { /* Fail closed when identity cannot be verified. */ }
  if (!user) redirect('/sign-in?notice=session');
  // A session alone is not proof of the verified-email identity required by
  // the member contract. The helper guarantees that unverified users do not
  // trigger a profile lookup.
  const result = await loadProfileForVerifiedUser(user, async () => {
    // This versioned RPC derives admission in the database. A missing/older
    // projection fails closed rather than reverting to the old active-only read.
    try {
      const { data, error } = await client.rpc('get_own_profile_v1');
      if (error) return { profile: null, profileState: 'unavailable' as const };
      return evaluateOwnProfile(data, user.id);
    } catch { return { profile: null, profileState: 'unavailable' as const }; }
  });
  if (!result.emailVerified) return { user, profile: null, profileState: 'unverified' as const };
  return { user, ...result.profile };
});

export const requireMember = cache(async () => {
  const member = await loadMemberAccount();
  if (member.profileState !== 'ready') redirect('/account-access');
  return member;
});
