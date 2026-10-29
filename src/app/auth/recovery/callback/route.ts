import { readAuthCode } from '@/lib/auth-input';
import { NextResponse, type NextRequest } from 'next/server';
import { serverClient } from '@/lib/supabase';
import { passwordRecoveryConfig } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  const config = passwordRecoveryConfig();
  if (!config) return new NextResponse('Account recovery is unavailable.', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  const origin = new URL(config.callback).origin;
  const response = (path: string) => {
    const result = NextResponse.redirect(new URL(path, origin));
    result.headers.set('Cache-Control', 'private, no-store');
    result.headers.set('Referrer-Policy', 'no-referrer');
    return result;
  };

  const input = readAuthCode(request.nextUrl.searchParams);
  if (!input) return response('/forgot-password?notice=expired');
  try {
    const client = await serverClient({ writable: true });
    if (client) {
      const { error } = await client.auth.exchangeCodeForSession(input.code, input.options);
      if (!error) return response('/reset-password');
    }
  } catch { return response('/forgot-password?notice=callback'); }
  return response('/forgot-password?notice=expired');
}
