/** Keep signup responses generic and remove any local session even after a lost response.
 * The cleanup must preserve the PKCE verifier needed by the confirmation link. */
export async function attemptSignupAndClearSession(attempt: () => Promise<unknown>, clearSession: () => Promise<void>): Promise<'cleared' | 'cleanup-required'> {
  try { await attempt(); } catch { /* The provider may have accepted the request. */ }
  try { await clearSession(); return 'cleared'; } catch { return 'cleanup-required'; }
}
