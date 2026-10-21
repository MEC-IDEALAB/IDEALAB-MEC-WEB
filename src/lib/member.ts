import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverClient } from './supabase';
import { loadProfileForVerifiedUser } from './member-access';

export const requireMember = cache(async () => {
  const client = await serverClient();
  if (!client) redirect('/sign-in?notice=configuration');
  let user;
  try { const result = await client.auth.getUser(); if (!result.error) user = result.data.user; } catch { /* Fail closed when identity cannot be verified. */ }
  if (!user) redirect('/sign-in?notice=session');
  // A session alone is not proof of the verified-email identity required by
  // the member contract. The helper guarantees that unverified users do not
  // trigger a profile lookup.
  const result = await loadProfileForVerifiedUser(user, async () => {
    // Read only the signed-in member's minimum profile. Never read a public directory.
    try {
      const { data, error } = await client.from('users').select('id,name,is_active').eq('id', user.id).maybeSingle();
      if (error || !data) return { profile: null, profileState: 'unavailable' as const };
      if (!data.is_active) return { profile: null, profileState: 'inactive' as const };
      return { profile: data as { id: string; name: string; is_active: boolean }, profileState: 'ready' as const };
    } catch { return { profile: null, profileState: 'unavailable' as const }; }
  });
  if (!result.emailVerified) return { user, profile: null, profileState: 'unverified' as const };
  return { user, ...result.profile };
});
