'use server';

import { revalidatePath } from 'next/cache';
import { serverClient } from '@/lib/supabase';
import { hasVerifiedEmail } from '@/lib/member-access';
import { evaluateOwnProfile } from '@/lib/member-profile';
import { matchesFormAccount } from '@/lib/form-account';
import { buildRegistrationClaimPayload, parseRegistrationClaimResponse, confirmClaimedProfile, type RegistrationClaimState } from '@/features/profile/registration-claim';
import { buildProfileSavePayload, parseProfileSaveResponse, type ProfileSaveState } from '@/features/profile/profile-save';

// This action deliberately does not use requireMember: incomplete verified
// owners must be able to save progress without entering the workspace.
export async function saveRequiredProfile(_previous: ProfileSaveState, formData: FormData): Promise<ProfileSaveState> {
  const client = await serverClient({ writable: true });
  if (!client) return { status: 'error', message: 'Profile saving is not available right now. Your entered details have not been saved.' };
  const prepared = buildProfileSavePayload(formData);
  if (!prepared.ok) return prepared.state;
  try {
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user || !hasVerifiedEmail(identity.data.user)) {
      return { status: 'error', message: 'Sign in with your confirmed email before saving your profile.' };
    }
    if (!matchesFormAccount(formData, identity.data.user.id)) return { status: 'error', message: 'Your signed-in account changed. Copy any details you need, then reload before saving.' };
    const current = await client.rpc('get_own_profile_v1');
    if (current.error) return { status: 'error', message: 'We couldn’t load your saved profile. Refresh and try again.' };
    const account = evaluateOwnProfile(current.data, identity.data.user.id);
    if (account.profileState === 'inactive') return { status: 'error', message: 'This account is not active. Your profile has not been changed.' };
    if (account.profileState === 'unavailable') return { status: 'error', message: 'We couldn’t load your saved profile. Refresh and try again.' };

    // The database rechecks current identity, active state and the revision
    // under an owner-row lock. No authority fields or service key are passed.
    const result = await client.rpc('save_own_profile_v1', {
      p_profile: prepared.profile,
      p_expected_revision: prepared.expected_revision,
    });
    if (result.error) return { status: 'error', message: 'We couldn’t confirm the save. Keep your entered details and reload your saved profile before retrying.' };
    const state = parseProfileSaveResponse(result.data);
    if (state.status === 'saved') {
      revalidatePath('/account-access');
      revalidatePath('/app/profile');
    }
    return state;
  } catch {
    // A lost response can follow a committed save; never promise rollback.
    return { status: 'error', message: 'We couldn’t confirm the save. Keep your entered details and reload your saved profile before retrying.' };
  }
}


export async function claimMecRegistration(_previous: RegistrationClaimState, formData: FormData): Promise<RegistrationClaimState> {
  const input = buildRegistrationClaimPayload(formData);
  if (!input.ok) return input.state;
  const client = await serverClient({ writable: true });
  if (!client) return { status: 'error', message: 'Student declarations are not available right now. Your entries are still here.' };
  try {
    const identity = await client.auth.getUser();
    if (identity.error || !identity.data.user || !hasVerifiedEmail(identity.data.user)) {
      return { status: 'error', message: 'Confirm your email and sign in before declaring MEC student eligibility.' };
    }
    if (!matchesFormAccount(formData, identity.data.user.id)) return { status: 'error', message: 'Your signed-in account changed. Copy any details you need, then reload before submitting.' };
    const current = await client.rpc('get_own_profile_v1');
    if (current.error) return { status: 'error', message: 'We couldn’t load your saved profile. Keep your entries and reload before retrying.' };
    const account = evaluateOwnProfile(current.data, identity.data.user.id);
    if ((account.profileState !== 'ready' && account.profileState !== 'admission-required') || account.profile.role !== 'student') {
      return { status: 'error', message: 'An active student account with a complete profile is needed before this declaration.' };
    }
    const result = await client.rpc('claim_mec_registration_v1', {
      p_display_number: input.display_number,
      p_expected_revision: input.expected_revision,
      p_self_declaration: input.self_declaration,
    });
    if (result.error) return { status: 'error', message: 'We couldn’t confirm the declaration. Keep your entries and reload saved details before retrying.' };
    const state = parseRegistrationClaimResponse(result.data);
    if (state.status === 'claimed') {
      const fresh = await client.rpc('get_own_profile_v1');
      if (fresh.error || !state.revision || !confirmClaimedProfile(fresh.data, identity.data.user.id, state.revision, input.display_number)) {
        return { status: 'error', message: 'We couldn’t confirm your current student access. Keep your entry and reload saved details before retrying.' };
      }
      revalidatePath('/account-access');
      revalidatePath('/app/profile');
    }
    return state;
  } catch {
    return { status: 'error', message: 'We couldn’t confirm the declaration. Keep your entries and reload saved details before retrying.' };
  }
}
