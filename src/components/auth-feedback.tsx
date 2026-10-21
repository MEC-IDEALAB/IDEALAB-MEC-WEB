'use client';

import { useEffect, useRef } from 'react';

export function AuthFeedback({ children, kind = 'error' }: { children: React.ReactNode; kind?: 'error' | 'status' }) {
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => { notice.current?.focus(); }, []);
  return <div ref={notice} className={`notice auth-feedback auth-feedback-${kind}`} role={kind === 'error' ? 'alert' : 'status'} tabIndex={-1}>{children}</div>;
}
