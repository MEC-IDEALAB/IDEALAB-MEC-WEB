import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { backendConfig } from './config';
import { supabaseCookieOptions } from './security-headers';
import { writeCookieBatch } from './cookie-write';

export async function serverClient(options: { writable?: boolean } = {}) {
  const config = backendConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, { cookieOptions: supabaseCookieOptions(), cookies: {
    getAll: () => jar.getAll(),
    setAll: (values) => {
      writeCookieBatch(values, ({ name, value, options }) => jar.set(name, value, options), options.writable === true);
    },
  }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) },
  });
}

/** Local cookie removal fallback for a failed SDK local sign-out in a mutation. */
export async function clearLocalAuthSession() {
  const config = backendConfig();
  if (!config) throw new Error('Auth configuration unavailable');
  const prefix = `sb-${new URL(config.url).hostname.split('.')[0]}-auth-token`;
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (name === prefix || (name.startsWith(`${prefix}.`) && /^(0|[1-9][0-9]*)$/.test(name.slice(prefix.length + 1)))) {
      jar.set(name, '', { ...supabaseCookieOptions(), path: '/', maxAge: 0 });
    }
  }
}
