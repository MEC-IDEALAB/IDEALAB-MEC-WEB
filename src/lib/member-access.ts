/**
 * Supabase Auth's server-verified timestamp is required for the site's
 * verified-email account contract. User metadata and email-domain checks are
 * deliberately not used as proof of verification.
 */
export function hasVerifiedEmail(user: { email_confirmed_at?: string | null }): boolean {
  return typeof user.email_confirmed_at === 'string' && user.email_confirmed_at.length > 0;
}

export async function loadProfileForVerifiedUser<T>(
  user: { email_confirmed_at?: string | null },
  loadProfile: () => Promise<T>,
): Promise<{ emailVerified: false } | { emailVerified: true; profile: T }> {
  if (!hasVerifiedEmail(user)) return { emailVerified: false };
  return { emailVerified: true, profile: await loadProfile() };
}
