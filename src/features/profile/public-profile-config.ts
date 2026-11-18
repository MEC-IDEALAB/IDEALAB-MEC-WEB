/**
 * This optional API is not available in the installed shared schema, and the
 * Flutter client has not completed its coordinated cutover. Keep it disabled
 * in source until the migration, privacy behavior, and both clients are accepted.
 * An environment variable alone must not enable calls to missing RPCs.
 */
export function publicProfileEnabled() {
  return false;
}
