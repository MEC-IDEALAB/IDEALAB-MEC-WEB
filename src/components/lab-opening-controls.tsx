'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { changeLabOpening } from '@/app/app/lab/actions';
import type { LabOpeningActionState } from '@/lib/lab-opening';

export function LabStatusRefresh({ loadedAt }: { loadedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') startTransition(() => router.refresh()); };
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
  }, [router]);
  return <div className="lab-status-refresh"><span>Checked <time dateTime={loadedAt}>{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(loadedAt))} IST</time> · refreshes every 30s while visible</span><button className="button" type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={15} aria-hidden="true" />{pending ? 'Refreshing…' : 'Refresh status'}</button></div>;
}

export function LabOpeningControls({ accountId, revision, status, commandId }: { accountId: string; revision: string; status: 'unknown' | 'open' | 'closed'; commandId: string }) {
  const [state, formAction, pending] = useActionState(changeLabOpening, { status: 'idle', message: '' } as LabOpeningActionState);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === 'saved') document.getElementById('lab-opening-title')?.focus();
    else if (state.status === 'error') feedback.current?.focus();
  }, [state]);
  return <form action={formAction} className="lab-opening-controls" aria-busy={pending}>
    <input type="hidden" name="expected_revision" value={revision} /><input type="hidden" name="command_id" value={commandId} />
    <input type="hidden" name="expected_account" value={accountId} />
    <p className="small-copy">Your account has lab opening duty. Record the change when you open or close the space.</p>
    <div className="lab-opening-buttons">
      {status !== 'open' && <button className="button button-primary" name="action" value="open" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Open lab'}</button>}
      {status !== 'closed' && <button className="button" name="action" value="close" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Close lab'}</button>}
    </div>
    <p ref={feedback} tabIndex={-1} role={state.status === 'error' ? 'alert' : 'status'} aria-live="polite">{state.message}</p>
  </form>;
}
