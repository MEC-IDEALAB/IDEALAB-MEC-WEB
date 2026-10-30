/** Finish a successful auth mutation without treating an SDK sign-out failure
 * as a failed mutation. The caller must supply real local-cookie cleanup;
 * cleanup failure is explicit and must never be reported as completion. */
export async function exitLocalAuthSession(signOut: () => Promise<unknown>, clearCookies: () => Promise<void>): Promise<'cleared' | 'cleanup-required'> {
  try { await signOut(); }
  catch { /* Cookie removal below remains required if the SDK cannot sign out. */ }
  try { await clearCookies(); return 'cleared'; }
  catch { return 'cleanup-required'; }
}
