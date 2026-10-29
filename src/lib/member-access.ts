/**
 * Accept only the current non-anonymous email identity returned by server-side
 * Supabase auth.getUser(). Editable metadata and email domains are not evidence.
 * This predicate grants no role, onboarding completion or MEC admission.
 */
type EmailIdentity = {
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean | null;
};

export function hasVerifiedEmail(user: EmailIdentity): boolean {
  return user.is_anonymous === false
    && typeof user.email === 'string' && user.email.trim().length > 0
    && typeof user.email_confirmed_at === 'string' && user.email_confirmed_at.trim().length > 0;
}

export async function loadProfileForVerifiedUser<T>(
  user: EmailIdentity,
  loadProfile: () => Promise<T>,
): Promise<{ emailVerified: false } | { emailVerified: true; profile: T }> {
  if (!hasVerifiedEmail(user)) return { emailVerified: false };
  return { emailVerified: true, profile: await loadProfile() };
}
