import Link from 'next/link';
import { ArrowUpRight, DoorOpen, ArrowRight } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { WorkspaceDestinations } from '@/components/workspace-destinations';
import { OwnVisitsPanel } from '@/components/own-visits-panel';
import { LabOpeningPanel } from '@/components/lab-opening-panel';
import { RecentProjects } from '@/features/projects/recent-projects';
import { UpcomingProgramme } from '@/features/events/upcoming-programme';
import { MemberLoadingSkeleton } from '@/components/member-loading-skeleton';
import { Suspense } from 'react';

export const metadata = { title: 'The lab' };
export default async function LabPage() {
  const { profile } = await requireMember();
  const testRequestIntake = process.env.ACCOUNT_ENVIRONMENT === 'validation' && process.env.ENABLE_WORK_REQUEST_INTAKE === 'true' && profile.role === 'student';
  return <div className="workspace-page">
    <span className="eyebrow">ONE SPACE. MANY POSSIBILITIES.</span>
    <h1>Your lab, at a glance.</h1>
    <p>From your first visit to your next build. Find requests, shared tools, events and projects in one place.</p>
    <Suspense fallback={<MemberLoadingSkeleton kind="opening" />}><LabOpeningPanel history /></Suspense>
    <Suspense fallback={<MemberLoadingSkeleton kind="visits" />}><OwnVisitsPanel history /></Suspense>
    <section className="lab-visit-feature" aria-labelledby="lab-visit-title"><div><span className="eyebrow">COME IN WITH AN IDEA</span><h2 id="lab-visit-title">A place to make<br />yourself curious.</h2><p>Opening times follow core duty. Check the recorded status above and plan your next visit.</p><Link className="button button-primary" href="/app/visits">Plan a lab visit <ArrowRight size={18} aria-hidden="true" /></Link><p className="small-copy">Record your visit when you arrive. Check-in does not grant machine access.</p></div><DoorOpen size={110} strokeWidth={1.2} aria-hidden="true" /></section>
    <div className="workspace-section-heading"><h2>What brings you in?</h2><p>Choose where to begin.</p></div>
    <WorkspaceDestinations items={['requests', 'borrowing', 'events', 'visits', 'projects']} testRequestIntake={testRequestIntake} />
    <Suspense fallback={<MemberLoadingSkeleton kind="events" />}><UpcomingProgramme /></Suspense>
    <Suspense fallback={<MemberLoadingSkeleton kind="projects" />}><RecentProjects /></Suspense>
    <section className="workspace-institution" aria-labelledby="lab-institution"><div><span className="eyebrow">MODEL ENGINEERING COLLEGE</span><h2 id="lab-institution">Get to know the space.</h2><p>Explore the facilities and the lab’s purpose before your next conversation with the team.</p></div><div><Link href="/lab">Facilities & equipment <ArrowUpRight size={18} aria-hidden="true" /></Link><Link href="/explore">About IDEA Lab <ArrowUpRight size={18} aria-hidden="true" /></Link><a href="mailto:idealab@mec.ac.in">Contact the team <ArrowUpRight size={18} aria-hidden="true" /></a></div></section>
    <div className="workspace-home-footer"><Link className="button" href="/lab">Explore the facilities <ArrowUpRight size={18} aria-hidden="true" /></Link><a className="button" href="mailto:idealab@mec.ac.in">Ask the lab team</a></div>
  </div>;
}
