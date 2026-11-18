import 'server-only';
import { requireMember } from '@/lib/member';
import { backendConfig } from '@/lib/config';
import { serverClient } from '@/lib/supabase';
import { eventId, eventTime } from './event-contract';
import { managementEnabled, parseEventScopes, parseEventDraftList, type DraftCursor } from './management-contract';

export const eventManagementEnabled = () => managementEnabled(process.env.ACCOUNT_ENVIRONMENT, process.env.ENABLE_EVENT_MANAGEMENT_VALIDATION) && backendConfig() !== null;
export async function loadEventManagementScopes() {
  const member = await requireMember();
  if (!eventManagementEnabled()) return null;
  const client = await serverClient(); if (!client) return null;
  try {
    const response = await client.rpc('get_event_management_scopes_v1', { p_expected_actor: member.user.id });
    return response.error ? null : parseEventScopes(response.data);
  } catch { return null; }
}
export async function loadEventDrafts(scope: string, id: string | null = null, cursor: DraftCursor | null = null) {
  const member = await requireMember();
  if (!eventManagementEnabled() || !eventId(scope) || id !== null && !eventId(id)
    || cursor !== null && (!eventId(cursor.id) || !eventTime(cursor.created_at)) || id !== null && cursor !== null) return null;
  const client = await serverClient(); if (!client) return null;
  try {
    const response = await client.rpc('get_event_drafts_v1', { p_scope_id: scope, p_event_id: id,
      p_before_time: cursor?.created_at ?? null, p_before_id: cursor?.id ?? null, p_expected_actor: member.user.id });
    const result = response.error ? null : parseEventDraftList(response.data, scope);
    return result && (id === null || result.items.length <= 1 && result.items.every(item => item.id === id) && result.cursor === null) ? result : null;
  } catch { return null; }
}
