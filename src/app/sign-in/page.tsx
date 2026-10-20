import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { backendConfig } from '@/lib/config';
import { signIn } from '@/app/auth/actions';
import { SubmitButton } from '@/components/submit-button';

const notices: Record<string, string> = {
  invalid: 'We couldn’t sign you in. Check your email and password, and make sure your email is verified.',
  connection: 'We couldn’t reach the account service. Please try again shortly.',
  session: 'Please sign in to continue to your workspace.',
  configuration: 'Account access is being connected. Please check back soon.',
};
export const metadata = { title: 'Sign in' };
export default async function SignIn({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const configured = !!backendConfig();
  return <main id="main-content" className="auth-page"><Link className="text-link" href="/"><ArrowLeft size={18} /> Back to IDEALAB MEC</Link>
    <div className="auth-grid"><section className="auth-story"><span className="eyebrow">YOUR NEXT IDEA STARTS HERE</span><h1>A little curiosity.<br />A lot of possibility.</h1><p>One account for your projects, lab requests and learning at Model Engineering College.</p><div className="auth-note"><ShieldCheck /><p>Already use Grow? Your existing account belongs here too.</p></div></section>
    <section className="auth-card" aria-labelledby="sign-in-title"><span className="eyebrow">WELCOME BACK</span><h2 id="sign-in-title">Make yourself at home.</h2><p>Sign in with your existing lab account.</p>
      {(!configured || (notice && notices[notice])) && <div className="notice" role="status">{!configured ? notices.configuration : notices[notice!]}</div>}
      <form action={signIn} className="form-stack"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@example.com" disabled={!configured} />
        <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={!configured} />
        <SubmitButton disabled={!configured} pendingText="Signing in…">Sign in <ArrowUpRight size={18} /></SubmitButton>
      </form><p className="small-copy">Need an account or help recovering access? <a href="mailto:idealab@mec.ac.in">Contact the lab team</a>.</p>
      <p className="small-copy">New account registration and Google sign-in will open after the shared identity setup has been verified.</p>
    </section></div>
  </main>;
}
