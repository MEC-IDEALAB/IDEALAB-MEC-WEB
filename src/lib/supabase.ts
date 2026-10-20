import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { backendConfig } from './config';

export async function serverClient() {
  const config = backendConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, { cookies: {
    getAll: () => jar.getAll(),
    setAll: (values) => {
      // Server Components cannot write cookies; the proxy refreshes them.
      try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Read-only Server Component; proxy handles cookie refresh. */ }
    },
  }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12000) }) },
  });
}
