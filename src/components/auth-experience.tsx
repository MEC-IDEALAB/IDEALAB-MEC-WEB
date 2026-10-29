import Link from 'next/link';
import { ArrowUpRight, Lightbulb, ShieldCheck } from 'lucide-react';
import { signIn, signUp, finishPasswordResetSignOut } from '@/app/auth/actions';
import { backendConfig } from '@/lib/config';
import { signupAuthConfig } from '@/lib/auth-config';
import { AuthCardSwitcher, type AuthView } from '@/components/auth-card-switcher';
import { GoogleSignIn } from '@/components/google-sign-in';
import { PasswordField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { ThemePicker } from '@/components/theme-picker';
import { DoodleStar } from '@/components/doodles';

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

export function AuthExperience({ initialView, notice }: { initialView: AuthView; notice?: string }) {
  const configured = !!backendConfig();
  const validation = process.env.ACCOUNT_ENVIRONMENT === 'validation';
  const signupConfigured = !!signupAuthConfig();
  const activeNotice = notice ? notices[notice] : undefined;
  const signInStory = <>
    <span className="eyebrow auth-pill">STUDENT_PORTAL</span>
    <h1>WELCOME<br /><span>BACK.</span></h1>
    <p className="handwritten">Your next idea starts here.</p>
    <DoodleStar className="auth-star" />
    <div className="auth-terminal"><div className="auth-terminal-dots" aria-hidden="true"><i /><i /><i /></div><code aria-hidden="true">&gt; idea.start()<br />&gt; learn.by_making()<br />&gt; prototype.next()</code><p><ShieldCheck size={16} aria-hidden="true" /> {validation ? 'Isolated test accounts. Live Grow accounts are separate here.' : configured ? 'Use your current Grow account.' : 'Member sign-in will open after the shared account security review.'}</p></div>
  </>;
  const createStory = <>
    <span className="eyebrow auth-pill">CURIOUS MINDS WELCOME</span>
    <h1>MAKE.<br />LEARN.<br /><span>REPEAT.</span></h1>
    <p className="handwritten">Big ideas start with a little curiosity.</p>
    <DoodleStar className="auth-star" />
    <div className="auth-note"><Lightbulb aria-hidden="true" /><p>Bring an idea. Find your next step with the lab team.</p></div>
  </>;
  const signInPanel = <>
    <span className="eyebrow">WELCOME BACK</span>
    <h2 id="sign-in-title" tabIndex={-1}>Sign in</h2>
    <p>Pick up where your next idea left off.</p>
    {(!configured || activeNotice || validation) && <div className="notice" role="status">{!configured ? notices.configuration : activeNotice || 'Test environment. Create a separate IDEALAB test account first.'}{configured && (notice === 'invalid' || notice === 'oauth' || validation) && <> <Link href="/sign-up">Create account</Link></>}</div>}
    {configured && notice === 'password-updated-cleanup' && <form action={finishPasswordResetSignOut}><SubmitButton pendingText="Signing out…">Finish signing out</SubmitButton></form>}
    <form action={signIn} className="form-stack">
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@example.com" disabled={!configured} />
      <div className="auth-label-row"><label htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div>
      <PasswordField disabled={!configured} />
      <SubmitButton disabled={!configured} pendingText="Signing in…">Sign in <ArrowUpRight size={18} aria-hidden="true" /></SubmitButton>
    </form>
    <div className="auth-divider">or</div>
    <GoogleSignIn />
    <p className="small-copy">For MEC students. Use any email you can verify. <Link href="/confirm-email">Need a confirmation link?</Link></p>
  </>;
  const createPanel = <>
    <span className="eyebrow">NEW MAKER</span>
    <h2 id="create-account-title" tabIndex={-1}>Create your account</h2>
    <p>Your first step into the lab.</p>
    {(!signupConfigured || activeNotice || validation) && <div className="notice" id="signup-status" role="status">{!signupConfigured ? 'Student signup is being prepared.' : activeNotice || 'Test environment. Use your existing email and create a new IDEALAB test password.'}</div>}
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
    <GoogleSignIn />
    <p className="small-copy auth-create-note">Confirm your email next. Creating an account signs out this browser.</p>
  </>;

  return <main id="main-content" className="auth-page reference-auth">
    <div className="auth-toolbar">
      <Link className="text-link" href="/"><ArrowUpRight className="auth-back-icon" size={18} aria-hidden="true" /> Back to IDEALAB MEC</Link>
      <ThemePicker />
    </div>
    <AuthCardSwitcher initialView={initialView} signInStory={signInStory} createStory={createStory} signInPanel={signInPanel} createPanel={createPanel} />
  </main>;
}
