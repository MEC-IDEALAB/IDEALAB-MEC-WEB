import { eventId, eventTime, eventTypes } from './event-contract.ts';

export type EventDraftDetails = {
  title: string; description: string; venue: string; event_type: keyof typeof eventTypes;
  event_date: string; end_date: string | null; capacity: number | null;
  audience: 'open' | 'invite_only'; attendee_visibility: 'registered' | 'members' | 'head'; fee_paise: string;
};
export type EventDraft = { id: string; revision: string; details: EventDraftDetails; state: 'draft' | 'published'; created_at: string };
export type EventScope = { id: string; label: string };
export type DraftCursor = { created_at: string; id: string };
export type EventManagementCommand = { action: 'create'; scope_id: string; details: EventDraftDetails }
  | { action: 'edit'; event_id: string; revision: string; details: EventDraftDetails }
  | { action: 'publish'; event_id: string; revision: string };
export type EventSaved = { status: 'saved'; event_id: string; revision: string; state: 'draft' | 'published' };
export type EventRejected = { status: 'rejected'; reason: 'conflict' | 'invalid' };
/** Only explicit application exceptions prove this attempted command was rejected.
 * Permission loss may hide an earlier receipt, so it remains unresolved. */
export function terminalEventRejection(code: unknown, message: unknown): EventRejected | null {
  if (code === '40001' && message === 'Event revision conflict') return { status: 'rejected', reason: 'conflict' };
  if (code === '22023' && ['Invalid event details', 'Check event details before publication',
    'Paid and invite-only publication awaits the registration contract'].includes(message as string)) return { status: 'rejected', reason: 'invalid' };
  return null;
}
export const managementEnabled = (environment: string | undefined, flag: string | undefined) => environment === 'validation' && flag === 'true';
export function managementRecord(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(value).length === keys.length && keys.every(key => descriptors[key]?.enumerable && 'value' in descriptors[key]);
}
const revision = (value: unknown): value is string => typeof value === 'string' && /^[1-9][0-9]{0,17}$/.test(value);
function text(value: unknown, min: number, max: number, multiline = false): value is string {
  return typeof value === 'string' && Array.from(value).length >= min && Array.from(value).length <= max
    && !Array.from(value).some(char => { const n = char.codePointAt(0)!; return n < 32 && !(multiline && [9, 10, 13].includes(n)) || n >= 127 && n <= 159; });
}
export function parseEventDraftDetails(value: unknown): EventDraftDetails | null {
  try {
    if (!managementRecord(value, ['title', 'description', 'venue', 'event_type', 'event_date', 'end_date', 'capacity', 'audience', 'attendee_visibility', 'fee_paise'])
      || !text(value.title, 3, 160) || value.title !== value.title.trim()
      || !text(value.description, 20, 10000, true) || !text(value.venue, 1, 300) || !value.venue.trim()
      || typeof value.event_type !== 'string' || !Object.hasOwn(eventTypes, value.event_type)
      || !eventTime(value.event_date) || value.end_date !== null && (!eventTime(value.end_date) || Date.parse(value.end_date) <= Date.parse(value.event_date))
      || value.capacity !== null && (typeof value.capacity !== 'number' || !Number.isInteger(value.capacity) || value.capacity < 1 || value.capacity > 999999999)
      || !['open', 'invite_only'].includes(value.audience as string) || !['registered', 'members', 'head'].includes(value.attendee_visibility as string)
      || typeof value.fee_paise !== 'string' || !/^(0|[1-9][0-9]{0,8})$/.test(value.fee_paise)) return null;
    return value as EventDraftDetails;
  } catch { return null; }
}
export function parseEventManagementCommand(value: unknown): EventManagementCommand | null {
  try {
    if (managementRecord(value, ['action', 'scope_id', 'details']) && value.action === 'create' && eventId(value.scope_id) && parseEventDraftDetails(value.details)) return value as EventManagementCommand;
    if (managementRecord(value, ['action', 'event_id', 'revision', 'details']) && value.action === 'edit' && eventId(value.event_id) && revision(value.revision) && parseEventDraftDetails(value.details)) return value as EventManagementCommand;
    if (managementRecord(value, ['action', 'event_id', 'revision']) && value.action === 'publish' && eventId(value.event_id) && revision(value.revision)) return value as EventManagementCommand;
    return null;
  } catch { return null; }
}
export function parseEventSaved(value: unknown): EventSaved | null {
  try {
    return managementRecord(value, ['status', 'event_id', 'revision', 'state']) && value.status === 'saved' && eventId(value.event_id)
      && revision(value.revision) && ['draft', 'published'].includes(value.state as string) ? value as EventSaved : null;
  } catch { return null; }
}
export function savedEventMatches(value: EventSaved, command: EventManagementCommand): boolean {
  if (command.action === 'create') return value.revision === '1' && value.state === 'draft';
  return value.event_id === command.event_id && value.revision === (BigInt(command.revision) + BigInt(1)).toString()
    && value.state === (command.action === 'publish' ? 'published' : 'draft');
}
/** Editor times are explicitly IST, independent of the browser's timezone. */
export function eventEditorDetails(form: FormData): EventDraftDetails | null {
  const names = ['title', 'description', 'venue', 'event_type', 'event_date', 'end_date', 'capacity', 'audience', 'attendee_visibility', 'fee'];
  if (names.some(name => form.getAll(name).length !== 1 || typeof form.get(name) !== 'string')) return null;
  const get = (name: string) => (form.get(name) as string).trim();
  const time = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+05:30` : '';
  const fee = get('fee');
  if (!/^(0|[1-9][0-9]{0,6})(\.[0-9]{1,2})?$/.test(fee) || get('capacity') && !/^[1-9][0-9]{0,8}$/.test(get('capacity'))) return null;
  const [whole, fraction = ''] = fee.split('.');
  return parseEventDraftDetails({ title: get('title'), description: get('description'), venue: get('venue'), event_type: get('event_type'),
    event_date: time(get('event_date')), end_date: get('end_date') ? time(get('end_date')) : null,
    capacity: get('capacity') ? Number(get('capacity')) : null, audience: get('audience'), attendee_visibility: get('attendee_visibility'),
    fee_paise: (BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'))).toString() });
}
export function parseEventScopes(value: unknown): EventScope[] | null {
  try {
    if (!managementRecord(value, ['items']) || !Array.isArray(value.items) || value.items.length > 50) return null;
    const ids = new Set<string>();
    for (const item of value.items) {
      if (!managementRecord(item, ['id', 'label']) || !eventId(item.id) || ids.has(item.id.toLowerCase()) || !text(item.label, 1, 120)) return null;
      ids.add(item.id.toLowerCase());
    }
    return value.items as EventScope[];
  } catch { return null; }
}
export function parseEventDraftList(value: unknown, expectedScope: string): { items: EventDraft[]; cursor: DraftCursor | null } | null {
  try {
    if (!eventId(expectedScope) || !managementRecord(value, ['scope_id', 'items', 'cursor']) || value.scope_id !== expectedScope
      || !Array.isArray(value.items) || value.items.length > 20) return null;
    const ids = new Set<string>();
    for (const item of value.items) {
      if (!managementRecord(item, ['id', 'revision', 'details', 'state', 'created_at']) || !eventId(item.id) || ids.has(item.id.toLowerCase())
        || !revision(item.revision) || !parseEventDraftDetails(item.details) || !['draft', 'published'].includes(item.state as string) || !eventTime(item.created_at)) return null;
      ids.add(item.id.toLowerCase());
    }
    if (value.cursor !== null && (!managementRecord(value.cursor, ['created_at', 'id']) || !eventTime(value.cursor.created_at) || !eventId(value.cursor.id)
      || value.items.length !== 20 || value.items.at(-1).id !== value.cursor.id || value.items.at(-1).created_at !== value.cursor.created_at)) return null;
    return { items: value.items as EventDraft[], cursor: value.cursor as DraftCursor | null };
  } catch { return null; }
}
