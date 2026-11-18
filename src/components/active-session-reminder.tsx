'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, LogOut } from 'lucide-react';
import { changeOwnVisit } from '@/app/app/visits/actions';
import { formatSessionElapsed, sessionElapsedSeconds, sessionNeedsCheckoutReminder } from '@/lib/active-session';
import type { VisitCommandState } from '@/lib/visit-command';

const checkinLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value));

export function ActiveSessionReminder({ accountId, visitId, checkinTime, commandId }: { accountId: string; visitId: string; checkinTime: string; commandId: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.parse(checkinTime));
  const feedback = useRef<HTMLParagraphElement>(null);
  const handledState = useRef<VisitCommandState | null>(null);
  const [state, formAction, pending] = useActionState(changeOwnVisit, { status: 'idle', message: '' } as VisitCommandState);
  const elapsedSeconds = sessionElapsedSeconds(checkinTime, now);
  const reminderDue = sessionNeedsCheckoutReminder(checkinTime, now);

  useEffect(() => {
    if (reminderDue || state.status === 'saved') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [checkinTime, reminderDue, state.status]);

  useEffect(() => {
    if (state.status !== 'saved' || handledState.current === state) return;
    handledState.current = state;
    feedback.current?.focus();
    const timer = window.setTimeout(() => router.refresh(), 1200);
    return () => window.clearTimeout(timer);
  }, [router, state]);

  return <aside className="active-session-reminder" data-reminder-due={reminderDue} aria-label="Active lab session">
    <span className="active-session-reminder__icon" aria-hidden="true"><Clock3 size={18} /></span>
    <div className="active-session-reminder__details">
      <small>CHECKED IN · {checkinLabel(checkinTime)} IST</small>
      <p role={reminderDue ? 'status' : undefined} aria-live={reminderDue ? 'polite' : 'off'}>{reminderDue ? 'Still in the lab? Check out when you leave.' : 'Remember to check out when you leave.'}</p>
    </div>
    {reminderDue
      ? <span className="active-session-reminder__timer" aria-label="Checked in for two hours or more">2h+</span>
      : <time className="active-session-reminder__timer" aria-label={`Time since check-in: ${formatSessionElapsed(elapsedSeconds)}`}>{formatSessionElapsed(elapsedSeconds)}</time>}
    <form action={formAction} aria-busy={pending} onSubmit={event => { if (pending) event.preventDefault(); }}>
      <input type="hidden" name="visit_action" value="out" />
      <input type="hidden" name="command_id" value={commandId} />
      <input type="hidden" name="visit_id" value={visitId} />
      <input type="hidden" name="expected_account" value={accountId} />
      <button type="submit" className="button button-primary" disabled={pending || state.status === 'saved'}><LogOut size={17} aria-hidden="true" />{pending ? 'Saving…' : state.status === 'saved' ? 'Checked out' : 'Check out'}</button>
    </form>
    <p tabIndex={-1} ref={feedback} className="active-session-reminder__feedback" role={state.status === 'error' || state.status === 'invalid' || state.status === 'closed' ? 'alert' : 'status'} aria-live="polite">{state.status === 'saved' ? 'Checked out. Your session is saved.' : state.message}</p>
  </aside>;
}
