import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { backendConfig } from './lib/config';

export async function proxy(request: NextRequest) {
  const config = backendConfig();
  const protectedRoute = request.nextUrl.pathname.startsWith('/app');
  const privateResponse = (response: NextResponse) => {
    if (protectedRoute || request.nextUrl.pathname.startsWith('/auth')) {
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('Vary', 'Cookie');
    }
    return response;
  };
  if (!config) {
    if (protectedRoute) return privateResponse(NextResponse.redirect(new URL('/sign-in?notice=configuration', request.url)));
    return NextResponse.next();
  }
  if (!protectedRoute) return NextResponse.next();
  let response = NextResponse.next({ request });
  const client = createServerClient(config.url, config.key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values) => {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) } });
  let authenticated = false;
  try { const { data, error } = await client.auth.getUser(); authenticated = !error && !!data.user; } catch { /* Fail closed on a timeout or unavailable account service. */ }
  if (!authenticated) {
    const redirect = NextResponse.redirect(new URL('/sign-in?notice=session', request.url));
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return privateResponse(redirect);
  }
  return privateResponse(response);
}
export const config = { matcher: ['/app/:path*', '/auth/:path*'] };
