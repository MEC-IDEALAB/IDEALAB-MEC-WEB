'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { changeOwnVisit } from '@/app/app/visits/actions';
import { buildVisitCommand, visitPurposeError, type VisitCommandState } from '@/lib/visit-command';

export function OwnVisitControls({ accountId, activeVisitId, canCheckIn, commandId }: { accountId: string; activeVisitId: string | null; canCheckIn: boolean; commandId: string }) {
  const purposeId = `visit-purpose-${useId().replaceAll(':','')}`;
  const [purpose, setPurpose] = useState('');
  const purposeError = purpose ? visitPurposeError(purpose) : null;
  const feedback = useRef<HTMLParagraphElement>(null);
  const [state, formAction, pending] = useActionState(async (previous: VisitCommandState, form: FormData) => {
    if (!buildVisitCommand(form)) return { status: 'invalid', message: 'Check your visit purpose and keep it within 1,000 characters.' } as VisitCommandState;
    const next = await changeOwnVisit(previous, form);
    if (next.status === 'saved') setPurpose('');
    return next;
  }, { status: 'idle', message: '' } as VisitCommandState);
  useEffect(() => {
    if (state.status === 'saved') document.getElementById('own-visit-title')?.focus();
    else if (state.status !== 'idle') feedback.current?.focus();
  }, [state]);
  return <div className="own-visit-controls">
    <form action={formAction} aria-busy={pending} onSubmit={event => { if (pending) event.preventDefault(); }}>
      <input type="hidden" name="visit_action" value={activeVisitId ? 'out' : 'in'} /><input type="hidden" name="command_id" value={commandId} />
      <input type="hidden" name="expected_account" value={accountId} />
      {activeVisitId ? <><input type="hidden" name="visit_id" value={activeVisitId} /><p>You can check out of this visit even if the lab has since closed.</p></>
        : canCheckIn ? <div className="visit-purpose-field"><label htmlFor={purposeId}>What brings you to the lab?</label><textarea id={purposeId} name="purpose" rows={3} required maxLength={2000} value={purpose} onChange={event => setPurpose(event.target.value)} disabled={pending} aria-invalid={Boolean(purposeError)} aria-describedby={`${purposeId}-hint${purposeError ? ` ${purposeId}-error` : ''}`} /><p className="small-copy" id={`${purposeId}-hint`}>Describe your purpose. Avoid personal contact details or other sensitive information. {Array.from(purpose).length}/1,000 characters</p>{purposeError && <p id={`${purposeId}-error`}>{purposeError}</p>}</div>
          : <p>Check-in becomes available when a core member records the lab as open. Refresh the status above before you travel.</p>}
      {(activeVisitId || canCheckIn) && <button type="submit" className="button button-primary" disabled={pending}>{activeVisitId ? <LogOut size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}{pending ? 'Saving visit…' : activeVisitId ? 'Check out' : 'Check in'}</button>}
      <p tabIndex={-1} ref={feedback} role={state.status !== 'idle' && state.status !== 'saved' ? 'alert' : 'status'} aria-live="polite">{state.message}</p>
    </form>
  </div>;
}
