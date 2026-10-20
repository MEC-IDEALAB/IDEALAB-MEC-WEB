import { sampleCatalog } from './sample-catalog.ts';

export type DraftData = {
  kind: 'machine' | 'operations';
  serviceId: string;
  title: string;
  details: string;
  preferredTime: string;
  references: string[];
};

type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type ReadResult =
  | { status: 'found'; draft: DraftData; savedAt: string | null }
  | { status: 'empty' | 'invalid' | 'unavailable' };

export const maxReferenceCount = 5;
export const maxReferenceLength = 2048;
export const draftStorageKey = (accountId: string) => `idealab-mec:request-draft:v1:${accountId}`;
export type DraftStorageScope = 'local' | 'memory';
let memoryDraft: { key: string; value: string } | null = null;

export function referenceError(references: string[]): string | null {
  if (references.length > maxReferenceCount) return `Add up to ${maxReferenceCount} links.`;
  for (const reference of references) {
    if (reference.length > maxReferenceLength) return 'Each link must be 2,048 characters or fewer.';
    try {
      const url = new URL(reference);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
        return 'Use a complete http:// or https:// link without a username or password.';
      }
    } catch {
      return 'Enter a complete http:// or https:// link.';
    }
  }
  return null;
}

function normalizeDraft(value: unknown): DraftData | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<DraftData>;
  if (!['machine', 'operations'].includes(item.kind ?? '') || typeof item.serviceId !== 'string' || item.serviceId.length > 100 ||
      typeof item.title !== 'string' || item.title.length > 120 || typeof item.details !== 'string' || item.details.length > 5000 ||
      typeof item.preferredTime !== 'string' || item.preferredTime.length > 32) return null;

  const kind = item.kind as DraftData['kind'];
  if (item.serviceId !== '' && !sampleCatalog[kind].some(service => service.id === item.serviceId)) return null;
  // The references property was added without changing the v1 key. Existing v1 drafts
  // omitted it, so normalize those records to an empty list when restoring.
  const references = item.references ?? [];
  if (!Array.isArray(references) || references.length > maxReferenceCount || references.some(reference => typeof reference !== 'string')) return null;
  if (references.some(reference => reference.trim() !== reference) || referenceError(references)) return null;

  return { kind, serviceId: item.serviceId, title: item.title, details: item.details, preferredTime: item.preferredTime, references };
}

export function readSavedDraft(accountId: string, storage?: StorageAccess, scope: DraftStorageScope = 'local'): ReadResult {
  try {
    const key = draftStorageKey(accountId);
    const raw = storage ? storage.getItem(key) : scope === 'memory' ? (memoryDraft?.key === key ? memoryDraft.value : null) : localStorage.getItem(key);
    if (!raw) return { status: 'empty' };
    let value: unknown;
    try { value = JSON.parse(raw); } catch { return { status: 'invalid' }; }
    if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) return { status: 'invalid' };
    const stored = value as { draft?: unknown; savedAt?: unknown };
    const draft = normalizeDraft(stored.draft);
    if (!draft) return { status: 'invalid' };
    return {
      status: 'found',
      draft,
      savedAt: typeof stored.savedAt === 'string' && Number.isFinite(Date.parse(stored.savedAt)) ? stored.savedAt : null,
    };
  } catch { return { status: 'unavailable' }; }
}

export function saveDraft(accountId: string, draft: DraftData, storage?: StorageAccess, scope: DraftStorageScope = 'local'): 'saved' | 'invalid' | 'unavailable' {
  const normalized = normalizeDraft(draft);
  if (!normalized) return 'invalid';
  try {
    const key = draftStorageKey(accountId);
    const value = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), draft: normalized });
    if (storage) storage.setItem(key, value);
    else if (scope === 'memory') memoryDraft = { key, value };
    else localStorage.setItem(key, value);
    return 'saved';
  } catch { return 'unavailable'; }
}

export function deleteSavedDraft(accountId: string, storage?: StorageAccess, scope: DraftStorageScope = 'local'): boolean {
  try {
    const key = draftStorageKey(accountId);
    if (storage) storage.removeItem(key);
    else if (scope === 'memory') { if (memoryDraft?.key === key) memoryDraft = null; }
    else localStorage.removeItem(key);
    return true;
  } catch { return false; }
}
