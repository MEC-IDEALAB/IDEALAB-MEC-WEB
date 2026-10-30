/** Shared form/response boundary. The database remains the profile-write authority. */
export type ProfileSaveState = {
  status: 'idle' | 'saved' | 'invalid' | 'conflict' | 'error';
  message: string;
  revision?: string;
};

export const initialProfileSaveState: ProfileSaveState = { status: 'idle', message: '' };

export const profileSaveFields = [
  'name', 'phone', 'college_roll', 'institution', 'department', 'study_year',
] as const;
export type ProfileSaveField = (typeof profileSaveFields)[number];
export type ProfileSaveValues = Record<ProfileSaveField, string>;
export type ProfileSavePayload = {
  name: string;
  phone: string | null;
  college_roll: string | null;
  institution: string | null;
  department: string | null;
  study_year: number | null;
};
export type ProfileSaveInput =
  | { ok: true; profile: ProfileSavePayload; expected_revision: string }
  | { ok: false; state: ProfileSaveState };

const institution = 'Model Engineering College';
const maximumRevision = '9223372036854775807';

function revision(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.exec(value)?.[0] === value
    && (value.length < maximumRevision.length || value <= maximumRevision);
}

function hasControls(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || (code >= 127 && code <= 159)) return true;
  }
  return false;
}

function lengthWithin(value: string, maximum: number, collapseWhitespace = false): boolean {
  const trimmed = value.trim();
  // Registration whitespace folding here is length feedback only. The database
  // normalizer/ICU comparison is authoritative; this is never a reservation key.
  const measured = collapseWhitespace ? trimmed.replace(/\s+/gu, ' ') : trimmed;
  return measured.length <= maximum * 2 && Array.from(measured).length <= maximum;
}

/** Entry feedback only; neither this result nor an email domain grants admission. */
export function profileSaveFieldErrors(values: ProfileSaveValues, requireComplete = false): Partial<Record<ProfileSaveField, string>> {
  const errors: Partial<Record<ProfileSaveField, string>> = {};
  for (const field of profileSaveFields) {
    if (hasControls(values[field])) errors[field] = 'Remove control characters from this detail.';
  }
  if (!lengthWithin(values.name, 120)) errors.name = 'Use up to 120 characters for your name.';
  if (values.phone.trim() && /^\+[1-9][0-9]{1,14}$/.exec(values.phone)?.[0] !== values.phone) {
    errors.phone = 'Use + and your country code, followed by 2–15 digits with no spaces.';
  }
  if (!lengthWithin(values.college_roll, 64, true)) errors.college_roll = 'Use up to 64 characters after repeated spaces are combined.';
  if (values.institution.trim() && values.institution.trim() !== institution) errors.institution = 'Use the preset Model Engineering College value.';
  if (!lengthWithin(values.department, 120)) errors.department = 'Use up to 120 characters for your department.';
  if (values.study_year !== '' && /^[1-8]$/.exec(values.study_year)?.[0] !== values.study_year) errors.study_year = 'Select Year 1 through Year 8.';
  if (requireComplete) {
    for (const field of profileSaveFields) {
      if (!values[field].trim()) errors[field] = 'This detail is required to keep your profile complete.';
    }
  }
  return errors;
}

function invalid(): ProfileSaveInput {
  return { ok: false, state: { status: 'invalid', message: 'Check the profile details and try again. Your entries are still here.' } };
}

/** Allowlist known fields; never forward framework metadata or authority inputs. */
export function buildProfileSavePayload(formData: FormData): ProfileSaveInput {
  if (!(formData instanceof FormData)) return invalid();
  const values = {} as ProfileSaveValues;
  for (const field of profileSaveFields) {
    const entries = formData.getAll(field);
    if (entries.length !== 1 || typeof entries[0] !== 'string') return invalid();
    values[field] = entries[0];
  }
  const revisions = formData.getAll('expected_revision');
  if (revisions.length !== 1 || !revision(revisions[0])) return invalid();
  if (Object.keys(profileSaveFieldErrors(values)).length) return invalid();
  const nullable = (value: string) => value.trim() ? value : null;
  return {
    ok: true,
    profile: {
      name: values.name.trim() ? values.name : '',
      phone: nullable(values.phone),
      college_roll: nullable(values.college_roll),
      institution: nullable(values.institution),
      department: nullable(values.department),
      study_year: values.study_year === '' ? null : Number(values.study_year),
    },
    expected_revision: revisions[0],
  };
}

function saveError(): ProfileSaveState {
  return { status: 'error', message: 'We couldn’t confirm a profile save. Your entries are still here. Reload the saved profile before trying again.' };
}

/** Parse only the reviewed two-column TABLE result; never show provider text. */
export function parseProfileSaveResponse(response: unknown): ProfileSaveState {
  try {
    if (!Array.isArray(response) || response.length !== 1) return saveError();
    const row = response[0];
    if (!row || typeof row !== 'object' || Array.isArray(row)) return saveError();
    const prototype = Object.getPrototypeOf(row);
    if (prototype !== Object.prototype && prototype !== null) return saveError();
    const keys = Reflect.ownKeys(row);
    if (keys.length !== 2 || !keys.includes('status') || !keys.includes('profile_revision')) return saveError();
    const descriptors = Object.getOwnPropertyDescriptors(row);
    if (!descriptors.status?.enumerable || !('value' in descriptors.status)
      || !descriptors.profile_revision?.enumerable || !('value' in descriptors.profile_revision)) return saveError();
    const status: unknown = descriptors.status.value;
    const currentRevision: unknown = descriptors.profile_revision.value;
    if (currentRevision !== null && !revision(currentRevision)) return saveError();
    switch (status) {
      case 'saved':
        return revision(currentRevision)
          ? { status: 'saved', message: 'Profile saved. Student admission is checked separately.', revision: currentRevision }
          : saveError();
      case 'invalid':
        return { status: 'invalid', message: 'Check the profile details and try again. Your entries are still here.' };
      case 'conflict':
        return { status: 'conflict', message: 'Your profile changed elsewhere. Review the saved profile before trying again. Your unsaved entries are still here.' };
      case 'inactive':
        return { status: 'error', message: 'Account access is paused. Your profile could not be saved.' };
      case 'verification_required':
        return { status: 'error', message: 'Confirm your email and sign in again before saving your profile.' };
      case 'unavailable':
        return { status: 'error', message: 'We couldn’t load your saved profile. Keep these entries and try again later.' };
      case 'claim_transition_required':
        return { status: 'error', message: 'Changing this registration number needs the separate declaration and claim step. These changes were not saved.' };
      case 'not_saved':
      default:
        return saveError();
    }
  } catch {
    return saveError();
  }
}
