/** Minimal server-side identity reader. Never infer identity from cookie contents. */
export type AuthEntryClient = {
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
};

export type AuthEntryState =
  | { state: 'signed-out' }
  | { state: 'signed-in'; accountId: string }
  | { state: 'unavailable' };

function missingSession(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: unknown; status?: unknown };
  return candidate.name === 'AuthSessionMissingError' || candidate.status === 401;
}

/** Entry checks protect an existing account from stale login/signup/callback pages.
 * This is a per-request observation, not a lock across concurrent browser requests.
 * The continuation destination must still perform its own profile/role checks. */
export async function inspectAuthEntry(client: AuthEntryClient): Promise<AuthEntryState> {
  try {
    const result = await client.auth.getUser();
    if (result.error) {
      if (result.data?.user) return { state: 'unavailable' };
      return missingSession(result.error) ? { state: 'signed-out' } : { state: 'unavailable' };
    }
    const user = result.data.user;
    if (user === null) return { state: 'signed-out' };
    if (typeof user?.id !== 'string' || user.id.trim().length === 0) return { state: 'unavailable' };
    return { state: 'signed-in', accountId: user.id };
  } catch (error) {
    return missingSession(error) ? { state: 'signed-out' } : { state: 'unavailable' };
  }
}
