import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { updatePassword } from '@/app/auth/actions';
import { AuthFeedback } from '@/components/auth-feedback';
import { PasswordField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { ThemePicker } from '@/components/theme-picker';
import { passwordRecoveryConfig } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose a new password', robots: { index: false, follow: false } };

const messages: Record<string, string> = {
  mismatch: 'Use matching passwords of at least 8 characters.',
  update: 'We could not update that password. Try another password or request a fresh recovery link.',
  configuration: 'Password recovery is not available right now. Contact the lab team for help.',
};

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const [{ notice }, configured] = await Promise.all([searchParams, Promise.resolve(!!passwordRecoveryConfig())]);
  const message = configured && notice ? messages[notice] : undefined;
  return <main id="main-content" className="auth-page reference-auth recovery-page reset-page">
    <div className="auth-toolbar"><Link className="text-link" href="/forgot-password"><ArrowLeft size={18} aria-hidden="true" /> Request another link</Link><ThemePicker /></div>
    <div className="auth-grid">
      <section className="auth-story" aria-label="IDEALAB MEC account recovery"><span className="eyebrow auth-pill">ONE LAST STEP</span><h1>NEW KEY.<br /><span>NEW START.</span></h1><p className="handwritten">Choose a strong password you haven’t used before.</p><div className="auth-note"><ShieldCheck aria-hidden="true" /><p>Your password is handled by the shared Grow account service.</p></div></section>
      <section className="auth-card" aria-labelledby="reset-title"><span className="eyebrow">SECURE YOUR ACCOUNT</span><h2 id="reset-title">Choose a new password.</h2><p>Use at least 8 characters and a password you don’t use on another site.</p>
        {!configured && <AuthFeedback kind="status">Password updates are paused while the shared account platform is being secured.</AuthFeedback>}
        {message && <AuthFeedback>{message}</AuthFeedback>}
        <form action={updatePassword} className="form-stack">
          <label htmlFor="new-password">New password</label><PasswordField id="new-password" name="new_password" newPassword minLength={8} disabled={!configured} />
          <label htmlFor="confirm-password">Confirm new password</label><PasswordField id="confirm-password" name="confirm_password" newPassword minLength={8} disabled={!configured} />
          <SubmitButton disabled={!configured} pendingText="Updating…">Update password <ArrowUpRight size={18} aria-hidden="true" /></SubmitButton>
        </form>
        <p className="small-copy">Recovery link expired? <Link href="/forgot-password">Request a new one</Link>.</p>
      </section>
    </div>
  </main>;
}
