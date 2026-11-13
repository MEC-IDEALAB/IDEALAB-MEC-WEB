'use server';
import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/member';
import { matchesFormAccount } from '@/lib/form-account';
import { serverClient } from '@/lib/supabase';
import { eventManagementEnabled } from '@/features/events/management-data';
import { eventId } from '@/features/events/event-contract';
import { parseEventManagementCommand, parseEventSaved, savedEventMatches, terminalEventRejection, type EventRejected, type EventSaved } from '@/features/events/management-contract';

export async function saveEventDraft(form: FormData): Promise<EventSaved | EventRejected | null> {
  const member = await requireMember();
  if (!eventManagementEnabled() || !matchesFormAccount(form, member.user.id)) return null;
  const raw = form.get('command'), commandId = form.get('command_id');
  if (form.getAll('command').length !== 1 || form.getAll('command_id').length !== 1
    || typeof raw !== 'string' || raw.length > 65000 || !eventId(commandId)) return null;
  let command;
  try { command = parseEventManagementCommand(JSON.parse(raw)); } catch { return null; }
  if (!command) return null;
  const client = await serverClient({ writable: true }); if (!client) return null;
  try {
    const response = await client.rpc('mutate_event_draft_v1', { p_command: command, p_command_id: commandId, p_expected_actor: member.user.id });
    if (response.error) return terminalEventRejection(response.error.code, response.error.message);
    const result = parseEventSaved(response.data);
    if (!result || !savedEventMatches(result, command)) return null;
    revalidatePath('/app/events/manage'); revalidatePath('/app/events'); revalidatePath(`/app/events/${result.event_id}`);
    revalidatePath('/app'); revalidatePath('/app/lab');
    return result;
  } catch { return null; }
}
