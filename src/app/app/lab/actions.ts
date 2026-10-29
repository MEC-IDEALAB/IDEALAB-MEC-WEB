'use server';

import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { buildLabOpeningCommand, parseLabOpeningAction, type LabOpeningActionState } from '@/lib/lab-opening';
import { matchesFormAccount } from '@/lib/form-account';
import { validationFeatureEnabled } from '@/lib/config';

export async function changeLabOpening(_previous: LabOpeningActionState, form: FormData): Promise<LabOpeningActionState> {
  if (!validationFeatureEnabled('labOpening')) return parseLabOpeningAction(null);
  const member = await requireMember();
  if (!matchesFormAccount(form, member.user.id)) return { status: 'error', message: 'Your signed-in account changed. Refresh before changing the lab status.' };
  const command = buildLabOpeningCommand(form);
  if (!command) return { status: 'error', message: 'This form is out of date. Refresh before changing the lab status.' };
  const client = await serverClient({ writable: true });
  if (!client) return parseLabOpeningAction(null);
  try {
    // The RPC rechecks current membership and duty assignment under row locks.
    // No actor, name, client time or role comes from this form.
    const result = await client.rpc('set_lab_opening_v1', command);
    const state = parseLabOpeningAction(result.error ? null : result.data);
    for (const path of ['/app', '/app/lab', '/app/visits']) revalidatePath(path);
    return state;
  } catch { return parseLabOpeningAction(null); }
}
