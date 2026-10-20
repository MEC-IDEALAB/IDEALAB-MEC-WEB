export const product = { name: 'IDEALAB MEC', institution: 'Model Engineering College', subtitle: 'IDEA Lab / Fab Lab' } as const;

export function backendConfig() {
  // The owner prioritized UI/GitHub delivery first. Activate shared accounts only
  // after the live compatibility and acceptance gate, independent of public keys.
  if (process.env.ENABLE_MEMBER_PLATFORM !== 'true') return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try { if (new URL(url).protocol !== 'https:') return null; } catch { return null; }
  // Reject accidentally supplied privileged credentials before a client is created.
  if (key.startsWith('sb_secret_')) return null;
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1]));
      if (payload.role !== 'anon') return null;
    } catch { return null; }
  } else if (!key.startsWith('sb_publishable_')) return null;
  return { url, key };
}
