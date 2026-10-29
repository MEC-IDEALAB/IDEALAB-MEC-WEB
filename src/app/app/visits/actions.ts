'use server';

import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/member';
import { serverClient } from '@/lib/supabase';
import { buildVisitCommand, parseVisitCommandResult, type VisitCommandState } from '@/lib/visit-command';
import { matchesFormAccount } from '@/lib/form-account';
import { validationFeatureEnabled } from '@/lib/config';

export async function changeOwnVisit(_previous: VisitCommandState, form: FormData): Promise<VisitCommandState> {
  if (!validationFeatureEnabled('ownVisits')) return parseVisitCommandResult(null);
  const member = await requireMember();
  if (!matchesFormAccount(form, member.user.id)) return { status: 'error', message: 'Your signed-in account changed. Refresh this page before updating your visit.' };
  const command = buildVisitCommand(form);
  if (!command) return { status: 'invalid', message: 'Check your visit purpose, or refresh this page if the form is out of date.' };
  const client = await serverClient({ writable: true });
  if (!client) return parseVisitCommandResult(null);
  try {
    const result = command.action === 'in'
      ? await client.rpc('check_in_lab_v1', command.payload)
      : await client.rpc('check_out_lab_v1', command.payload);
    const state = parseVisitCommandResult(result.error ? null : result.data);
    for (const path of ['/app', '/app/lab', '/app/visits']) revalidatePath(path);
    return state;
  } catch { return parseVisitCommandResult(null); }
}
