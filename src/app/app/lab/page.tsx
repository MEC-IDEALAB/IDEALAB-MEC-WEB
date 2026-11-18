import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { LabSessionPanel } from '@/components/lab-session-panel';
import { RecentProjects } from '@/features/projects/recent-projects';
import { UpcomingProgramme } from '@/features/events/upcoming-programme';
import { MemberLoadingSkeleton } from '@/components/member-loading-skeleton';
import { Suspense } from 'react';
import { LabPresence } from '@/components/lab-presence';

export const metadata = { title: 'The lab' };
export default async function LabPage() {
  const { user } = await requireMember();
  return <div className="workspace-page workspace-lab-page">
    <div className="workspace-lab-overview">
    <Suspense fallback={<MemberLoadingSkeleton kind="lab-session" />}><LabSessionPanel accountId={user.id} history /></Suspense>
    <Suspense fallback={<MemberLoadingSkeleton kind="page" />}><LabPresence /></Suspense>
    </div>
    <section className="workspace-lab-brief" data-reveal="section" aria-labelledby="lab-brief-title">
      <span className="workspace-pixel-label">LAB BULLETIN / 02</span>
      <h2 id="lab-brief-title">What’s happening in the lab</h2>
      <Suspense fallback={<MemberLoadingSkeleton kind="events" />}><UpcomingProgramme /></Suspense>
      <Suspense fallback={<MemberLoadingSkeleton kind="projects" />}><RecentProjects /></Suspense>
    </section>
    <nav className="workspace-lab-resources" aria-label="Lab information"><Link href="/lab">Facilities & equipment <ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/explore">About IDEA Lab <ArrowUpRight size={17} aria-hidden="true" /></Link></nav>
  </div>;
}
