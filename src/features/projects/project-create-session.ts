export type ProjectCreateScope = 'validation' | 'preview';

/** Keep account-specific drafts and recovery state in a distinct component session. */
export function projectCreateSessionKey(accountId: string, scope: ProjectCreateScope): string {
  return JSON.stringify([scope, accountId]);
}

export function projectCreateRecoveryCopyPlan(
  savedCopy: { title: string; description: string; visibility: string } | null,
  draft: { title: string; description: string; visibility: string },
): { showSavedCopy: boolean; showDraft: boolean; savedCopyMatchesDraft: boolean } {
  const savedCopyMatchesDraft = savedCopy !== null && savedCopy.title === draft.title.trim()
    && savedCopy.description === draft.description.trim() && savedCopy.visibility === draft.visibility;
  return {
    showSavedCopy: savedCopy !== null && !savedCopyMatchesDraft,
    showDraft: draft.title.length > 0 || draft.description.length > 0,
    savedCopyMatchesDraft,
  };
}
