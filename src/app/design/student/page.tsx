import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudentWorkspacePreview, type StudentPreviewScreen } from '@/features/student/student-workspace-preview';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
import { MemberLoadingSkeleton } from '@/components/member-loading-skeleton';
import '../../student-preview.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Student workspace design preview',
  robots: { index: false, follow: false },
};

const screens: StudentPreviewScreen[] = [
  'home', 'lab', 'profile', 'projects', 'events', 'requests', 'notifications', 'visits', 'borrowing', 'settings',
];

export default async function StudentWorkspaceDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string | string[]; loading?: string | string[] }>;
}) {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();

  const params = await searchParams;
  const loadingPreview = Array.isArray(params.loading) ? params.loading[0] : params.loading;
  if (loadingPreview === 'true') {
    return <MemberWorkspaceShell variant="preview" activeScreen="home" activeLabel="Loading preview">
      <div className="workspace-page member-loading-preview">
        <span className="eyebrow">MEMBER WORKSPACE · LOADING STATES</span>
        <h1>While your space opens.</h1>
        <p>These placeholders show where real member data will appear. They contain no activity or live records.</p>
        <section aria-labelledby="loading-route-title" className="member-loading-preview__group">
          <h2 id="loading-route-title">Home and Lab page transition</h2>
          <MemberLoadingSkeleton kind="page" />
        </section>
        <section aria-labelledby="loading-home-title" className="member-loading-preview__group">
          <h2 id="loading-home-title">Home data panels</h2>
          <div className="member-loading-preview__grid">
            <MemberLoadingSkeleton kind="opening" />
            <MemberLoadingSkeleton kind="visits" />
            <MemberLoadingSkeleton kind="events" />
            <MemberLoadingSkeleton kind="projects" />
          </div>
        </section>
        <section aria-labelledby="loading-lab-title" className="member-loading-preview__group">
          <h2 id="loading-lab-title">Lab data panels</h2>
          <div className="member-loading-preview__grid">
            <MemberLoadingSkeleton kind="opening" />
            <MemberLoadingSkeleton kind="visits" />
            <MemberLoadingSkeleton kind="events" />
            <MemberLoadingSkeleton kind="projects" />
          </div>
        </section>
      </div>
    </MemberWorkspaceShell>;
  }

  const requestedScreen = Array.isArray(params.screen) ? params.screen[0] : params.screen;
  const activeScreen = screens.includes(requestedScreen as StudentPreviewScreen)
    ? requestedScreen as StudentPreviewScreen
    : 'home';

  return <StudentWorkspacePreview activeScreen={activeScreen} />;
}
