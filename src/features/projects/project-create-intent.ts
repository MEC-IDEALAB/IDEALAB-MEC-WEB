import { isProjectId, isProjectRevision, projectRecord, projectText } from './project-contract.ts';
import { confirmedProjectCreateReceipt } from './project-command.ts';

export type CreatePayload = Readonly<{ kind: 'create'; title: string; description: string; visibility: 'private' | 'public' }>;
export type ProjectCreateIntent =
  | Readonly<{ status: 'clear'; generation: string }>
  | Readonly<{ status: 'unresolved'; commandId: string; payload: CreatePayload | null; projectId: string | null; generation: string }>
  | Readonly<{ status: 'unavailable' }>;

export type AccountBoundCreateOutcome =
  | Readonly<{ status: 'saved'; projectId: string }>
  | Readonly<{ status: 'unresolved'; intent: Extract<ProjectCreateIntent, { status: 'unresolved' }> }>
  | Readonly<{ status: 'error'; message: string }>;

export type AccountBoundCreateRpc = Readonly<{
  readIntent: () => Promise<unknown>;
  mutate: (command: CreatePayload, commandId: string, generation: string, expectedUserId: string) => Promise<unknown>;
  readReceipt: (commandId: string) => Promise<unknown>;
  acknowledge: (commandId: string) => Promise<unknown>;
}>;

const error = (): AccountBoundCreateOutcome => ({ status: 'error', message: 'We could not confirm this project request. Check My projects before trying again.' });
const generationValid = (value: unknown): value is string => isProjectRevision(value);

export function parseProjectCreatePayload(value: unknown): CreatePayload | null {
  try {
    if (!projectRecord(value, ['kind', 'title', 'description', 'visibility']) || value.kind !== 'create'
      || !projectText(value.title, 160) || value.title !== value.title.trim()
      || !projectText(value.description, 4000, true) || value.description !== value.description.trim()
      || (value.visibility !== 'private' && value.visibility !== 'public')) return null;
    return { kind: 'create', title: value.title, description: value.description, visibility: value.visibility };
  } catch { return null; }
}

export function parseProjectCreateIntent(value: unknown): ProjectCreateIntent {
  try {
    if (projectRecord(value, ['status', 'generation']) && value.status === 'clear' && generationValid(value.generation)) {
      return { status: 'clear', generation: value.generation };
    }
    if (!projectRecord(value, ['status', 'command_id', 'payload', 'project_id', 'generation']) || value.status !== 'unresolved'
      || !isProjectId(value.command_id) || (value.project_id !== null && !isProjectId(value.project_id)) || !generationValid(value.generation)) {
      return { status: 'unavailable' };
    }
    const payload = value.payload === null ? null : parseProjectCreatePayload(value.payload);
    if (value.payload !== null && !payload) return { status: 'unavailable' };
    return { status: 'unresolved', commandId: value.command_id, payload, projectId: value.project_id, generation: value.generation };
  } catch { return { status: 'unavailable' }; }
}

export function sameCreatePayload(a: unknown, b: unknown): boolean {
  const left = parseProjectCreatePayload(a), right = parseProjectCreatePayload(b);
  return left !== null && right !== null && left.title === right.title && left.description === right.description && left.visibility === right.visibility;
}

function savedMutation(value: unknown): { projectId: string } | null {
  try {
    if (!projectRecord(value, ['status', 'project_id', 'revision']) || value.status !== 'saved'
      || !isProjectId(value.project_id) || !isProjectRevision(value.revision)) return null;
    return { projectId: value.project_id };
  } catch { return null; }
}

function acknowledged(value: unknown, projectId: string): boolean {
  try { return projectRecord(value, ['status', 'project_id']) && value.status === 'acknowledged' && value.project_id === projectId; }
  catch { return false; }
}

async function intent(rpc: AccountBoundCreateRpc): Promise<ProjectCreateIntent> {
  try { return parseProjectCreateIntent(await rpc.readIntent()); }
  catch { return { status: 'unavailable' }; }
}

async function receipt(rpc: AccountBoundCreateRpc, commandId: string): Promise<string | null> {
  try { return confirmedProjectCreateReceipt(await rpc.readReceipt(commandId)); }
  catch { return null; }
}

async function finishSaved(
  rpc: AccountBoundCreateRpc,
  commandId: string,
  generation: string,
  projectId: string,
): Promise<AccountBoundCreateOutcome> {
  if (await receipt(rpc, commandId) !== projectId) return error();
  try {
    if (acknowledged(await rpc.acknowledge(commandId), projectId)) return { status: 'saved', projectId };
  } catch { /* Read back the server intent below. */ }

  const after = await intent(rpc);
  if (after.status === 'clear' && after.generation !== generation && await receipt(rpc, commandId) === projectId) {
    // Another request already acknowledged this exact saved command.
    return { status: 'saved', projectId };
  }
  if (after.status === 'unresolved' && after.commandId === commandId && after.projectId === projectId) return { status: 'unresolved', intent: after };
  return error();
}

async function reconcile(
  rpc: AccountBoundCreateRpc,
  commandId: string,
  generation: string,
  payload: CreatePayload,
): Promise<AccountBoundCreateOutcome> {
  const current = await intent(rpc);
  if (current.status === 'unresolved') {
    if (current.commandId !== commandId || current.generation !== generation || !sameCreatePayload(current.payload, payload)) {
      return { status: 'unresolved', intent: current };
    }
    if (current.projectId) return finishSaved(rpc, commandId, generation, current.projectId);
    return { status: 'unresolved', intent: current };
  }
  if (current.status === 'clear' && current.generation !== generation) {
    const projectId = await receipt(rpc, commandId);
    if (projectId) return { status: 'saved', projectId };
  }
  return error();
}

export async function createProjectWithIntent(
  rpc: AccountBoundCreateRpc,
  input: Readonly<{ expectedUserId: string; commandId: string; generation: string; payload: CreatePayload }>,
): Promise<AccountBoundCreateOutcome> {
  const payload = parseProjectCreatePayload(input.payload);
  if (!isProjectId(input.expectedUserId) || !isProjectId(input.commandId) || !generationValid(input.generation) || !payload) return error();

  const current = await intent(rpc);
  if (current.status === 'unavailable') return error();
  if (current.status === 'clear') {
    if (current.generation !== input.generation) return error();
  } else {
    if (current.commandId !== input.commandId || current.generation !== input.generation || !sameCreatePayload(current.payload, payload)) {
      return { status: 'unresolved', intent: current };
    }
    if (current.projectId) return finishSaved(rpc, input.commandId, input.generation, current.projectId);
  }

  let result: unknown;
  try { result = await rpc.mutate(payload, input.commandId, input.generation, input.expectedUserId); }
  catch { return reconcile(rpc, input.commandId, input.generation, payload); }
  const saved = savedMutation(result);
  if (saved) return finishSaved(rpc, input.commandId, input.generation, saved.projectId);
  return reconcile(rpc, input.commandId, input.generation, payload);
}

export async function resolveProjectCreateWithIntent(
  rpc: AccountBoundCreateRpc,
  commandId: string,
  expectedGeneration?: string,
): Promise<AccountBoundCreateOutcome> {
  if (!isProjectId(commandId) || (expectedGeneration !== undefined && !generationValid(expectedGeneration))) return error();
  const current = await intent(rpc);
  if (current.status === 'unavailable') return error();
  if (current.status === 'unresolved') {
    if (current.commandId !== commandId) return { status: 'unresolved', intent: current };
    if (expectedGeneration !== undefined && current.generation !== expectedGeneration) return error();
    if (!current.projectId) return { status: 'unresolved', intent: current };
    return finishSaved(rpc, commandId, current.generation, current.projectId);
  }
  const projectId = await receipt(rpc, commandId);
  if (projectId && (expectedGeneration === undefined || current.generation !== expectedGeneration)) return { status: 'saved', projectId };
  return error();
}
