'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import { changeOwnVisit } from '@/app/app/visits/actions';
import { buildVisitCommand, type VisitCommandState } from '@/lib/visit-command';

export function OwnVisitControls({ accountId, activeVisitId, canCheckIn, available = true, commandId }: { accountId: string; activeVisitId: string | null; canCheckIn: boolean; available?: boolean; commandId: string }) {
  const router = useRouter();
  const feedback = useRef<HTMLParagraphElement>(null);
  const handledState = useRef<VisitCommandState | null>(null);
  const [state, formAction, pending] = useActionState(async (previous: VisitCommandState, form: FormData) => {
    const command = buildVisitCommand(form);
    if (!command) return { status: 'invalid', message: 'Refresh the lab session and try again.' } as VisitCommandState;
    return changeOwnVisit(previous, form);
  }, { status: 'idle', message: '' } as VisitCommandState);
  useEffect(() => {
    if (state.status === 'idle' || handledState.current === state) return;
    handledState.current = state;
    if (state.status === 'saved') {
      document.getElementById('own-visit-title')?.focus();
      router.refresh();
    }
    else feedback.current?.focus();
  }, [router, state]);
  return <div className="own-visit-controls">
    <form action={formAction} aria-busy={pending} onSubmit={event => { if (pending) event.preventDefault(); }}>
      <input type="hidden" name="visit_action" value={activeVisitId ? 'out' : 'in'} /><input type="hidden" name="command_id" value={commandId} />
      <input type="hidden" name="expected_account" value={accountId} />
      {activeVisitId ? <input type="hidden" name="visit_id" value={activeVisitId} /> : <input type="hidden" name="purpose" value="Lab visit" />}
      <button type="submit" className="button button-primary" disabled={pending || state.status === 'saved' || !available || (!activeVisitId && !canCheckIn)}>{activeVisitId ? <LogOut size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}{pending ? 'Saving…' : activeVisitId ? 'Check out' : available ? 'Check in' : 'Check-in unavailable'}</button>
      <p tabIndex={-1} ref={feedback} role={state.status === 'error' || state.status === 'invalid' || state.status === 'closed' ? 'alert' : 'status'} aria-live="polite">{state.message}</p>
      {!activeVisitId && !canCheckIn && available && <p className="small-copy">Check-in opens when a core member marks the lab open.</p>}
      {!available && <p className="small-copy">Session tracking is unavailable right now.</p>}
    </form>
  </div>;
}
