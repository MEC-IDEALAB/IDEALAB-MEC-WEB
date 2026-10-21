import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { backendConfig } from '@/lib/config';
import { signIn } from '@/app/auth/actions';
import { SubmitButton } from '@/components/submit-button';
import { ThemePicker } from '@/components/theme-picker';
import { PasswordField } from '@/components/password-field';
import { DoodleStar } from '@/components/doodles';
import { GoogleSignIn } from '@/components/google-sign-in';

const notices: Record<string, string> = {
  invalid: 'We couldn’t sign you in. Check your email and password, and make sure your email is verified.',
  connection: 'We couldn’t reach the account service. Please try again shortly.',
  session: 'Please sign in to continue to your workspace.',
  configuration: 'Account access is being connected. Please check back soon.',
  'password-updated': 'Your password is ready. Sign in with your new password.',
};
export const metadata = { title: 'Sign in' };
export default async function SignIn({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const configured = !!backendConfig();
  return <main id="main-content" className="auth-page reference-auth"><div className="auth-toolbar"><Link className="text-link" href="/"><ArrowLeft size={18} /> Back to IDEALAB MEC</Link><ThemePicker /></div>
    <div className="auth-grid"><section className="auth-story"><span className="eyebrow auth-pill">THE MAKER PORTAL</span><h1>WELCOME<br /><span>BACK.</span></h1><p className="handwritten">Your next idea starts here.</p><DoodleStar className="auth-star" /><div className="auth-note"><ShieldCheck /><p>Already use Grow? Your existing account belongs here too.</p></div></section>
    <section className="auth-card" aria-labelledby="sign-in-title"><span className="eyebrow">WELCOME BACK</span><h2 id="sign-in-title">Make yourself at home.</h2><p>Sign in with your existing lab account.</p>
      {(!configured || (notice && notices[notice])) && <div className="notice" role="status">{!configured ? notices.configuration : notices[notice!]}</div>}
      <form action={signIn} className="form-stack"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@example.com" disabled={!configured} />
        <div className="auth-label-row"><label htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div><PasswordField disabled={!configured} />
        <SubmitButton disabled={!configured} pendingText="Signing in…">Sign in <ArrowUpRight size={18} /></SubmitButton>
      </form><div className="auth-divider">or</div><GoogleSignIn /><p className="small-copy">Need help? <a href="mailto:idealab@mec.ac.in">Contact the lab</a>. New here? <Link href="/sign-up">Explore joining</Link>.</p>
    </section></div>
  </main>;
}
