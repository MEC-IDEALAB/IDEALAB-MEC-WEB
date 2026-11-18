import 'server-only';
import { cache } from 'react';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { publicProfileEnabled } from './public-profile-config';
import { parsePublicProfileRead, publicProfileId } from './public-profile-contract';

export const loadOwnPublicProfile = cache(async () => {
  await requireMember();
  if (!publicProfileEnabled()) return null;
  const client = await serverClient();
  if (!client) return null;
  try { const result = await client.rpc('get_own_public_profile_v1'); return result.error ? null : parsePublicProfileRead(result.data); } catch { return null; }
});
export const loadPublicProfile = cache(async (id: string) => {
  if (!publicProfileId(id) || !publicProfileEnabled()) return null;
  const client = await serverClient();
  if (!client) return null;
  try { const result = await client.rpc('get_public_profile_v1', { p_public_id: id }); return result.error ? null : parsePublicProfileRead(result.data, id); } catch { return null; }
});
