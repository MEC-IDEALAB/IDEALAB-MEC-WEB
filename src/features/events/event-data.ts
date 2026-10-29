import 'server-only';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { parseEvents, parseUpcomingEvents, parseEvent, type EventFilter, type EventCursor } from './event-contract';
const unavailable = { status: 'unavailable', data: null } as const;
export async function loadEvents(filter: EventFilter, cursor: EventCursor | null, version: 1 | 2) {
  await requireMember(); const client = await serverClient(); if (!client) return unavailable;
  try {
    const result = version === 1
      ? await client.rpc('get_events_v1', { p_status: filter, p_before_time: cursor?.event_date ?? null, p_before_id: cursor?.id ?? null })
      : await client.rpc('get_events_v2', { p_status: filter, p_cursor_time: cursor?.event_date ?? null, p_cursor_id: cursor?.id ?? null });
    return result.error ? unavailable : parseEvents(result.data, filter);
  } catch { return unavailable; }
}
export async function loadEvent(id: string) {
  await requireMember(); const client = await serverClient(); if (!client) return unavailable;
  try { const result = await client.rpc('get_event_v1', { p_id: id }); return result.error ? unavailable : parseEvent(result.data, id); }
  catch { return unavailable; }
}
export async function loadUpcomingEvents() {
  await requireMember(); const client = await serverClient(); if (!client) return unavailable;
  try {
    const result = await client.rpc('get_upcoming_events_v1');
    return result.error ? unavailable : parseUpcomingEvents(result.data);
  } catch { return unavailable; }
}
