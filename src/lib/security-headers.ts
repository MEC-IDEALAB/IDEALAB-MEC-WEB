/** Cookie flags for Supabase sessions used by server-side SSR clients. */
export function supabaseCookieOptions(environment = process.env.NODE_ENV) {
  return {
    secure: environment === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  };
}

/**
 * Next.js reads the nonce from this policy during dynamic rendering and adds it
 * to its own framework scripts. Keep this in sync with the request nonce set by
 * `src/proxy.ts`.
 */
export function contentSecurityPolicy(nonce: string, environment = process.env.NODE_ENV) {
  if (!/^[A-Za-z0-9+/_=-]+$/.test(nonce)) {
    throw new Error('CSP nonce must use base64 characters');
  }

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${environment === 'development' ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Next/Image emits trusted style attributes for layout; keep style elements
    // nonce-restricted while allowing those attributes independently.
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'${environment === 'development' ? ' ws: wss:' : ''}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    environment === 'production' ? 'upgrade-insecure-requests' : '',
  ].filter(Boolean).join('; ');
}
