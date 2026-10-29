import { randomBytes } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { backendConfig } from './lib/config';
import { contentSecurityPolicy, supabaseCookieOptions } from './lib/security-headers';

export async function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const nextResponse = () => {
    const forwardedHeaders = new Headers(requestHeaders);
    // Supabase may refresh a session in this request. Forward the updated cookie
    // to the page render as well as the browser response.
    forwardedHeaders.set('cookie', request.cookies.toString());
    const response = NextResponse.next({ request: { headers: forwardedHeaders } });
    response.headers.set('Content-Security-Policy', csp);
    return response;
  };
  const applyPolicy = (response: NextResponse) => {
    response.headers.set('Content-Security-Policy', csp);
    return response;
  };
  const config = backendConfig();
  const protectedRoute = request.nextUrl.pathname === '/account-access'
    || request.nextUrl.pathname === '/app'
    || request.nextUrl.pathname.startsWith('/app/');
  const privateResponse = (response: NextResponse) => {
    if (protectedRoute || ['/sign-in', '/sign-up', '/confirm-email', '/forgot-password', '/reset-password'].includes(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith('/auth')) {
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('Vary', 'Cookie');
    }
    return response;
  };
  if (!config) {
    if (protectedRoute) return privateResponse(applyPolicy(NextResponse.redirect(new URL('/sign-in?notice=configuration', request.url))));
    return privateResponse(nextResponse());
  }
  if (!protectedRoute) return privateResponse(nextResponse());
  let response = nextResponse();
  const client = createServerClient(config.url, config.key, { cookieOptions: supabaseCookieOptions(), cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values, headers) => {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = nextResponse();
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
    },
  }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) } });
  let authenticated = false;
  try { const { data, error } = await client.auth.getUser(); authenticated = !error && !!data.user; } catch { /* Fail closed on a timeout or unavailable account service. */ }
  if (!authenticated) {
    const redirect = NextResponse.redirect(new URL('/sign-in?notice=session', request.url));
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return privateResponse(applyPolicy(redirect));
  }
  return privateResponse(response);
}
export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
