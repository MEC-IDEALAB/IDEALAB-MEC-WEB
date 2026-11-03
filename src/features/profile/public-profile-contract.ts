export type ProfileLink = Readonly<{ label: string; url: string }>;
export type PublicProfilePayload = Readonly<{ display_name: string; bio: string; interests: string[]; skills: string[]; links: ProfileLink[]; visibility: 'public' | 'private' }>;
export type PublicProfile = Readonly<Omit<PublicProfilePayload, 'display_name'> & { display_name: string | null; public_id: string | null; revision: string; initialized: boolean }>;
export type PublicProfileState = Readonly<{ status: 'idle' | 'saved' | 'error' | 'conflict'; message: string; profile?: PublicProfile }>;
const keys = ['display_name', 'bio', 'interests', 'skills', 'links', 'visibility'];
const projectionKeys = [...keys, 'public_id', 'revision', 'initialized'];
export const emptyPublicProfile: PublicProfile = { public_id: null, revision: '0', initialized: false, display_name: null, bio: '', interests: [], skills: [], links: [], visibility: 'public' };
export const publicProfileId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
export const publicProfileRevision = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.test(value) && (value.length < 19 || value <= '9223372036854775807');
function record(value: unknown, allowed: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const own = Reflect.ownKeys(value);
  return own.length === allowed.length && own.every(key => typeof key === 'string' && allowed.includes(key) && Object.getOwnPropertyDescriptor(value, key)?.get === undefined && Object.getOwnPropertyDescriptor(value, key)?.set === undefined);
}
function hasControlCharacters(value: string, allowLineFeed = false) {
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if ((codePoint < 32 && !(allowLineFeed && codePoint === 10)) || (codePoint >= 127 && codePoint <= 159)) return true;
  }
  return false;
}
const text = (value: unknown, max: number, blank = true, allowLineFeed = false): value is string => typeof value === 'string' && [...value].length <= max && (blank || value.trim().length > 0) && !hasControlCharacters(value, allowLineFeed);
function tags(value: unknown, max: number): value is string[] {
  return Array.isArray(value) && value.length <= 20 && Array.from(value).every(item => text(item, max, false)) && new Set(value.map(item => item.trim().toLocaleLowerCase('en-US'))).size === value.length;
}
export function safeProfileUrl(value: unknown): value is string {
  return normalizeProfileUrl(value) !== null;
}
export function normalizeProfileUrl(value: unknown): string | null {
  if (!text(value, 2048, false) || !value.startsWith('https://') || /\s|\\/u.test(value)) return null;
  try {
    const url = new URL(value);
    const authority = value.slice('https://'.length).split(/[/?#]/u, 1)[0];
    const canonicalAuthority = authority.toLowerCase();
    const labels = canonicalAuthority.split('.');
    // WHATWG URL treats an all-numeric or hexadecimal final label as an IPv4
    // atom. Reject it here too so direct SQL saves cannot create links that
    // the browser parser later refuses to load.
    const numericAddressSuffix = /^(?:[0-9]+|0x[0-9a-f]*)$/iu.test(labels.at(-1) ?? '');
    const dnsName = labels.length >= 2 && labels.length <= 127 && labels.every(label =>
      label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label));
    if (url.protocol !== 'https:' || !dnsName || numericAddressSuffix || authority.length > 253 || canonicalAuthority !== url.host || url.port || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
export function validPublicProfilePayload(value: unknown): value is PublicProfilePayload {
  if (!record(value, keys) || !text(value.display_name, 80) || !text(value.bio, 1000, true, true) || !tags(value.interests, 32) || !tags(value.skills, 48) || !['public', 'private'].includes(value.visibility as string)) return false;
  return Array.isArray(value.links) && value.links.length <= 8 && Array.from(value.links).every(link => record(link, ['label', 'url']) && text(link.label, 60, false) && safeProfileUrl(link.url));
}
export function parsePublicProfile(value: unknown): PublicProfile | null {
  if (!record(value, projectionKeys) || typeof value.initialized !== 'boolean' || !publicProfileRevision(value.revision) || !(value.display_name === null || typeof value.display_name === 'string')) return null;
  const payload = { display_name: value.display_name ?? '', bio: value.bio, interests: value.interests, skills: value.skills, links: value.links, visibility: value.visibility };
  if (!validPublicProfilePayload(payload)) return null;
  if (value.initialized ? !publicProfileId(value.public_id) || value.revision === '0' : value.public_id !== null || value.revision !== '0') return null;
  return { ...payload, display_name: value.display_name as string | null, public_id: value.public_id as string | null, revision: value.revision, initialized: value.initialized };
}
export function parsePublicProfileRead(value: unknown, expectedId?: string): PublicProfile | null {
  if (!record(value, ['status', 'profile']) || value.status !== 'ready') return null;
  const result = parsePublicProfile(value.profile);
  if (!result || (expectedId && (!result.initialized || result.public_id !== expectedId || result.visibility !== 'public'))) return null;
  return result;
}
export function parsePublicProfileSave(value: unknown): PublicProfileState {
  const uncertain: PublicProfileState = { status: 'error', message: 'We couldn’t confirm the save. Keep your entries and reload saved details before trying again.' };
  if (record(value, ['status', 'profile']) && ['saved', 'conflict'].includes(value.status as string)) {
    const profile = parsePublicProfile(value.profile);
    if (!profile || (value.status === 'saved' && !profile.initialized)) return uncertain;
    return value.status === 'saved' ? { status: 'saved', profile, message: profile.visibility === 'public' ? 'Your public profile is saved.' : 'Your profile is saved privately.' }
      : { status: 'conflict', profile, message: 'Your profile changed in another window. Keep your entries, then reload the saved version before editing again.' };
  }
  if (record(value, ['status']) && value.status === 'invalid') return { status: 'error', message: 'Check your profile fields, links and length limits before saving.' };
  if (record(value, ['status']) && value.status === 'unauthorized') return { status: 'error', message: 'Sign in with your active member account before editing this profile.' };
  return uncertain;
}
export function profilePayloadFromForm(form: FormData): { payload: PublicProfilePayload; revision: string } | null {
  const fields = ['display_name', 'bio', 'interests', 'skills', 'links', 'visibility', 'revision', 'expected_account'];
  if ([...form.keys()].some(key => !fields.includes(key) && !key.startsWith('$ACTION_')) || fields.some(key => form.getAll(key).length !== 1 || typeof form.get(key) !== 'string' || (form.get(key) as string).length > 24000)) return null;
  try {
    const rawLinks: unknown = JSON.parse(form.get('links') as string);
    if (!Array.isArray(rawLinks)) return null;
    const links = rawLinks.map((link: unknown) => {
      if (!record(link, ['label', 'url']) || typeof link.label !== 'string') return null;
      const url = normalizeProfileUrl(link.url);
      return url === null ? null : { label: link.label.trim(), url };
    });
    if (links.some(link => link === null)) return null;
    const payload = { display_name: (form.get('display_name') as string).trim(), bio: (form.get('bio') as string).trim(), interests: JSON.parse(form.get('interests') as string), skills: JSON.parse(form.get('skills') as string), links, visibility: form.get('visibility') };
    const revision = form.get('revision');
    return validPublicProfilePayload(payload) && publicProfileRevision(revision) ? { payload, revision } : null;
  } catch { return null; }
}
