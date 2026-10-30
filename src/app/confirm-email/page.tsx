import Link from 'next/link';
import { resendSignupConfirmation, retrySignupCleanup } from '@/app/auth/actions';
import { signupAuthConfig } from '@/lib/auth-config';
import { SubmitButton } from '@/components/submit-button';
import { ThemePicker } from '@/components/theme-picker';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirm your email', robots: { index: false, follow: false } };
const messages: Record<string, string> = {
  requested: 'If this address can be registered, check your inbox for a confirmation link. Already registered? Sign in or reset your password.',
  resent: 'If this address needs confirmation, a new link will arrive shortly. Check your spam folder too. Please wait before requesting another.',
  invalid: 'Enter a valid email address to request another confirmation link.',
  expired: 'That link could not be confirmed. It may have expired, been used, or opened in another browser. Request a fresh link here and open it in this browser.',
  callback: 'We could not finish this confirmation in your browser. Your email may already be confirmed; try signing in, or request a new link here.',
  configuration: 'Email confirmation is not available right now. Please try again later.',
  cleanup: 'We could not clear the browser session. Retry before continuing. If it still fails, clear site data, then request a fresh confirmation link and open it in this browser.',
};
export default async function ConfirmEmail({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const configured = !!signupAuthConfig();
  return <main id="main-content" className="auth-page recovery-page">
    <div className="auth-toolbar"><Link className="text-link" href="/">IDEALAB MEC</Link><ThemePicker /></div>
    <section className="section narrow" aria-labelledby="confirmation-title">
      <span className="eyebrow">ONE MORE STEP</span><h1 id="confirmation-title">Check your inbox.</h1>
      <p>Confirm your email, then return to sign in and set up your MEC student profile.</p>
      <p>Open the confirmation link in the browser where you requested it.</p>
      <div className="notice" role="status">{!configured ? messages.configuration : (notice && messages[notice]) || 'Need a new confirmation link? Enter your email below.'}</div>
      {notice === 'cleanup' && configured && <form action={retrySignupCleanup}><SubmitButton pendingText="Retrying…">Retry session cleanup</SubmitButton></form>}
      <form className="form-stack" action={resendSignupConfirmation}>
        <label htmlFor="confirmation-email">Email address</label>
        <input id="confirmation-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={!configured} />
        <SubmitButton disabled={!configured} pendingText="Requesting…">Resend confirmation</SubmitButton>
      </form>
      <div className="button-row"><Link className="button" href="/sign-in">Back to sign in</Link><Link className="text-link" href="/forgot-password">Reset password</Link></div>
    </section>
  </main>;
}
