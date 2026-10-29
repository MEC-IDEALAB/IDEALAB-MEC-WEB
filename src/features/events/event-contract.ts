export const eventStatuses = { upcoming: 'Upcoming', ongoing: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled' } as const;
export const eventTypes = { workshop: 'Workshop', hackathon: 'Hackathon', talk: 'Talk', competition: 'Competition', open_lab: 'Open lab', other: 'Other' } as const;
export type EventStatus = keyof typeof eventStatuses;
export type EventFilter = 'all' | EventStatus;
export type EventCard = { id: string; title: string; event_type: keyof typeof eventTypes | null; event_date: string; end_date: string | null; venue: string | null; status: EventStatus | null };
export type EventDetail = EventCard & { description: string | null };
export type EventCursor = { event_date: string; id: string };
export type EventList = { items: EventCard[]; cursor: EventCursor | null };
export type EventRead<T> = { status: 'ready'; data: T } | { status: 'unavailable'; data: null };
const unavailable = { status: 'unavailable', data: null } as const;
export const eventId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const eventFilter = (v: unknown): v is EventFilter => v === 'all' || typeof v === 'string' && Object.hasOwn(eventStatuses, v);
export type EventPageParams = { filter: EventFilter; cursor: EventCursor | null; version: 1 | 2 };
/** Old cursor links retain v1 ordering; new cursor links bind v2 to their filter. */
export function eventPageParams(p: Record<string, string | string[] | undefined>): EventPageParams | null {
  const filter = p.status === undefined ? 'all' : p.status;
  if (!eventFilter(filter)) return null;
  const hasCursor = p.before !== undefined || p.cursor !== undefined;
  if (!hasCursor) return p.order === undefined ? { filter, cursor: null, version: 2 } : null;
  if (!eventTime(p.before) || !eventId(p.cursor)) return null;
  const version = p.order === undefined ? 1 : p.order === `2:${filter}` ? 2 : null;
  return version ? { filter, cursor: { event_date: p.before, id: p.cursor }, version } : null;
}
export function eventTime(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-](\d{2}):(\d{2}))$/);
  if (!m) return false;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate() && hour <= 23 && minute <= 59 && second <= 59 && (m[7] === 'Z' || Number(m[8]) <= 14 && Number(m[9]) <= 59 && (Number(m[8]) < 14 || Number(m[9]) === 0)) && Number.isFinite(Date.parse(v));
}
function record(v: unknown, keys: string[]): v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype) return false;
  const d = Object.getOwnPropertyDescriptors(v);
  return Reflect.ownKeys(v).length === keys.length && keys.every(k => d[k]?.enumerable && 'value' in d[k]);
}
const text = (v: unknown, max: number): v is string => typeof v === 'string' && Array.from(v).length <= max && !Array.from(v).some(c => { const n = c.charCodeAt(0); return n < 32 && ![9, 10, 13].includes(n) || n >= 127 && n <= 159; });
const keys = ['id', 'title', 'event_type', 'event_date', 'end_date', 'venue', 'status'];
function card(v: unknown, detail = false): EventDetail | EventCard | null {
  if (!record(v, detail ? [...keys, 'description'] : keys) || !eventId(v.id) || !text(v.title, 500) || !v.title.trim() || !eventTime(v.event_date)
    || v.end_date !== null && !eventTime(v.end_date) || v.venue !== null && !text(v.venue, 500)
    || v.event_type !== null && !(typeof v.event_type === 'string' && Object.hasOwn(eventTypes, v.event_type))
    || v.status !== null && !(typeof v.status === 'string' && Object.hasOwn(eventStatuses, v.status))
    || detail && v.description !== null && !text(v.description, 50000)) return null;
  return v as unknown as EventCard | EventDetail;
}
export function parseEvents(v: unknown, filter: EventFilter): EventRead<EventList> {
  try {
    if (!eventFilter(filter) || !record(v, ['items', 'cursor']) || !Array.isArray(v.items) || v.items.length > 20) return unavailable;
    const ids = new Set<string>(); const items: EventCard[] = [];
    for (const value of v.items) {
      const item = card(value);
      if (!item || ids.has(item.id.toLowerCase()) || filter !== 'all' && item.status !== filter) return unavailable;
      ids.add(item.id.toLowerCase()); items.push(item);
    }
    let cursor: EventCursor | null = null;
    if (v.cursor !== null) {
      if (!record(v.cursor, ['event_date', 'id']) || !eventTime(v.cursor.event_date) || !eventId(v.cursor.id) || items.length !== 20 || items.at(-1)?.id !== v.cursor.id || items.at(-1)?.event_date !== v.cursor.event_date) return unavailable;
      cursor = v.cursor as unknown as EventCursor;
    }
    return { status: 'ready', data: { items, cursor } };
  } catch { return unavailable; }
}
/** The next-events RPC is bounded and has no pagination cursor. */
export function parseUpcomingEvents(v: unknown): EventRead<EventList> {
  const result = parseEvents(v, 'upcoming');
  return result.status === 'ready' && result.data.items.length <= 3 && result.data.cursor === null
    ? result : unavailable;
}
export function parseEvent(v: unknown, expectedId: string): EventRead<EventDetail | null> {
  try {
    if (!eventId(expectedId)) return unavailable;
    if (v === null) return { status: 'ready', data: null };
    const value = card(v, true);
    return value && value.id.toLowerCase() === expectedId.toLowerCase() ? { status: 'ready', data: value as EventDetail } : unavailable;
  } catch { return unavailable; }
}
