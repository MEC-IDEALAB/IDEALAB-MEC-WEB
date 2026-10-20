import { backendConfig } from './config.ts';

export function googleAuthConfig() {
  if (!backendConfig() || process.env.ENABLE_GOOGLE_SIGN_IN !== 'true') return null;
  try {
    const origin = new URL(process.env.AUTH_SITE_URL ?? '');
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null;
    if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname))) return null;
    return { callback: new URL('/auth/callback', origin).href };
  } catch { return null; }
}
