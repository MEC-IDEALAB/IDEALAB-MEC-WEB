/** Provider configuration is a release prerequisite, never identity evidence. */
export function requiresEmailConfirmation(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;
  const value = settings as Record<string, unknown>;
  const external = value.external;
  return !!external && typeof external === 'object' && !Array.isArray(external)
    && (external as Record<string, unknown>).email === true
    && value.mailer_autoconfirm === false && value.disable_signup === false;
}

/** Read only the pinned project's public settings; no cookies, passwords or redirects. */
export async function confirmedSignupProviderAvailable(
  config: { url: string; key: string },
  request: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await request(new URL('/auth/v1/settings', config.url), {
      headers: { apikey: config.key }, cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok && requiresEmailConfirmation(await response.json());
  } catch { return false; }
}
