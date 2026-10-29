export type OwnVisit = Readonly<{ id: string; user_id: string; checkin_time: string; checkout_time: string | null; purpose: string | null }>;
export type OwnVisitsResult = { status: 'ready'; visits: OwnVisit[] } | { status: 'unavailable'; visits: null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = ['id', 'user_id', 'checkin_time', 'checkout_time', 'purpose'];
const unavailable: OwnVisitsResult = { status: 'unavailable', visits: null };
function unsafeText(value: string) {
  return [...value].some(character => {
    const code = character.charCodeAt(0);
    return code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13);
  });
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}
/** Exact bounded own-row projection; failure must never become an empty history. */
export function parseOwnVisits(data: unknown, owner: string): OwnVisitsResult {
  if (!uuid.test(owner) || !Array.isArray(data) || data.length > 20) return unavailable;
  const visits: OwnVisit[] = [];
  const ids = new Set<string>();
  for (const item of data) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.getPrototypeOf(item) !== Object.prototype) return unavailable;
    const descriptors = Object.getOwnPropertyDescriptors(item);
    const keys = Reflect.ownKeys(item);
    if (keys.length !== fields.length || fields.some(field => !descriptors[field]?.enumerable || !('value' in descriptors[field]))) return unavailable;
    const { id, user_id, checkin_time, checkout_time, purpose } = item;
    if (typeof id !== 'string' || !uuid.test(id) || ids.has(id) || user_id !== owner || !timestamp(checkin_time)
      || (checkout_time !== null && (!timestamp(checkout_time) || Date.parse(checkout_time) < Date.parse(checkin_time)))
      || (purpose !== null && (typeof purpose !== 'string' || purpose.length > 2000 || unsafeText(purpose)))) return unavailable;
    ids.add(id);
    visits.push({ id, user_id, checkin_time, checkout_time, purpose });
  }
  // Old clients can leave multiple active sessions. Do not choose one silently.
  if (visits.filter(visit => visit.checkout_time === null).length > 1) return unavailable;
  return { status: 'ready', visits };
}
