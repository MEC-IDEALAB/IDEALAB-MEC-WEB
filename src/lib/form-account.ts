/** Bind an already-rendered form to the freshly verified session identity.
 * This value is a consistency check, never a source of account authority. */
export function matchesFormAccount(form: FormData, verifiedId: string): boolean {
  return matchesUuidField(form, 'expected_account', verifiedId);
}

/** A recovery form is also bound to the exact freshly verified session. */
export function matchesFormRecoverySession(form: FormData, verifiedId: string): boolean {
  return matchesUuidField(form, 'expected_recovery_session', verifiedId);
}

function matchesUuidField(form: FormData, name: string, verifiedId: string): boolean {
  const values = form.getAll(name);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return values.length === 1 && typeof values[0] === 'string' && uuid.exec(values[0])?.[0] === values[0] &&
    uuid.exec(verifiedId)?.[0] === verifiedId && values[0].toLowerCase() === verifiedId.toLowerCase();
}
