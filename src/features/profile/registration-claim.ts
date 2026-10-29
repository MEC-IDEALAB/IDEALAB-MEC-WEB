import { evaluateOwnProfile } from '../../lib/member-profile.ts';

/** Form boundary only. The shared database owns normalization and claim changes. */
export type RegistrationClaimState = {
  status: 'idle' | 'claimed' | 'invalid' | 'conflict' | 'not_claimed' | 'error';
  message: string;
  revision?: string;
};

export const initialRegistrationClaimState: RegistrationClaimState = { status: 'idle', message: '' };
export type RegistrationClaimInput =
  | { ok: true; display_number: string; expected_revision: string; self_declaration: true }
  | { ok: false; state: RegistrationClaimState };

function revision(value: unknown): value is string {
  const maximum = '9223372036854775807';
  return typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.exec(value)?.[0] === value
    && (value.length < maximum.length || value <= maximum);
}

/** Basic entry feedback, not an official format catalog or claim availability. */
export function registrationClaimNumberError(value: string): string | undefined {
  let length = 0;
  for (const character of value) {
    if (++length > 4096) return 'Use a shorter registration number.';
    const point = character.charCodeAt(0);
    if (point < 32 || (point >= 127 && point <= 159)) return 'Remove control characters from your registration number.';
  }
  // JS whitespace feedback is not a database comparison key. ICU and the
  // database normalizer remain authoritative, and display text is preserved.
  const feedback = value.trim().replace(/\s+/gu, ' ');
  if (!feedback) return 'Enter your MEC registration number.';
  if (Array.from(feedback).length > 64) return 'Use up to 64 characters after repeated spaces are combined.';
  if (!/^(LMDL|MDL)/i.test(feedback)) return 'MEC registration numbers start with MDL or LMDL.';
}

function invalid(): RegistrationClaimInput {
  return { ok: false, state: { status: 'invalid', message: 'Check your registration number and confirm the student declaration.' } };
}

/** Unknown and authority-bearing fields never become RPC input. */
export function buildRegistrationClaimPayload(formData: FormData): RegistrationClaimInput {
  if (!(formData instanceof FormData)) return invalid();
  const display = formData.getAll('registration_number');
  const expected = formData.getAll('expected_revision');
  const declaration = formData.getAll('self_declaration');
  if (display.length !== 1 || typeof display[0] !== 'string'
    || expected.length !== 1 || !revision(expected[0])
    || declaration.length !== 1 || declaration[0] !== 'on'
    || registrationClaimNumberError(display[0])) return invalid();
  return { ok: true, display_number: display[0], expected_revision: expected[0], self_declaration: true };
}

function uncertain(): RegistrationClaimState {
  return { status: 'error', message: 'We couldn’t confirm the claim result. Keep your entry and reload your saved profile before trying again.' };
}

/** Strict TABLE response parser. Never reflects provider errors or claim holders. */
export function parseRegistrationClaimResponse(response: unknown): RegistrationClaimState {
  try {
    if (!Array.isArray(response) || response.length !== 1) return uncertain();
    const row = response[0];
    if (!row || typeof row !== 'object' || Array.isArray(row)) return uncertain();
    const prototype = Object.getPrototypeOf(row);
    if (prototype !== Object.prototype && prototype !== null) return uncertain();
    const keys = Reflect.ownKeys(row);
    if (keys.length !== 2 || !keys.includes('status') || !keys.includes('profile_revision')) return uncertain();
    const descriptors = Object.getOwnPropertyDescriptors(row);
    if (!descriptors.status?.enumerable || !('value' in descriptors.status)
      || !descriptors.profile_revision?.enumerable || !('value' in descriptors.profile_revision)) return uncertain();
    const status: unknown = descriptors.status.value;
    const currentRevision: unknown = descriptors.profile_revision.value;
    if (currentRevision !== null && !revision(currentRevision)) return uncertain();
    switch (status) {
      case 'claimed':
        return revision(currentRevision)
          ? { status: 'claimed', message: 'Student declaration and registration claim saved.', revision: currentRevision }
          : uncertain();
      case 'invalid':
        return { status: 'invalid', message: 'Check your registration number and confirm the student declaration.' };
      case 'conflict':
        return { status: 'conflict', message: 'Your profile changed elsewhere. Reload saved details before trying again.' };
      case 'inactive':
        return { status: 'error', message: 'Account access is paused. This claim could not be saved.' };
      case 'verification_required':
        return { status: 'error', message: 'Confirm your email and sign in again before confirming your student declaration.' };
      case 'profile_required':
        return { status: 'error', message: 'Complete and save your required profile details before confirming your student declaration.' };
      case 'unavailable':
        return { status: 'error', message: 'We couldn’t load your saved profile. Keep your entry and try again later.' };
      case 'not_claimed':
        return { status: 'not_claimed', message: 'We couldn’t accept this declaration. Each MEC registration number can be used with one account. If you already completed onboarding with another email, sign out and use that account. Otherwise check the number issued to you and try again later.' };
      default:
        return uncertain();
    }
  } catch {
    return uncertain();
  }
}

/** A claim receipt alone cannot prove admission; require a fresh owner projection. */
export function confirmClaimedProfile(response: unknown, ownerId: string, claimedRevision: string, displayNumber: string): boolean {
  const current = evaluateOwnProfile(response, ownerId);
  return current.profileState === 'ready' && current.profile.role === 'student'
    && current.profile.mec_admitted === true && current.profile.profile_revision === claimedRevision
    && current.profile.college_roll === displayNumber;
}
