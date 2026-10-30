/** Cookie writes in actions and route handlers must fail visibly. Read-only
 * server rendering relies on the proxy to refresh cookies instead. */
export function writeCookieBatch<T>(values: readonly T[], write: (value: T) => void, writable: boolean): void {
  if (writable) {
    try { values.forEach(write); } catch { throw new Error('Unable to write authentication cookies'); }
    return;
  }
  try { values.forEach(write); } catch { /* Server Components cannot set response cookies. */ }
}
