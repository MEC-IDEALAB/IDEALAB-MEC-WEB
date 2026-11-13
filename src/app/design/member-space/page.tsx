import { notFound } from 'next/navigation';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
import { MemberDiscovery } from '@/components/member-discovery';
import { ProfileWorkspaceHeader, LabPresenceUnavailable } from '@/components/workspace-arcade';
import { LabVisitsPreview } from '@/components/lab-visits-preview';
import { UpcomingEventPreviewCard } from '@/features/events/event-carousel';
import { MakerProfileShowcase } from '@/features/profile/maker-profile-showcase';

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
        <UpcomingEventPreviewCard />
      </> : <div className="workspace-arcade-profile">
        <ProfileWorkspaceHeader settingsHref="/design/member-settings" profileEditHref="/design/member-profile-edit" shareHref="/design/member-space?screen=profile" />
        <MakerProfileShowcase
          preview
          name="Aarya Menon"
          avatarUrl="/editorial/profile-maker-avatar.svg"
          avatarAlt="Sample pixel portrait illustration for the visual preview"
          detail="Model Engineering College · Computer Science · Year 3"
          bio="I like turning small questions into things you can test, touch and improve. Currently learning embedded systems and product design."
          interests={['Programming', 'Web development', 'Robotics', '3D printing', 'Gaming', 'Fitness', 'Photography', 'Volunteering']}
          links={[{ label: 'GitHub · sample', url: 'https://github.com/' }, { label: 'LinkedIn · sample', url: 'https://www.linkedin.com/' }]}
          shareHref="/design/member-space?screen=profile"
          editHref="/design/member-profile-edit"
          sampleProjects={[
            { title: 'Plant care monitor', detail: 'A small sensor build exploring soil moisture and simple alerts.', status: 'IN PROGRESS', accent: 'yellow' },
            { title: 'Workshop wayfinder', detail: 'A collaborative interface concept for finding the next lab session.', status: 'SHOWCASE', accent: 'blue' },
          ]}
          activity={[
            { title: 'Intro to embedded systems', detail: 'IDEALAB MEC workshop', meta: 'SAMPLE · OCT 2026', kind: 'activity' },
            { title: 'Open lab build session', detail: 'Community activity', meta: 'SAMPLE · SEP 2026', kind: 'activity' },
          ]}
          experience={[
            { title: 'Student maker', detail: 'Personal builds and team prototypes', meta: 'SAMPLE · 2025—NOW', kind: 'experience' },
          ]}
          education={[
            { title: 'Model Engineering College', detail: 'B.Tech · Computer Science', meta: 'SAMPLE · 2023—2027', kind: 'education' },
          ]}
          volunteering={[
            { title: 'Workshop volunteer', detail: 'Helped welcome and guide new makers', meta: 'SAMPLE · 2025', kind: 'volunteer' },
          ]}
        />
      </div>}
    </div>
  </MemberWorkspaceShell>;
}
