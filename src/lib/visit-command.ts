export type VisitCommandState = Readonly<{ status: 'idle' | 'saved' | 'invalid' | 'closed' | 'error'; message: string }>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function unsafeText(value: string) {
  return [...value].some(character => { const point = character.charCodeAt(0); return (point < 32 && point !== 9 && point !== 10 && point !== 13) || (point >= 127 && point <= 159); });
}
export function buildVisitCommand(form: FormData) {
  const action = form.get('visit_action'), command = form.get('command_id');
  if (form.getAll('visit_action').length !== 1 || form.getAll('command_id').length !== 1 || (action !== 'in' && action !== 'out') || typeof command !== 'string' || !uuid.test(command)) return null;
  if (action === 'in') {
    const purpose = form.get('purpose');
    if (form.getAll('purpose').length !== 1 || form.has('visit_id') || purpose !== 'Lab visit' || unsafeText(purpose)) return null;
    return { action, payload: { p_purpose: 'Lab visit', p_command_id: command } } as const;
  }
  const visit = form.get('visit_id');
  if (form.getAll('visit_id').length !== 1 || form.has('purpose') || typeof visit !== 'string' || !uuid.test(visit)) return null;
  return { action, payload: { p_visit_id: visit, p_command_id: command } } as const;
}
function exactRecord(value: unknown, fields: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(value).length === fields.length && fields.every(field => descriptors[field]?.enumerable && 'value' in descriptors[field]);
}
export function parseVisitCommandResult(value: unknown): VisitCommandState {
  try {
    if (exactRecord(value, ['status', 'visit_id']) && ['checked_in','already_in','checked_out','already_out'].includes(value.status as string) && typeof value.visit_id === 'string' && uuid.test(value.visit_id))
      return { status: 'saved', message: 'Visit updated.' };
    if (exactRecord(value, ['status'])) {
      if (value.status === 'closed') return { status: 'closed', message: 'Check-in is unavailable while the lab is closed or its opening has not been recorded. Refresh the lab status before trying again.' };
      if (value.status === 'invalid') return { status: 'invalid', message: 'This check-in could not be saved. Refresh the lab session and try again.' };
      if (value.status === 'conflict') return { status: 'error', message: 'We couldn’t apply this visit request. Refresh your current visit before trying again.' };
      if (value.status === 'denied') return { status: 'error', message: 'Your account does not currently have member access. Your visit has not been changed.' };
    }
  } catch { /* Fail closed for malformed responses. */ }
  return { status: 'error', message: 'We couldn’t confirm this visit update. Refresh to check your current visit before retrying.' };
}
