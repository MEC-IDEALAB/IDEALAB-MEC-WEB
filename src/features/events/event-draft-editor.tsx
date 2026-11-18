'use client';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { saveEventDraft } from '@/app/app/events/manage/actions';
import { eventTypes } from './event-contract';
import { eventEditorDetails, savedEventMatches, type EventDraft, type EventManagementCommand, type EventRejected, type EventSaved } from './management-contract';
import { clearPendingEvent, markPendingEvent, preparePendingEvent, readPendingEvent, type PendingEvent } from './pending-event';

const editorTime = (value: string | null | undefined) => value ? new Date(Date.parse(value) + 330 * 60000).toISOString().slice(0, 16) : '';
export function EventDraftEditor({ accountId, scopeId, draft, preview = false }: { accountId: string; scopeId: string; draft: EventDraft | null; preview?: boolean }) {
  return <EventDraftEditorSession key={`${accountId}:${scopeId}:${draft?.id ?? 'new'}:${draft?.revision ?? '0'}:${preview}`} accountId={accountId} scopeId={scopeId} draft={draft} preview={preview} />;
}
function EventDraftEditorSession({ accountId, scopeId, draft, preview }: { accountId: string; scopeId: string; draft: EventDraft | null; preview: boolean }) {
  const [checking, setChecking] = useState(true), [sending, setSending] = useState(false), [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState<PendingEvent | null>(null), [saved, setSaved] = useState<EventSaved | null>(null), [savedScope, setSavedScope] = useState(scopeId), [message, setMessage] = useState('');
  const [rejectedCopy, setRejectedCopy] = useState<EventManagementCommand | null>(null);
  const live = useRef(false), busy = useRef(false), feedback = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    void (preview ? Promise.resolve({ status: 'empty' as const }) : readPendingEvent(accountId)).then(result => {
      if (!active) return;
      if (result.status === 'ready') { setPending(result.pending); setMessage('An earlier command needs confirmation. Review it before retrying.'); }
      if (result.status === 'unavailable') { setBlocked(true); setMessage('This browser could not recover an earlier command safely. Check the event list before continuing.'); }
      setChecking(false);
    });
    return () => { active = false; };
  }, [accountId, preview]);
  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);

  async function dispatch(value: PendingEvent) {
    const recovered = await preparePendingEvent(value);
    if (!live.current) return;
    if (recovered.status !== 'ready') { setBlocked(true); setMessage('The exact command could not be recovered safely. Nothing was sent from this attempt.'); return; }
    if (recovered.pending.commandId !== value.commandId || JSON.stringify(recovered.pending.command) !== JSON.stringify(value.command)) {
      setPending(recovered.pending); setMessage('Another tab has a different earlier command. Review it before continuing.'); return;
    }
    if (!markPendingEvent(value)) { setBlocked(true); setMessage('Browser storage is unavailable. Your command has not been sent from this attempt.'); return; }
    let result: EventSaved | EventRejected | null = null;
    const form = new FormData(); form.set('expected_account', accountId); form.set('command_id', value.commandId); form.set('command', JSON.stringify(value.command));
    try { result = await saveEventDraft(form); } catch { /* Keep the exact command; no inferred failure. */ }
    if (!live.current) return;
    if (result?.status === 'rejected') {
      setRejectedCopy(value.command);
      const cleared = await clearPendingEvent(accountId, value.commandId);
      if (!live.current) return;
      if (cleared) setPending(null);
      setBlocked(true);
      setMessage(cleared ? result.reason === 'conflict'
        ? 'This saved revision changed before your command was applied. Copy any unsaved text, then reload the saved draft before making another change.'
        : 'The server rejected these details without applying the command. Copy any unsaved text, then return to the saved drafts to review them.'
        : 'The server rejected this attempt, but browser recovery could not be cleared safely. Keep your text and check saved drafts.');
      return;
    }
    if (!result || !savedEventMatches(result, value.command)) { setMessage('We couldn’t confirm this command. Keep these details and check the event list. Retry only this exact command.'); return; }
    setSaved(result); setSavedScope(value.scopeId);
    const cleared = await clearPendingEvent(accountId, value.commandId);
    if (!live.current) return;
    if (cleared) setPending(null);
    setMessage(cleared ? 'Confirmed in the validation database. Open the saved event to continue.' : 'Saved, but browser recovery could not be cleared safely. Keep this saved link.');
  }
  async function retry() {
    if (!pending || busy.current || saved) return;
    busy.current = true; setSending(true);
    try { await dispatch(pending); } finally { busy.current = false; if (live.current) setSending(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) { setMessage('Visual preview only. No draft was saved and no command was sent.'); return; }
    if (checking || pending || blocked || busy.current || saved) return;
    const form = new FormData(event.currentTarget);
    const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('data-action') === 'publish';
    const details = eventEditorDetails(form);
    if (!details) { setMessage('Check the title, description, IST times, venue, capacity and fee.'); return; }
    let command: EventManagementCommand;
    if (publish) {
      if (!draft || form.get('publish_confirmation') !== 'yes') { setMessage('Confirm you reviewed the saved draft before publishing.'); return; }
      // Publication always targets the saved revision. Unsaved fields must never be silently ignored.
      if (JSON.stringify(details) !== JSON.stringify(draft.details)) {
        // Property order differs between database JSON and editor output; compare fields by key.
        if (Object.keys(details).some(key => details[key as keyof typeof details] !== draft.details[key as keyof typeof details])) {
          setMessage('Save your changes and reopen the draft before publishing.'); return;
        }
      }
      command = { action: 'publish', event_id: draft.id, revision: draft.revision };
    } else command = draft ? { action: 'edit', event_id: draft.id, revision: draft.revision, details } : { action: 'create', scope_id: scopeId, details };
    busy.current = true; setSending(true);
    try {
      const proposal: PendingEvent = { accountId, scopeId, commandId: crypto.randomUUID(), command };
      const result = await preparePendingEvent(proposal);
      if (!live.current) return;
      if (result.status !== 'ready') { setBlocked(true); setMessage('The command could not be stored safely. Nothing was sent from this attempt.'); return; }
      setPending(result.pending);
      if (result.pending.commandId !== proposal.commandId) { setMessage('Another tab has an earlier command. Review and confirm it first.'); return; }
      await dispatch(result.pending);
    } finally { busy.current = false; if (live.current) setSending(false); }
  }
  const details = draft?.details;
  const immutable = checking || sending || !!pending || blocked || !!saved || draft?.state === 'published';
  return <div className="event-manager-editor">
    {checking && <p role="status">Checking earlier commands…</p>}
    {message && <p className="notice" role="status" tabIndex={-1} ref={feedback}>{message}</p>}
    {pending && <section className="event-command-recovery" aria-labelledby="event-recovery-title"><span className="eyebrow">RECOVER FIRST</span><h2 id="event-recovery-title">Your earlier {pending.command.action} command.</h2><p>These exact details stay fixed until the command is confirmed. This browser may have sent it already.</p><textarea aria-label="Earlier command details for copying" readOnly rows={7} value={JSON.stringify(pending.command, null, 2)} /><button className="button" type="button" disabled={sending || !!saved || blocked} onClick={retry}>{sending ? 'Confirming…' : 'Retry this exact command'}</button></section>}
    {saved && <Link className="button" href={`/app/events/manage?${new URLSearchParams({ scope: savedScope, event: saved.event_id })}`}>Open saved event</Link>}
    {rejectedCopy && !pending && <section className="event-command-recovery" aria-labelledby="event-rejected-copy"><h2 id="event-rejected-copy">Keep a copy of your changes.</h2><p>This command was rejected. Copy these details before opening the saved drafts.</p><textarea aria-label="Rejected command details for copying" readOnly rows={7} value={JSON.stringify(rejectedCopy.action === 'publish' ? { command: rejectedCopy, details: draft?.details } : rejectedCopy, null, 2)} /></section>}
    {blocked && <Link className="text-link" href={`/app/events/manage?scope=${scopeId}`}>Return to saved drafts</Link>}
    <form onSubmit={submit} aria-busy={sending}>
      <fieldset disabled={immutable} className="event-editor-fields"><legend>{draft ? `Saved revision ${draft.revision}` : 'New event draft'}</legend>
        <label>Event title<input name="title" required minLength={3} maxLength={160} defaultValue={details?.title} autoComplete="off" /></label>
        <label>Description<textarea name="description" required minLength={20} maxLength={10000} rows={5} defaultValue={details?.description} /></label>
        <div className="event-editor-grid"><label>Event type<select name="event_type" defaultValue={details?.event_type ?? 'workshop'}>{Object.entries(eventTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Venue<input name="venue" required maxLength={300} defaultValue={details?.venue} /></label></div>
        <div className="event-editor-grid"><label>Starts · IST<input type="datetime-local" name="event_date" required defaultValue={editorTime(details?.event_date)} /></label><label>Ends · IST · optional<input type="datetime-local" name="end_date" defaultValue={editorTime(details?.end_date)} /></label></div>
        <div className="event-editor-grid"><label>Capacity · blank for unlimited<input type="number" name="capacity" min={1} max={999999999} step={1} defaultValue={details?.capacity ?? ''} /></label><label>Fee · ₹<input name="fee" inputMode="decimal" required defaultValue={details ? (Number(details.fee_paise) / 100).toFixed(2) : '0'} /></label></div>
        <div className="event-editor-grid"><label>Who may register<select name="audience" defaultValue={details?.audience ?? 'open'}><option value="open">Open to eligible members</option><option value="invite_only">Invitation only</option></select></label><label>Attendee names visible to<select name="attendee_visibility" defaultValue={details?.attendee_visibility ?? 'registered'}><option value="registered">Registered attendees</option><option value="members">Signed-in members</option><option value="head">Assigned Event Head only</option></select></label></div>
        <p className="small-copy">Paid and invite-only events can be drafted. Publication and registration for those events await their approved workflow.</p>
        {draft?.state !== 'published' && <div className="event-editor-actions"><button className="button" type="submit">{sending ? 'Saving…' : draft ? 'Save changes' : 'Save private draft'}</button>
          {draft && <><label className="event-publish-confirmation"><input type="checkbox" name="publish_confirmation" value="yes" /> I reviewed the saved details and want this event in the programme.</label><button className="button button-secondary" type="submit" data-action="publish" disabled={details?.fee_paise !== '0' || details?.audience !== 'open'}>Publish saved draft</button></>}
        </div>}
      </fieldset>
    </form>
  </div>;
}
