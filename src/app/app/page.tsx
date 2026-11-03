import { Suspense } from 'react';
import { requireMember } from '@/lib/member';
import { MemberDiscovery } from '@/components/member-discovery';
import { OwnVisitsPanel } from '@/components/own-visits-panel';
import { LabOpeningPanel } from '@/components/lab-opening-panel';
import { RecentProjects } from '@/features/projects/recent-projects';
import { UpcomingProgramme } from '@/features/events/upcoming-programme';
import { MemberLoadingSkeleton } from '@/components/member-loading-skeleton';

export const metadata = { title: 'Your space' };

export default async function MemberHome({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { profile } = await requireMember();
  const { notice } = await searchParams;
  return <div className="workspace-page discovery-page">
    {notice === 'signout' && <div className="notice" role="alert">We couldn’t sign you out. You are still signed in. Please try Sign out again.</div>}
    <MemberDiscovery name={profile.name} labSnapshot={<><Suspense fallback={<MemberLoadingSkeleton kind="opening" />}><LabOpeningPanel /></Suspense><Suspense fallback={<MemberLoadingSkeleton kind="visits" />}><OwnVisitsPanel /></Suspense></>}>
      <Suspense fallback={<MemberLoadingSkeleton kind="events" />}><UpcomingProgramme /></Suspense>
      <Suspense fallback={<MemberLoadingSkeleton kind="projects" />}><RecentProjects /></Suspense>
    </MemberDiscovery>
  </div>;
}
