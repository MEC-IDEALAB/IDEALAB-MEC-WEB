import type { DraftStorageScope } from './draft-storage.ts';

export type DraftWorkspaceStatus = 'found' | 'empty' | 'invalid' | 'unavailable';

export function draftWorkspaceSummary(
  status: DraftWorkspaceStatus,
  scope: DraftStorageScope,
): string {
  const place = scope === 'memory' ? 'this preview session' : 'this browser';
  switch (status) {
    case 'found':
      return scope === 'memory'
        ? 'A temporary sample draft is held in this preview session. It has not been submitted, booked or sent to a head.'
        : 'A local draft is saved for this account in this browser. This browser copy can remain after an online submission; check request history before resubmitting.';
    case 'empty':
      return `No draft is saved for this account in ${place}.`;
    case 'invalid':
      return scope === 'memory'
        ? `A sample draft exists in ${place}, but it can’t be opened. Preview drafts are not submitted.`
        : `A saved draft exists in ${place}, but it can’t be opened. Its server status is unknown; check request history before starting again.`;
    case 'unavailable':
      return 'This browser did not allow a draft check, so its saved state is unknown. Check request history to confirm whether the server received a request before starting another.';
  }
}
