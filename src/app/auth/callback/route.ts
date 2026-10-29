import { readAuthCode } from '@/lib/auth-input';
import { NextResponse, type NextRequest } from 'next/server';
import { serverClient } from '@/lib/supabase';
import { googleAuthConfig } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  const config = googleAuthConfig();
  // Canonical origin comes from deployment configuration, never forwarded headers.
  if (!config) return new NextResponse('Account callback is unavailable.', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  const origin = new URL(config.callback).origin;
  const response = (path: string) => {
    const result = NextResponse.redirect(new URL(path, origin));
    result.headers.set('Cache-Control', 'private, no-store');
    result.headers.set('Referrer-Policy', 'no-referrer');
    return result;
  };
  const input = readAuthCode(request.nextUrl.searchParams);
  if (!input) return response('/sign-in?notice=oauth');
  try {
    const client = await serverClient({ writable: true });
    if (client) {
      const { error } = await client.auth.exchangeCodeForSession(input.code, input.options);
      if (!error) return response('/app');
    }
  } catch { /* Fail closed; do not reflect OAuth parameters. */ }
  return response('/sign-in?notice=oauth');
}
