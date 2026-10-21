import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StudentWorkspacePreview, type StudentPreviewScreen } from '@/features/student/student-workspace-preview';
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
  searchParams: Promise<{ screen?: string | string[] }>;
}) {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();

  const params = await searchParams;
  const requestedScreen = Array.isArray(params.screen) ? params.screen[0] : params.screen;
  const activeScreen = screens.includes(requestedScreen as StudentPreviewScreen)
    ? requestedScreen as StudentPreviewScreen
    : 'home';

  return <StudentWorkspacePreview activeScreen={activeScreen} />;
}
