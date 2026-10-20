import type { ReactNode } from 'react';
import { PreviewDraftBoundary } from '@/features/requests/preview-draft-boundary';

export default function DesignLayout({ children }: { children: ReactNode }) {
  return <PreviewDraftBoundary>{children}</PreviewDraftBoundary>;
}
