import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { signIn, signUp, signOut, finishPasswordResetSignOut } from '@/app/auth/actions';
import { backendConfig } from '@/lib/config';
import { signupAuthConfig } from '@/lib/auth-config';
import { AuthCardSwitcher, type AuthView } from '@/components/auth-card-switcher';
import { GoogleSignIn } from '@/components/google-sign-in';
import { PasswordField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { ThemePicker } from '@/components/theme-picker';
import { AuthPoster } from '@/components/auth-poster';
import { serverClient } from '@/lib/supabase';
import { inspectAuthEntry } from '@/lib/auth-entry';

const notices: Record<string, string> = {
  invalid: 'We couldn’t sign you in. Check your email and password, and make sure your email is verified.',
  oauth: 'Google sign-in couldn’t be completed. Try again, or create an account using email.',
  connection: 'We couldn’t reach the account service. Please try again shortly.',
  session: 'Please sign in to continue to your workspace.',
  configuration: 'Student account access is being prepared.',
  'password-updated': 'Your password is ready. Sign in with your new password.',
  'password-updated-cleanup': 'Your password changed, but this browser session could not be signed out. Try signing out before signing in again.',
  'signup-invalid': 'Enter a valid email address and a password of at least 8 characters.',
  'signup-requested': 'If this address can be registered, check your inbox for a confirmation link. Already registered? Sign in or reset your password.',
  verified: 'Your email is confirmed. Sign in to continue with your profile.',
  'confirmation-expired': 'This confirmation link is expired or unavailable. Request a new link to continue.',
  resent: 'If this address needs confirmation, a new link has been requested. Check your inbox and spam folder.',
};

export async function AuthExperience({ initialView, notice }: { initialView: AuthView; notice?: string }) {
  const backendAvailable = !!backendConfig();
  const client = backendAvailable ? await serverClient() : null;
  const entry = client ? await inspectAuthEntry(client) : { state: 'signed-out' as const };
  const configured = backendAvailable && entry.state !== 'unavailable';
  const validation = process.env.ACCOUNT_ENVIRONMENT === 'validation';
  const signupConfigured = !!signupAuthConfig() && entry.state !== 'unavailable';
  const activeNotice = entry.state === 'unavailable' ? notices.connection : notice ? notices[notice] : undefined;
  const signInStory = <>
    <div className="auth-poster-topline"><span>IDEALAB / MEC</span><span>01 — RETURN</span></div>
    <h1>YOUR NEXT<br /><span>LEVEL.</span></h1>
    <AuthPoster />
    <div className="auth-poster-bottomline"><span>A PLACE FOR YOUR NEXT IDEA.</span><span>↗</span></div>
  </>;
  const createStory = <>
    <div className="auth-poster-topline"><span>IDEALAB / MEC</span><span>02 — BEGIN</span></div>
    <h1>PRESS START.<br /><span>MAKE REAL.</span></h1>
    <AuthPoster signup />
    <div className="auth-poster-bottomline"><span>CURIOSITY LOOKS GOOD ON YOU.</span><span>↗</span></div>
  </>;
  if (entry.state === 'signed-in') return <main id="main-content" className="auth-page reference-auth poster-auth arcade-auth">
    <div className="auth-toolbar"><Link className="text-link" href="/"><ArrowUpRight className="auth-back-icon" size={18} aria-hidden="true" /> Back to IDEALAB MEC</Link><ThemePicker /></div>
    <div className="auth-grid" data-auth-view="sign-in">
      <section className="auth-story" aria-label="Welcome back">{signInStory}</section>
      <div className="auth-card-stage"><section className="auth-card auth-continuation" aria-labelledby="continue-account-title">
        <div className="auth-mini-art"><AuthPoster mini /></div>
        <h2 id="continue-account-title">You’re signed in.</h2>
        <p>Continue where you left off.</p>
        <Link className="button button-primary" href="/app" prefetch={false}>Continue to IDEALAB MEC <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <form action={signOut}><input type="hidden" name="expected_account" value={entry.accountId} /><SubmitButton className="button" pendingText="Signing out…">Sign out to switch accounts</SubmitButton></form>
        <Link className="text-link" href="/">Back to homepage</Link>
      </section></div>
    </div>
  </main>;
  const signInPanel = <>
    <div className="auth-mini-art"><AuthPoster mini /></div>
    <h2 id="sign-in-title" tabIndex={-1}>Sign in</h2>
    {(!configured || activeNotice || validation) && <div className="notice" role="status">{!backendAvailable ? notices.configuration : activeNotice || 'Test environment. Create a separate IDEALAB test account first.'}{configured && (notice === 'invalid' || notice === 'oauth' || validation) && <> <Link href="/sign-up">Create account</Link></>}</div>}
    {configured && notice === 'password-updated-cleanup' && <form action={finishPasswordResetSignOut}><SubmitButton pendingText="Signing out…">Finish signing out</SubmitButton></form>}
    <form action={signIn} className="form-stack">
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@example.com" disabled={!configured} />
      <div className="auth-label-row"><label htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div>
      <PasswordField disabled={!configured} />
      <SubmitButton disabled={!configured} pendingText="Signing in…">Sign in <ArrowUpRight size={18} aria-hidden="true" /></SubmitButton>
    </form>
    <div className="auth-divider">or</div>
    <GoogleSignIn disabled={entry.state === 'unavailable'} />
    {configured && <p className="small-copy auth-confirm-link"><Link href="/confirm-email">Need a confirmation link?</Link></p>}
  </>;
  const createPanel = <>
    <div className="auth-mini-art"><AuthPoster signup mini /></div>
    <h2 id="create-account-title" tabIndex={-1}>Create your account</h2>
    {(!signupConfigured || activeNotice || validation) && <div className="notice" id="signup-status" role="status">{!signupConfigured ? entry.state === 'unavailable' ? notices.connection : 'Student signup is being prepared.' : activeNotice || 'Test environment. Use your existing email and create a new IDEALAB test password.'}</div>}
    <form action={signUp} className="form-stack auth-signup-preview" aria-label="Create account" aria-describedby={!signupConfigured || activeNotice || validation ? 'signup-status' : undefined}>
      <fieldset disabled={!signupConfigured}>
        <label htmlFor="signup-email">Email address</label>
        <input id="signup-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
        <label htmlFor="signup-password">Create a password</label>
        <PasswordField disabled={!signupConfigured} newPassword minLength={8} describedBy="signup-password-hint" id="signup-password" name="password" />
        <span className="small-copy" id="signup-password-hint">Use at least 8 characters.</span>
        <SubmitButton disabled={!signupConfigured} pendingText="Creating account…">Create account <ArrowUpRight size={18} aria-hidden="true" /></SubmitButton>
      </fieldset>
    </form>
    <div className="auth-divider">or</div>
    <GoogleSignIn disabled={entry.state === 'unavailable'} />
    {signupConfigured && <p className="small-copy auth-create-note">Confirm your email, then sign in.</p>}
  </>;

  return <main id="main-content" className="auth-page reference-auth poster-auth arcade-auth">
    <div className="auth-toolbar">
      <Link className="text-link" href="/"><ArrowUpRight className="auth-back-icon" size={18} aria-hidden="true" /> Back to IDEALAB MEC</Link>
      <ThemePicker />
    </div>
    <AuthCardSwitcher initialView={initialView} signInStory={signInStory} createStory={createStory} signInPanel={signInPanel} createPanel={createPanel} />
  </main>;
}
