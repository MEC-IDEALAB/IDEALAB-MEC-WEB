'use server';

import { serverClient } from '@/lib/supabase';
import { hasVerifiedEmail } from '@/lib/member-access';
import { evaluateOwnProfile } from '@/lib/member-profile';
import { matchesFormAccount } from '@/lib/form-account';
import { inspectMemberSessionScope } from '@/lib/recovery-authority';
import { publicProfileEnabled } from './public-profile-config';
import { parsePublicProfileRead, parsePublicProfileSave, profilePayloadFromForm, type PublicProfileState } from './public-profile-contract';

export async function savePrivateProfileDraft(_previous: PublicProfileState, form: FormData): Promise<PublicProfileState> {
  if (!publicProfileEnabled()) return { status: 'error', message: 'Profile publishing is not connected yet. Nothing has been saved.' };
  if (form.has('visibility')) return { status: 'error', message: 'Draft saves cannot change profile visibility.' };
  const privateDraft = new FormData();
  for (const [key, value] of form) privateDraft.append(key, value);
  privateDraft.set('visibility', 'private');
  const input = profilePayloadFromForm(privateDraft);
  if (!input) return { status: 'error', message: 'Check your profile fields, links and length limits before saving.' };
  const client = await serverClient({ writable: true });
  if (!client) return { status: 'error', message: 'Your profile could not be loaded. Keep your entries and try again.' };
  try {
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user || !hasVerifiedEmail(identity.data.user)) return { status: 'error', message: 'Sign in with your confirmed email before editing your profile.' };
    if (await inspectMemberSessionScope(client, identity.data.user) !== 'normal') return { status: 'error', message: 'Finish account recovery before editing your profile.' };
    if (!matchesFormAccount(form, identity.data.user.id)) return { status: 'error', message: 'Your signed-in account changed. Reload before saving this profile.' };
    const current = await client.rpc('get_own_profile_v1');
    if (current.error || evaluateOwnProfile(current.data, identity.data.user.id).profileState !== 'ready') return { status: 'error', message: 'An active member account with completed admission is needed before saving a draft.' };
    const own = await client.rpc('get_own_public_profile_v1');
    const profile = own.error ? null : parsePublicProfileRead(own.data);
    if (!profile) return { status: 'error', message: 'We couldn’t load your saved draft. Reload and try again.' };
    if (profile.initialized && profile.visibility === 'public') {
      return { status: 'error', message: 'This profile is already published. Draft editing is unavailable while it is public.' };
    }
    if (profile.revision !== input.revision) return { status: 'conflict', message: 'Your draft changed. Reload saved details before trying again.' };
    const result = await client.rpc('save_own_public_profile_v1', { p_payload: input.payload, p_expected_revision: input.revision });
    if (result.error) return { status: 'error', message: 'We couldn’t confirm the save. Keep your entries and reload saved details before trying again.' };
    const state = parsePublicProfileSave(result.data);
    if (state.status !== 'saved') return state;
    if (!state.profile || state.profile.visibility !== 'private'
      || BigInt(state.profile.revision) !== BigInt(input.revision) + BigInt(1)
      || (profile.initialized && state.profile.public_id !== profile.public_id)) {
      return { status: 'error', message: 'We couldn’t confirm a private draft save. Reload saved details before trying again.' };
    }
    return state;
  } catch { return { status: 'error', message: 'We couldn’t confirm the save. Keep your entries and reload saved details before trying again.' }; }
}
