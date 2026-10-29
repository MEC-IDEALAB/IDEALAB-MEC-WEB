export const product = { name: 'IDEALAB MEC', institution: 'Model Engineering College', subtitle: 'IDEA Lab / Fab Lab' } as const;

const validationProjectRef = 'gvvqlfachzbufstzoiwi';
const supabaseDomain = '.supabase.co';
const validationFeatureFlags = {
  labOpening: 'ENABLE_LAB_OPENING_VALIDATION',
  ownVisits: 'ENABLE_OWN_VISITS_VALIDATION',
} as const;
export type ValidationFeature = keyof typeof validationFeatureFlags;

export function backendConfig() {
  // Shared-account production access requires the reviewed compatibility and
  // acceptance gate below, independent of whether public keys are present.
  if (process.env.ENABLE_MEMBER_PLATFORM !== 'true') return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch { return null; }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password
    || parsedUrl.port || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) return null;

  const hostname = parsedUrl.hostname.toLowerCase();
  const projectRef = hostname.endsWith(supabaseDomain) ? hostname.slice(0, -supabaseDomain.length) : '';
  const environment = process.env.ACCOUNT_ENVIRONMENT;
  // The shared Grow schema still permits authenticated reads of all user rows
  // and updates to authority fields. Do not issue website-created Grow sessions
  // until the reviewed shared migration and both-client acceptance are complete.
  // Production requires a deliberate source change after that release gate; no
  // environment variable can currently turn it on.
  const targetAllowed = environment === 'validation'
    ? projectRef === validationProjectRef
    : environment === 'test'
      ? hostname.endsWith('.invalid') && process.env.ENABLE_MEMBER_PLATFORM_TEST === 'true'
      : false;
  if (!targetAllowed) return null;

  // Reject accidentally supplied privileged credentials before a client is created.
  if (key.startsWith('sb_secret_')) return null;
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1]));
      if (payload.role !== 'anon') return null;
    } catch { return null; }
  } else if (!key.startsWith('sb_publishable_')) return null;
  return { url: parsedUrl.origin, key };
}

/** A feature-local gate that can never target the shared production project. */
export function validationFeatureEnabled(feature: ValidationFeature) {
  const flag = validationFeatureFlags[feature];
  return process.env.ACCOUNT_ENVIRONMENT === 'validation'
    && process.env[flag] === 'true'
    && backendConfig() !== null;
}
