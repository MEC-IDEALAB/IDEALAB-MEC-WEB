export type DraftData = { kind: 'machine' | 'operations'; serviceId: string; title: string; details: string; preferredTime: string; references?: string[] };
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const draftStorageKey = (accountId: string) => `idealab-mec:request-draft:v1:${accountId}`;
export function readSavedDraft(accountId: string, storage?: StorageAccess): { status: 'found'; draft: DraftData; savedAt: string | null } | { status: 'empty' | 'invalid' | 'unavailable' } {
  try {
    const raw = (storage ?? localStorage).getItem(draftStorageKey(accountId));
    if (!raw) return { status: 'empty' };
    let value;
    try { value = JSON.parse(raw); } catch { return { status: 'invalid' }; }
    const draft = value?.draft;
    if (value?.version !== 1 || !draft || !['machine', 'operations'].includes(draft.kind) || typeof draft.serviceId !== 'string' || draft.serviceId.length > 100 || typeof draft.title !== 'string' || draft.title.length > 120 || typeof draft.details !== 'string' || draft.details.length > 5000 || typeof draft.preferredTime !== 'string' || draft.preferredTime.length > 32) return { status: 'invalid' };
    if (draft.serviceId !== '' && !sampleCatalog[draft.kind as 'machine' | 'operations'].some(service => service.id === draft.serviceId)) return { status: 'invalid' };
    return { status: 'found', draft, savedAt: typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt)) ? value.savedAt : null };
  } catch { return { status: 'unavailable' }; }
}
export function deleteSavedDraft(accountId: string, storage?: StorageAccess): boolean {
  try { (storage ?? localStorage).removeItem(draftStorageKey(accountId)); return true; } catch { return false; }
}
import { sampleCatalog } from './sample-catalog.ts';
