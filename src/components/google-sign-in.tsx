import { signInWithGoogle } from '@/app/auth/actions';
import { googleAuthConfig } from '@/lib/auth-config';
import { SubmitButton } from './submit-button';
export function GoogleSignIn() {
  const enabled = !!googleAuthConfig();
  return <form action={signInWithGoogle}>
    <SubmitButton className="button google-button" disabled={!enabled} describedBy={!enabled ? 'google-sign-in-status' : undefined} pendingText="Connecting…">
      <span className="google-letter" aria-hidden="true">G</span>Continue with Google
      {!enabled && <span className="google-status" aria-hidden="true">Not available yet</span>}
    </SubmitButton>
    {!enabled && <span className="sr-only" id="google-sign-in-status">Google sign-in is not available yet.</span>}
  </form>;
}
