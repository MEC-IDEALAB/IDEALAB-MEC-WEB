import { notFound } from 'next/navigation';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
import { MemberDiscovery } from '@/components/member-discovery';
import { WorkspaceArcadeHeading, LabPresenceUnavailable, ProfileSharingNotice } from '@/components/workspace-arcade';
import { LabVisitsPreview } from '@/components/lab-visits-preview';
import { PublicProfileEditor } from '@/features/profile/public-profile-editor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Member visual preview', robots: { index: false, follow: false } };

export default async function MemberSpacePreview({ searchParams }: { searchParams: Promise<{ screen?: string }> }) {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  const { screen } = await searchParams;
  const current = screen === 'lab' || screen === 'profile' ? screen : 'home';
  return <MemberWorkspaceShell variant="preview" previewPath="/design/member-space" activeScreen={current} activeLabel="Member visual preview">
    <div className="workspace-page">
      {current === 'home' ? <MemberDiscovery /> : current === 'lab' ? <>
        <LabVisitsPreview />
        <LabPresenceUnavailable />
      </> : <div className="workspace-arcade-profile"><WorkspaceArcadeHeading kind="profile" /><ProfileSharingNotice /><PublicProfileEditor preview /></div>}
    </div>
  </MemberWorkspaceShell>;
}
