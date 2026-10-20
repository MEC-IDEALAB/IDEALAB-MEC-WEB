import { NextResponse, type NextRequest } from 'next/server';
import { serverClient } from '@/lib/supabase';
import { googleAuthConfig } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  const config = googleAuthConfig();
  // Canonical origin comes from deployment configuration, never forwarded headers.
  const origin = config ? new URL(config.callback).origin : request.nextUrl.origin;
  const response = (path: string) => {
    const result = NextResponse.redirect(new URL(path, origin));
    result.headers.set('Cache-Control', 'private, no-store');
    result.headers.set('Referrer-Policy', 'no-referrer');
    return result;
  };
  if (!config) return response('/sign-in?notice=configuration');
  const code = request.nextUrl.searchParams.get('code');
  if (!code || code.length > 4096 || request.nextUrl.searchParams.has('error')) return response('/sign-in?notice=invalid');
  try {
    const client = await serverClient();
    if (client) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return response('/app');
    }
  } catch { /* Fail closed; do not reflect OAuth parameters. */ }
  return response('/sign-in?notice=invalid');
}
