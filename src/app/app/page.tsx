import Link from 'next/link';
import { ArrowUpRight, MoveUpRight, UserRound } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { WorkspaceDestinations } from '@/components/workspace-destinations';
import { MemberQuickActions } from '@/components/member-quick-actions';
import { OwnVisitsPanel } from '@/components/own-visits-panel';
import { LabOpeningPanel } from '@/components/lab-opening-panel';
import { RecentProjects } from '@/features/projects/recent-projects';
import { UpcomingProgramme } from '@/features/events/upcoming-programme';
import { Suspense } from 'react';
export const metadata = { title: 'Your space' };
export default async function MemberHome({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { profile } = await requireMember();
  const testRequestIntake = process.env.ACCOUNT_ENVIRONMENT === 'validation' && process.env.ENABLE_WORK_REQUEST_INTAKE === 'true' && profile.role === 'student';
  const { notice } = await searchParams;
  return <div className="workspace-page">
    <span className="eyebrow">YOUR SPACE TO MAKE</span><h1>Hello, {profile.name || 'maker'}.</h1>
    <p>A little curiosity. A clear next step. What will you work on today?</p>
    <Link href="/app/profile" className="member-identity-link"><span className="member-identity-icon"><UserRound size={23} aria-hidden="true" /></span><span><strong>{profile.name || 'Your account'}</strong><small>Your IDEALAB profile</small></span><ArrowUpRight size={19} aria-hidden="true" /></Link>
    <MemberQuickActions />
    <LabOpeningPanel />
    <OwnVisitsPanel />
    <Suspense fallback={<p role="status">Loading the event programme…</p>}><UpcomingProgramme /></Suspense>
    <RecentProjects />
    {notice === 'signout' && <div className="notice" role="alert">We couldn’t sign you out. You are still signed in. Please try Sign out again.</div>}
    <section className="workspace-hero" aria-labelledby="home-next-step">
      <div><span className="eyebrow">FROM IDEA TO SOMETHING REAL</span><h2 id="home-next-step">Small start.<br />Big possibilities.</h2>
        <p>Sketch your idea, tell us what you need, and prepare your next conversation with the lab.</p>
        <Link className="button button-primary" href="/app/requests/new">Prepare a work request <ArrowUpRight size={18} aria-hidden="true" /></Link>
        <p className="small-copy">{testRequestIntake ? 'Private test submission is available. No head is notified and no staff review is connected.' : 'Saved on this device. Online submission is not connected yet.'}</p>
      </div><div className="workspace-hero-art" aria-hidden="true"><MoveUpRight size={100} strokeWidth={1.5} /></div>
    </section>
    <div className="workspace-section-heading"><h2>Make your next move.</h2><Link className="text-link" href="/app/lab">Everything in the lab <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    <WorkspaceDestinations items={['visits', 'projects', 'events']} />
    <div className="workspace-home-footer"><Link className="text-link" href="/app/profile">Your profile & settings <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
  </div>;
}
