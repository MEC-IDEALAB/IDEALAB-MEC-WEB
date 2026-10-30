import { readAuthCode } from '@/lib/auth-input';
import { NextResponse, type NextRequest } from 'next/server';
import { serverClient, clearLocalAuthSession } from '@/lib/supabase';
import { signupAuthConfig } from '@/lib/auth-config';
import { exitLocalAuthSession } from '@/lib/local-auth-exit';

export async function GET(request: NextRequest) {
  const config = signupAuthConfig();
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
  if (!config) return new NextResponse('Email confirmation is unavailable.', { status: 404, headers });
  const response = (path: string) => NextResponse.redirect(new URL(path, config.callback), { headers });
  const input = readAuthCode(request.nextUrl.searchParams);
  if (!input) return response('/confirm-email?notice=expired');
  try {
    const client = await serverClient({ writable: true });
    if (client) {
      const { error } = await client.auth.exchangeCodeForSession(input.code, input.options);
      if (!error) {
        // Verification and intentional sign-in are separate steps. Never infer admission.
        const exit = await exitLocalAuthSession(() => client.auth.signOut({ scope: 'local' }), clearLocalAuthSession);
        if (exit !== 'cleared') return new NextResponse('Your email is confirmed, but this browser session could not be signed out. Please sign out before signing in again.', { status: 503, headers });
        return response('/sign-in?notice=verified');
      }
    }
  } catch { return response('/confirm-email?notice=callback'); }
  return response('/confirm-email?notice=expired');
}
