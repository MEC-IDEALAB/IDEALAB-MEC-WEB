import 'server-only';

type AuthObservationClient = {
  auth: {
    getClaims(): Promise<{ data: { claims: unknown } | null; error: unknown }>;
    getUser(): Promise<{ data: { user: unknown } | null; error: unknown }>;
  };
};

type SessionObservation = {
  accountId: string;
  sessionId: string;
  expiresAt: number;
  issuedAt: number;
  recoveryAt?: number;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? value as Record<string, unknown>
    : null;
}


function own(value: Record<string, unknown>, key: string): unknown {
  const property = Object.getOwnPropertyDescriptor(value, key);
  return property && 'value' in property ? property.value : undefined;
}

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function observeSession(value: unknown, now: number): SessionObservation | null {
  const claims = record(value);
  if (!claims) return null;

  const accountId = own(claims, 'sub');
  const sessionId = own(claims, 'session_id');
  const expiresAt = own(claims, 'exp');
  const issuedAt = own(claims, 'iat');
  const notBefore = own(claims, 'nbf');
  const anonymous = own(claims, 'is_anonymous');
  const methods = own(claims, 'amr');

  if (typeof accountId !== 'string' || !uuid.test(accountId)
    || typeof sessionId !== 'string' || !uuid.test(sessionId)
    || own(claims, 'role') !== 'authenticated'
    || !timestamp(expiresAt) || expiresAt <= now
    || !timestamp(issuedAt) || issuedAt > now || issuedAt >= expiresAt
    || (notBefore !== undefined && (!timestamp(notBefore) || notBefore > now))
    || (anonymous !== undefined && anonymous !== false)
    || !Array.isArray(methods) || methods.length === 0) return null;

  let recoveryAt: number | undefined;
  for (let index = 0; index < methods.length; index += 1) {
    const method = record(methods[index]);
    if (!method) return null;
    const name = own(method, 'method');
    const at = own(method, 'timestamp');
    if (typeof name !== 'string' || name.length === 0 || !timestamp(at) || at > now) return null;
    if (name !== 'recovery') continue;
    if (recoveryAt !== undefined || at > issuedAt) return null;
    recoveryAt = at;
  }

  return { accountId, sessionId, expiresAt, issuedAt, recoveryAt };
}

/**
 * Verify the current session's identity and authentication method before any
 * member-profile access. Old recovery AMR markers remain restricted until the
 * session is replaced or cleared; they do not age into normal workspace access.
 */
export async function inspectMemberSessionScope(
  client: AuthObservationClient,
  userValue: unknown,
  nowSeconds?: number,
): Promise<'normal' | 'recovery' | null> {
  const now = () => nowSeconds ?? Date.now() / 1000;
  if (!Number.isFinite(now()) || now() < 0) return null;

  try {
    const user = record(userValue);
    const expectedAccountId = user ? own(user, 'id') : undefined;
    if (typeof expectedAccountId !== 'string' || !uuid.test(expectedAccountId)) return null;

    const firstResult = await client.auth.getClaims();
    if (!firstResult || firstResult.error !== null) return null;
    const first = observeSession(firstResult.data?.claims, now());
    if (!first || first.accountId !== expectedAccountId) return null;

    const identity = await client.auth.getUser();
    if (!identity || identity.error !== null) return null;
    const currentUser = record(identity.data?.user);
    if (!currentUser || own(currentUser, 'id') !== expectedAccountId) return null;

    const lastResult = await client.auth.getClaims();
    if (!lastResult || lastResult.error !== null) return null;
    const checkedAt = now();
    const last = observeSession(lastResult.data?.claims, checkedAt);
    if (!last || last.accountId !== expectedAccountId || last.sessionId !== first.sessionId
      || last.recoveryAt !== first.recoveryAt || last.expiresAt <= checkedAt) return null;

    return last.recoveryAt === undefined ? 'normal' : 'recovery';
  } catch {
    return null;
  }
}
