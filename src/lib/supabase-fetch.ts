/** Keep a caller's cancellation while bounding Supabase requests. */
export function fetchSupabase(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const timeout = AbortSignal.timeout(12_000);
  const upstream = init?.signal === undefined && input instanceof Request ? input.signal : init?.signal;
  return fetch(input, {
    ...init,
    signal: upstream ? AbortSignal.any([upstream, timeout]) : timeout,
  });
}
