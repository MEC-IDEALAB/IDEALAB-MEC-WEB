/** A request-scoped, trusted Supabase client. getClaims verifies the JWT; an
 * unverified decoded token, getSession user or editable metadata is insufficient.
 * The database consumption RPC must still check live session state atomically. */
export type RecoveryAuthorityClient = {
  auth: {
    getUser(): Promise<{ data: { user: unknown }; error: unknown }>;
    getClaims(): Promise<{ data: { claims: unknown } | null; error: unknown }>;
  };
};

export type RecoveryAuthority = Readonly<{ accountId: string; sessionId: string }>;

type RecoveryObservation = RecoveryAuthority & { recoveryAt: number; expiresAt: number };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const recoveryWindowSeconds = 600;

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null ? value as Record<string, unknown> : null;
}

/** Accept JSON data properties only; never run an accessor while checking claims. */
function own(value: Record<string, unknown>, key: string): unknown {
  const property = Object.getOwnPropertyDescriptor(value, key);
  return property && 'value' in property ? property.value : undefined;
}

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function validUser(value: unknown): string | null {
  const user = record(value);
  if (!user) return null;
  const id = own(user, 'id');
  const email = own(user, 'email');
  const confirmedAt = own(user, 'email_confirmed_at');
  if (typeof id !== 'string' || !uuid.test(id) || own(user, 'is_anonymous') !== false
    || typeof email !== 'string' || !email.trim()
    || typeof confirmedAt !== 'string' || !confirmedAt.trim()) return null;
  return id;
}

function observeClaims(value: unknown, now: number): RecoveryObservation | null {
  const claims = record(value);
  if (!claims) return null;
  const subject = own(claims, 'sub');
  const session = own(claims, 'session_id');
  const expiresAt = own(claims, 'exp');
  const issuedAt = own(claims, 'iat');
  const notBefore = own(claims, 'nbf');
  const anonymous = own(claims, 'is_anonymous');
  const methods = own(claims, 'amr');
  if (typeof subject !== 'string' || !uuid.test(subject)
    || typeof session !== 'string' || !uuid.test(session)
    || own(claims, 'role') !== 'authenticated'
    || !timestamp(expiresAt) || expiresAt <= now
    || !timestamp(issuedAt) || issuedAt > now || issuedAt >= expiresAt
    || (notBefore !== undefined && (!timestamp(notBefore) || notBefore > now))
    || (anonymous !== undefined && anonymous !== false)
    || !Array.isArray(methods) || !methods.length) return null;

  let recoveryAt: number | undefined;
  for (const value of methods) {
    const method = record(value);
    if (!method) return null;
    const name = own(method, 'method');
    const at = own(method, 'timestamp');
    if (typeof name !== 'string' || !name || !timestamp(at) || at > now) return null;
    if (name !== 'recovery') continue;
    // The detailed, timestamped AMR is required. Duplicate recovery entries are
    // ambiguous for this reader and must not silently select a preferred one.
    if (recoveryAt !== undefined || at <= now - recoveryWindowSeconds || at > issuedAt) return null;
    recoveryAt = at;
  }
  return recoveryAt === undefined ? null : { accountId: subject, sessionId: session, recoveryAt, expiresAt };
}

/** Minimal recovery observation, not a consumption receipt or revocation check.
 * Compare verified claims around the live user lookup so a switched account or
 * session cannot be accepted as a single stable observation. These reads are not
 * a lock: callers must bind the form and consume matching authority in the DB
 * immediately before password update. Default time is re-read after awaits. */
export async function inspectRecoveryAuthority(
  client: RecoveryAuthorityClient,
  nowSeconds?: number,
): Promise<RecoveryAuthority | null> {
  const now = () => nowSeconds ?? Date.now() / 1000;
  if (!Number.isFinite(now()) || now() < 0) return null;
  try {
    const firstResult = await client.auth.getClaims();
    if (firstResult?.error !== null) return null;
    const first = observeClaims(firstResult.data?.claims, now());
    if (!first) return null;

    const identity = await client.auth.getUser();
    if (identity?.error !== null) return null;
    const accountId = validUser(identity.data?.user);
    if (!accountId || accountId !== first.accountId) return null;

    const lastResult = await client.auth.getClaims();
    if (lastResult?.error !== null) return null;
    const checkedAt = now();
    const last = observeClaims(lastResult.data?.claims, checkedAt);
    if (!last || last.accountId !== accountId || last.sessionId !== first.sessionId
      || last.recoveryAt !== first.recoveryAt
      || first.expiresAt <= checkedAt || first.recoveryAt <= checkedAt - recoveryWindowSeconds) return null;
    return Object.freeze({ accountId, sessionId: last.sessionId });
  } catch {
    // Provider errors, signature failures and malformed values grant nothing.
    return null;
  }
}
