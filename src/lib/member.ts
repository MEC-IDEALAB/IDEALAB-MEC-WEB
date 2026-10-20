import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverClient } from './supabase';

export const requireMember = cache(async () => {
  const client = await serverClient();
  if (!client) redirect('/sign-in?notice=configuration');
  let user;
  try { const result = await client.auth.getUser(); if (!result.error) user = result.data.user; } catch { /* Fail closed when identity cannot be verified. */ }
  if (!user) redirect('/sign-in?notice=session');
  // Read only the signed-in member's minimum profile. Never read a public directory.
  try {
    const { data, error } = await client.from('users').select('id,name,is_active').eq('id', user.id).maybeSingle();
    if (error || !data) return { user, profile: null, profileState: 'unavailable' as const };
    if (!data.is_active) return { user, profile: null, profileState: 'inactive' as const };
    return { user, profile: data as { id: string; name: string; is_active: boolean }, profileState: 'ready' as const };
  } catch { return { user, profile: null, profileState: 'unavailable' as const }; }
});
