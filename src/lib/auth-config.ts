import { backendConfig } from './config.ts';

function canonicalAuthOrigin() {
  if (!backendConfig()) return null;
  try {
    const origin = new URL(process.env.AUTH_SITE_URL ?? '');
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null;
    if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) return null;
    return origin;
  } catch { return null; }
}

export function googleAuthConfig() {
  if (process.env.ENABLE_GOOGLE_SIGN_IN !== 'true') return null;
  const origin = canonicalAuthOrigin();
  return origin ? { callback: new URL('/auth/callback', origin).href } : null;
}

export function passwordRecoveryConfig() {
  // Recovery remains disabled until a verified recovery-session boundary and
  // atomic replay protection are implemented and tested end to end.
  return null as { callback: string } | null;
}

/** Email confirmation stays available independently of the Google provider. */
export function signupAuthConfig() {
  const origin = canonicalAuthOrigin();
  return origin ? { callback: new URL('/auth/confirm', origin).href } : null;
}
