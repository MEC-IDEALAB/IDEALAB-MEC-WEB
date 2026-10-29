/** Bind an already-rendered form to the freshly verified session identity.
 * This value is a consistency check, never a source of account authority. */
export function matchesFormAccount(form: FormData, verifiedId: string): boolean {
  const values = form.getAll('expected_account');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return values.length === 1 && typeof values[0] === 'string' && uuid.exec(values[0])?.[0] === values[0] &&
    uuid.exec(verifiedId)?.[0] === verifiedId && values[0].toLowerCase() === verifiedId.toLowerCase();
}
