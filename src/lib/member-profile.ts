/**
 * Runtime boundary for the versioned, server-loaded own-profile RPC response.
 * The caller must verify Auth first. This parser does not establish identity,
 * reserve a registration number, or infer admission from client-entered values.
 */
export type OwnProfile = Readonly<{
  id: string;
  name: string;
  phone: string | null;
  college_roll: string | null;
  institution: string | null;
  department: string | null;
  study_year: number | null;
  role: 'student' | 'lab_admin' | 'super_admin';
  is_active: boolean | null;
  profile_completed: boolean | null;
  profile_contract_version: 0 | 1;
  profile_revision: string;
  mec_admitted: boolean;
}>;

export type OwnProfileResult =
  | { profileState: 'unavailable'; profile: null }
  | { profileState: 'inactive' | 'incomplete' | 'admission-required' | 'ready'; profile: OwnProfile };

const fields = [
  'id', 'name', 'phone', 'college_roll', 'institution', 'department',
  'study_year', 'role', 'is_active', 'profile_completed',
  'profile_contract_version', 'profile_revision', 'mec_admitted',
] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxRevision = '9223372036854775807';

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuid.exec(value)?.[0] === value;
}

function isRevision(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.exec(value)?.[0] === value
    && (value.length < maxRevision.length || value <= maxRevision);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function nullableBoolean(value: unknown): value is boolean | null {
  return value === null || typeof value === 'boolean';
}

function boundedText(value: string | null, maximum: number, collapseSpacesForLength = false): boolean {
  if (value === null) return false;
  const trimmed = value.trim();
  // Registration display length allows repeated whitespace. This is feedback
  // only: JS and PostgreSQL whitespace classes need not be identical. The DB
  // normalizer/ICU comparison and server mec_admitted remain authoritative;
  // this local string is never a reservation key or a rewritten display value.
  const measured = collapseSpacesForLength ? trimmed.replace(/\s+/gu, ' ') : trimmed;
  // UTF-16 uses at most two code units per code point; bound allocation first.
  if (!measured || measured.length > maximum * 2) return false;
  for (const character of value) {
    const point = character.charCodeAt(0);
    if (point < 32 || (point >= 127 && point <= 159)) return false;
  }
  return Array.from(measured).length <= maximum;
}

function completeProfile(profile: OwnProfile): boolean {
  return profile.profile_contract_version === 1 && profile.profile_completed === true
    && boundedText(profile.name, 120)
    && typeof profile.phone === 'string' && /^\+[1-9][0-9]{1,14}$/.exec(profile.phone)?.[0] === profile.phone
    && boundedText(profile.college_roll, 64, true)
    && profile.institution === 'Model Engineering College'
    && boundedText(profile.department, 120)
    && profile.study_year !== null && profile.study_year >= 1 && profile.study_year <= 8;
}

function parseRow(value: unknown, expectedUserId: string): OwnProfile | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || fields.some(field => !keys.includes(field))) return null;
  // Supabase JSON contains own data properties, not getters or inherited values.
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (fields.some(field => !descriptors[field]?.enumerable || !('value' in descriptors[field]))) return null;
  const row = Object.fromEntries(fields.map(field => [field, descriptors[field].value])) as Record<(typeof fields)[number], unknown>;
  if (!isUuid(row.id)
    || row.id.toLowerCase() !== expectedUserId.toLowerCase()
    || typeof row.name !== 'string'
    || !nullableString(row.phone) || !nullableString(row.college_roll)
    || !nullableString(row.institution) || !nullableString(row.department)
    || (row.study_year !== null && !Number.isSafeInteger(row.study_year))
    || (row.role !== 'student' && row.role !== 'lab_admin' && row.role !== 'super_admin')
    || !nullableBoolean(row.is_active) || !nullableBoolean(row.profile_completed)
    || (row.profile_contract_version !== 0 && row.profile_contract_version !== 1)
    || !isRevision(row.profile_revision) || typeof row.mec_admitted !== 'boolean') return null;

  return Object.freeze({
    id: row.id,
    name: row.name,
    phone: row.phone,
    college_roll: row.college_roll,
    institution: row.institution,
    department: row.department,
    study_year: row.study_year as number | null,
    role: row.role,
    is_active: row.is_active,
    profile_completed: row.profile_completed,
    profile_contract_version: row.profile_contract_version,
    profile_revision: row.profile_revision,
    mec_admitted: row.mec_admitted,
  });
}

/** Evaluate exactly one own row returned by get_own_profile_v1(). */
export function evaluateOwnProfile(response: unknown, expectedUserId: string): OwnProfileResult {
  const unavailable: OwnProfileResult = { profileState: 'unavailable', profile: null };
  if (!isUuid(expectedUserId)) return unavailable;
  try {
    if (!Array.isArray(response) || response.length !== 1) return unavailable;
    const profile = parseRow(response[0], expectedUserId);
    if (!profile) return unavailable;
    if (profile.is_active !== true) return { profileState: 'inactive', profile };
    // Trusted staff retain their separate access path; student attestation does
    // not confer or remove staff authority, scopes or operating permissions.
    if (profile.role !== 'student') return { profileState: 'ready', profile };
    if (!completeProfile(profile)) return { profileState: 'incomplete', profile };
    if (!profile.mec_admitted) return { profileState: 'admission-required', profile };
    return { profileState: 'ready', profile };
  } catch {
    // A malformed response is unavailable, never a successful empty profile.
    return unavailable;
  }
}
