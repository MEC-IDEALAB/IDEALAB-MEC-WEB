import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Lightbulb } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { DoodleStar } from '@/components/doodles';

export const metadata = { title: 'Join the lab' };

export default function SignUp() {
  return <main id="main-content" className="auth-page reference-auth signup-page">
    <div className="auth-toolbar"><Link className="text-link" href="/"><ArrowLeft size={18} aria-hidden="true" /> Back to IDEALAB MEC</Link><ThemePicker /></div>
    <div className="auth-grid">
      <section className="auth-card" aria-labelledby="join-title"><span className="eyebrow">MAKE ROOM FOR YOUR NEXT IDEA</span><h2 id="join-title">Join the makers.</h2><p>Projects, practical learning and a place to begin at Model Engineering College.</p>
        <div className="notice" role="status">Online registration is being connected. Contact the lab team to ask about joining and account access.</div>
        <a className="button button-ink" href="mailto:idealab@mec.ac.in">Contact the lab team <ArrowUpRight size={18} aria-hidden="true" /></a>
        <p className="small-copy">Already have a Grow or lab account? <Link href="/sign-in">Sign in here</Link>.</p>
      </section>
      <section className="auth-story"><span className="eyebrow auth-pill">CURIOUS MINDS WELCOME</span><h1>MAKE.<br />LEARN.<br /><span>REPEAT.</span></h1><p className="handwritten">Big ideas start with a little curiosity.</p><DoodleStar className="auth-star" /><div className="auth-note"><Lightbulb aria-hidden="true" /><p>Bring an idea. Find your next step with the lab team.</p></div></section>
    </div>
  </main>;
}
