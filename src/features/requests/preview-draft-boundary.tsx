'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { deleteSavedDraft } from './draft-storage';

const requestPreviewPaths = new Set(['/design/request', '/design/requests']);

export function PreviewDraftBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!requestPreviewPaths.has(pathname)) deleteSavedDraft('design-preview', undefined, 'memory');
  }, [pathname]);

  useEffect(() => () => { deleteSavedDraft('design-preview', undefined, 'memory'); }, []);

  return children;
}
