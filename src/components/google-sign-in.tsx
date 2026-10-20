import { signInWithGoogle } from '@/app/auth/actions';
import { googleAuthConfig } from '@/lib/auth-config';
import { SubmitButton } from './submit-button';
export function GoogleSignIn() {
  const enabled = !!googleAuthConfig();
  return <form action={signInWithGoogle}><SubmitButton className="button google-button" disabled={!enabled} pendingText="Connecting…"><span className="google-letter" aria-hidden="true">G</span>Continue with Google</SubmitButton></form>;
}
