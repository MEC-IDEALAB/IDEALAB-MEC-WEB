'use server';

import { serverClient } from '@/lib/supabase';
import { hasVerifiedEmail } from '@/lib/member-access';
import { evaluateOwnProfile } from '@/lib/member-profile';
import { matchesFormAccount } from '@/lib/form-account';
import { publicProfileEnabled } from './public-profile-config';
import { parsePublicProfileSave, profilePayloadFromForm, type PublicProfileState } from './public-profile-contract';

export async function savePublicProfile(_previous: PublicProfileState, form: FormData): Promise<PublicProfileState> {
  if (!publicProfileEnabled()) return { status: 'error', message: 'Profile publishing is not connected yet. Nothing has been saved.' };
  const input = profilePayloadFromForm(form);
  if (!input) return { status: 'error', message: 'Check your profile fields, links and length limits before saving.' };
  const client = await serverClient({ writable: true });
  if (!client) return { status: 'error', message: 'Your profile could not be loaded. Keep your entries and try again.' };
  try {
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user || !hasVerifiedEmail(identity.data.user)) return { status: 'error', message: 'Sign in with your confirmed email before editing your profile.' };
    if (!matchesFormAccount(form, identity.data.user.id)) return { status: 'error', message: 'Your signed-in account changed. Reload before saving this profile.' };
    const current = await client.rpc('get_own_profile_v1');
    if (current.error || evaluateOwnProfile(current.data, identity.data.user.id).profileState !== 'ready') return { status: 'error', message: 'An active member account with completed admission is needed before publishing.' };
    const result = await client.rpc('save_own_public_profile_v1', { p_payload: input.payload, p_expected_revision: input.revision });
    if (result.error) return { status: 'error', message: 'We couldn’t confirm the save. Keep your entries and reload saved details before trying again.' };
    return parsePublicProfileSave(result.data);
  } catch { return { status: 'error', message: 'We couldn’t confirm the save. Keep your entries and reload saved details before trying again.' }; }
}
