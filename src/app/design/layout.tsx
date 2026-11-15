import type { ReactNode } from 'react';
import '../member-shell.css';
import '../workspace-arcade.css';
import '../member-discovery.css';
import '../member-mobile.css';
import '../member-settings.css';
import '../public-profile.css';
import '../onboarding-preview.css';
import '../staff-preview.css';
import '../student-preview.css';
import { PreviewDraftBoundary } from '@/features/requests/preview-draft-boundary';

export default function DesignLayout({ children }: { children: ReactNode }) {
  return <PreviewDraftBoundary>{children}</PreviewDraftBoundary>;
}
