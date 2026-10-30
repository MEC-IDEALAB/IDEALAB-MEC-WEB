import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Mail, ShieldCheck } from 'lucide-react';
import { requestPasswordReset } from '@/app/auth/actions';
import { AuthFeedback } from '@/components/auth-feedback';
import { SubmitButton } from '@/components/submit-button';
import { ThemePicker } from '@/components/theme-picker';
import { passwordRecoveryConfig } from '@/lib/auth-config';

export const metadata = { title: 'Reset your password', robots: { index: false, follow: false } };

const messages: Record<string, { kind: 'error' | 'status'; text: string }> = {
  requested: { kind: 'status', text: 'If this address can receive account recovery email, a link will arrive shortly. Check your inbox and spam folder; this message is the same whether or not an account exists.' },
  invalid: { kind: 'error', text: 'Enter a valid email address and try again.' },
  expired: { kind: 'error', text: 'That recovery link is missing or expired. Request a fresh link to continue.' },
  callback: { kind: 'error', text: 'We could not finish opening the recovery link. Request a fresh link and open it in this browser.' },
  configuration: { kind: 'error', text: 'Account recovery is not available right now. Contact the lab team for help.' },
};

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [{ notice }, configured] = await Promise.all([searchParams, Promise.resolve(!!passwordRecoveryConfig())]);
  const message = configured && notice ? messages[notice] : undefined;
  return <main id="main-content" className="auth-page reference-auth recovery-page">
    <div className="auth-toolbar"><Link className="text-link" href="/sign-in"><ArrowLeft size={18} aria-hidden="true" /> Back to sign in</Link><ThemePicker /></div>
    <div className="auth-grid">
      <section className="auth-story" aria-label="IDEALAB MEC account recovery"><span className="eyebrow auth-pill">ACCOUNT SUPPORT</span><h1>LET’S GET<br /><span>YOU BACK.</span></h1><p className="handwritten">A fresh start is one email away.</p><div className="auth-note"><ShieldCheck aria-hidden="true" /><p>Your lab account stays yours. We’ll never confirm whether an email is registered.</p></div></section>
      <section className="auth-card" aria-labelledby="recovery-title"><span className="eyebrow">PASSWORD RECOVERY</span><h2 id="recovery-title">Reset your password.</h2><p>Enter the email address you use for Grow or IDEALAB MEC.</p>
        {!configured && <AuthFeedback kind="status">Account recovery is paused while the shared account platform is being secured.</AuthFeedback>}
        {message && <AuthFeedback kind={message.kind}>{message.text}</AuthFeedback>}
        <form action={requestPasswordReset} className="form-stack">
          <label htmlFor="recovery-email">Email address</label><input id="recovery-email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@example.com" disabled={!configured} />
          <SubmitButton disabled={!configured} pendingText="Sending…"><Mail size={17} aria-hidden="true" /> Send recovery link <ArrowUpRight size={18} aria-hidden="true" /></SubmitButton>
        </form>
        <p className="small-copy">No email arrives? Check your spam folder or <a href="mailto:idealab@mec.ac.in">contact the lab team</a>.</p>
      </section>
    </div>
  </main>;
}
