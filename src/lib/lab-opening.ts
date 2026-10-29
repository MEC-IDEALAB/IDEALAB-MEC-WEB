export type LabChange = Readonly<{ revision: string; action: 'open' | 'close'; actor_name: string; actor_duty: string; occurred_at: string }>;
export type LabOpening = Readonly<{ status: 'unknown' | 'open' | 'closed'; revision: string; can_manage: boolean; changes: LabChange[] }>;
export type LabOpeningResult = { status: 'ready'; opening: LabOpening } | { status: 'unavailable'; opening: null };
export type LabOpeningActionState = { status: 'idle' | 'saved' | 'error'; message: string };
const unavailable: LabOpeningResult = { status: 'unavailable', opening: null };
const maxRevision = '9223372036854775807';
export function validOpeningRevision(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.test(value)
    && (value.length < maxRevision.length || value <= maxRevision);
}
function record(value: unknown, fields: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(value).length === fields.length && fields.every(key => descriptors[key]?.enumerable && 'value' in descriptors[key]);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && [...value].length <= 120
    && ![...value].some(character => { const code = character.charCodeAt(0); return code < 32 || (code >= 127 && code <= 159); });
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}
/** Bounded member-safe journal. Malformed or conflicting state is unavailable. */
export function parseLabOpening(value: unknown): LabOpeningResult {
  try {
    if (!record(value, ['status', 'revision', 'can_manage', 'changes'])
      || !['unknown', 'open', 'closed'].includes(value.status as string)
      || !validOpeningRevision(value.revision) || typeof value.can_manage !== 'boolean'
      || !Array.isArray(value.changes) || value.changes.length > 20) return unavailable;
    const changes: LabChange[] = [];
    for (const item of value.changes) {
      if (!record(item, ['revision', 'action', 'actor_name', 'actor_duty', 'occurred_at'])
        || !validOpeningRevision(item.revision) || item.revision === '0' || (item.action !== 'open' && item.action !== 'close')
        || !text(item.actor_name) || !text(item.actor_duty) || !timestamp(item.occurred_at)) return unavailable;
      const previous = changes.at(-1);
      if (previous && (BigInt(previous.revision) !== BigInt(item.revision) + BigInt(1) || previous.action === item.action
        || Date.parse(previous.occurred_at) < Date.parse(item.occurred_at))) return unavailable;
      changes.push({ revision: item.revision, action: item.action, actor_name: item.actor_name, actor_duty: item.actor_duty, occurred_at: item.occurred_at });
    }
    if (value.status === 'unknown') {
      if (value.revision !== '0' || changes.length !== 0) return unavailable;
    } else if (changes.length !== Number(BigInt(value.revision) > BigInt(20) ? BigInt(20) : BigInt(value.revision))
      || changes[0]?.revision !== value.revision || changes[0]?.action !== (value.status === 'open' ? 'open' : 'close')) return unavailable;
    return { status: 'ready', opening: { status: value.status as LabOpening['status'], revision: value.revision, can_manage: value.can_manage, changes } };
  } catch { return unavailable; }
}

export function buildLabOpeningCommand(form: FormData) {
  const action = form.get('action'), revision = form.get('expected_revision'), command = form.get('command_id');
  if (form.getAll('action').length !== 1 || form.getAll('expected_revision').length !== 1 || form.getAll('command_id').length !== 1
    || (action !== 'open' && action !== 'close') || !validOpeningRevision(revision)
    || typeof command !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(command)) return null;
  return { p_action: action, p_expected_revision: revision, p_command_id: command };
}

export function parseLabOpeningAction(value: unknown): LabOpeningActionState {
  if (record(value, ['status', 'revision']) && (value.status === 'applied' || value.status === 'unchanged') && validOpeningRevision(value.revision))
    return { status: 'saved', message: value.status === 'applied' ? 'Lab status saved. The latest record is shown above.' : 'The lab already has this status. No duplicate record was added.' };
  if (record(value, ['status']) && value.status === 'conflict') return { status: 'error', message: 'The lab status changed in another tab or by another core member. Refresh, check the latest record and try again.' };
  if (record(value, ['status']) && value.status === 'denied') return { status: 'error', message: 'Your account does not currently have lab opening duty. The status was not changed.' };
  return { status: 'error', message: 'We couldn’t confirm this change. Refresh and check the latest status before retrying.' };
}
