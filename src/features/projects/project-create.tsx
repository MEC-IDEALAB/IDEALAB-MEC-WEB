'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProjectWithAccountIntent, readOwnProjectCreateIntent, resolveOwnProjectCreateIntent } from '@/app/app/projects/actions';
import { buildProjectCommand } from './project-command';
import { parseProjectCreateIntent, sameCreatePayload, type ProjectCreateIntent } from './project-create-intent';
import { projectCreateRecoveryCopyPlan, projectCreateSessionKey, type ProjectCreateScope } from './project-create-session';
import { clearConfirmedCreate, markPendingCreate, preparePendingCreate, projectMarkers, readPendingCreate, type CreatePayload, type PendingCreate } from './pending-create';

type PendingSource = 'browser' | 'server';
type ProjectCreateProps = { accountId: string; initialCommandId: string; preview?: boolean };

/** The server intent is authoritative; the browser journal protects only unsent/lost-response details. */
export function ProjectCreate(props: ProjectCreateProps) {
  const scope: ProjectCreateScope = props.preview ? 'preview' : 'validation';
  // Account or mode changes remount the private form state and rerun its recovery check.
  return <ProjectCreateSession key={projectCreateSessionKey(props.accountId, scope)} {...props} scope={scope} />;
}

function ProjectCreateSession({ accountId, initialCommandId, preview = false, scope }: ProjectCreateProps & { scope: ProjectCreateScope }) {
  const router = useRouter(), id = `create-${useId().replaceAll(':', '')}`;
  const [checking, setChecking] = useState(true), [sending, setSending] = useState(false), [unavailable, setUnavailable] = useState(false);
  const [intent, setIntent] = useState<ProjectCreateIntent>({ status: 'unavailable' });
  const [generation, setGeneration] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingCreate | null>(null), [pendingSource, setPendingSource] = useState<PendingSource | null>(null);
  const [serverSaved, setServerSaved] = useState(false), [markers, setMarkers] = useState<string[]>([]);
  const [message, setMessage] = useState(''), [confirmed, setConfirmed] = useState<string | null>(null);
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [visibility, setVisibility] = useState('private');
  const [savedCopy, setSavedCopy] = useState<CreatePayload | null>(null);
  const account = useRef<string | null>(accountId), busy = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);

  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);
  useLayoutEffect(() => { account.current = accountId; return () => { account.current = null; }; }, [accountId]);

  const showServerIntent = useCallback((value: Extract<ProjectCreateIntent, { status: 'unresolved' }>, local?: PendingCreate | null) => {
    setIntent(value);
    setGeneration(value.generation);
    setServerSaved(value.projectId !== null);
    setMarkers([]);
    if (local && (!sameCreatePayload(local.payload, value.payload) || local.commandId !== value.commandId)) setSavedCopy(local.payload);
    if (!value.payload) {
      setPending(null); setPendingSource(null); setUnavailable(true);
      setMessage('An earlier project request needs attention. Check My projects before starting another project.');
      return;
    }
    setPending({ accountId, commandId: value.commandId, generation: value.generation, payload: value.payload });
    setPendingSource('server'); setUnavailable(false);
    if (value.projectId) setMessage('A saved project was found. Confirm it before starting another project.');
    else setMessage('Review and retry the exact saved project details before starting another project.');
  }, [accountId]);

  useEffect(() => {
    let active = true;
    async function initialize() {
      const local = await readPendingCreate(accountId, scope);
      if (!active) return;
      if (preview) {
        setGeneration('1'); setIntent({ status: 'clear', generation: '1' });
        setPending(local.status === 'ready' ? local.pending : null); setPendingSource(local.status === 'ready' ? 'browser' : null);
        setUnavailable(local.status === 'unavailable'); setMarkers(local.status === 'unavailable' ? projectMarkers(accountId, scope) : []);
        if (local.status === 'unavailable') setMessage('This browser could not safely recover the design preview details.');
        setChecking(false); return;
      }

      let current: ProjectCreateIntent;
      try { current = parseProjectCreateIntent(await readOwnProjectCreateIntent(accountId)); }
      catch { current = { status: 'unavailable' }; }
      if (!active) return;
      setIntent(current);

      if (current.status === 'unavailable') {
        setUnavailable(true); setMarkers(local.status === 'unavailable' ? projectMarkers(accountId, scope) : []);
        setSavedCopy(local.status === 'ready' ? local.pending.payload : null);
        setMessage('Project creation is temporarily unavailable. Check My projects before retrying an earlier submission.');
      } else if (current.status === 'unresolved') {
        showServerIntent(current, local.status === 'ready' ? local.pending : null);
      } else {
        setGeneration(current.generation); setServerSaved(false); setMarkers([]);
        if (local.status === 'ready') {
          if (local.pending.generation === current.generation) {
            setPending(local.pending); setPendingSource('browser'); setUnavailable(false);
            setMessage('An earlier submission may still be in progress. Retry these exact details before starting another project.');
          } else {
            setSavedCopy(local.pending.payload); setUnavailable(true); setMarkers(projectMarkers(accountId, scope));
            setMessage('The saved submission belongs to an earlier server generation. Check My projects before creating another project.');
          }
        } else if (local.status === 'unavailable') {
          setUnavailable(true); setMarkers(projectMarkers(accountId, scope));
          setMessage('This browser could not safely recover its saved submission. Check My projects before creating another project.');
        } else setUnavailable(false);
      }
      setChecking(false);
    }
    void initialize();
    return () => { active = false; };
  }, [accountId, scope, preview, showServerIntent]);

  async function routeToConfirmed(projectId: string, commandId?: string) {
    if (commandId) {
      const local = await readPendingCreate(accountId, scope);
      const matching = local.status === 'ready' && local.pending.commandId === commandId;
      const marked = projectMarkers(accountId, scope).includes(commandId);
      if ((matching || marked) && !await clearConfirmedCreate(accountId, commandId, scope)) {
        setConfirmed(projectId); setMessage('The project is confirmed, but this browser could not clear its retry record. Open the saved project or check My projects before retrying.'); return;
      }
    }
    if (account.current === accountId) router.push(`/app/projects/${projectId}`);
  }

  function adoptOutcome(value: Awaited<ReturnType<typeof createProjectWithAccountIntent>> | Awaited<ReturnType<typeof resolveOwnProjectCreateIntent>>, local?: PendingCreate | null) {
    if (value.status === 'unresolved') showServerIntent(value.intent, local);
    else if (value.status === 'error') setMessage(value.message);
  }

  async function send(item: PendingCreate, source: PendingSource) {
    if (account.current !== item.accountId) return;
    if (preview) { setMessage('Design preview only. No project was submitted.'); return; }
    if (source === 'browser' && !markPendingCreate(item, scope)) {
      setSavedCopy(item.payload); setPending(null); setPendingSource(null); setUnavailable(true); setMarkers(projectMarkers(accountId, scope));
      setMessage('This browser could not save a retry marker. No new attempt was sent; check My projects before trying again.'); return;
    }
    const form = new FormData(); form.set('expected_account', item.accountId); form.set('command_id', item.commandId);
    form.set('kind', 'create'); form.set('create_generation', item.generation);
    for (const [key, value] of Object.entries(item.payload)) form.set(key, value);
    try {
      const result = await createProjectWithAccountIntent(form);
      if (account.current !== item.accountId) return;
      if (result.status === 'saved') { await routeToConfirmed(result.projectId, item.commandId); return; }
      adoptOutcome(result, item);
    } catch {
      if (account.current === item.accountId) setMessage('We could not confirm creation. Check My projects or retry the saved submission with the same details.');
    }
  }

  async function create(form: FormData) {
    if (checking || unavailable || pending || generation === null || intent.status !== 'clear' || busy.current) return;
    form.set('command_id', initialCommandId); form.set('kind', 'create');
    const input = buildProjectCommand(form);
    if (!input || input.kind !== 'create') { setMessage('Check the title, description and visibility.'); return; }
    busy.current = true; setSending(true);
    try {
      const result = await preparePendingCreate(accountId, initialCommandId, generation, input.p_command as CreatePayload, scope);
      if (account.current !== accountId) return;
      if (result.status !== 'ready') {
        setUnavailable(true); setMarkers(projectMarkers(accountId, scope));
        setSavedCopy(input.p_command as CreatePayload);
        setMessage('This browser could not safely save a retry. No new attempt was sent; check My projects before trying again.'); return;
      }
      setPending(result.pending); setPendingSource('browser');
      if (result.pending.generation !== generation || !sameCreatePayload(result.pending.payload, input.p_command)) {
        setSavedCopy(input.p_command as CreatePayload); setUnavailable(true);
        setMessage('An earlier creation is unresolved. Review the saved submission before sending a different project.'); return;
      }
      await send(result.pending, 'browser');
    } finally { busy.current = false; if (account.current === accountId) setSending(false); }
  }

  async function retry() {
    if (!pending || busy.current) return;
    busy.current = true; setSending(true);
    try {
      if (serverSaved) {
        const result = await resolveOwnProjectCreateIntent(accountId, pending.commandId, pending.generation);
        if (account.current !== accountId) return;
        if (result.status === 'saved') { await routeToConfirmed(result.projectId, pending.commandId); return; }
        adoptOutcome(result, pendingSource === 'browser' ? pending : null); return;
      }
      if (pendingSource === 'browser') {
        const result = await readPendingCreate(accountId, scope);
        if (account.current !== accountId) return;
        if (result.status !== 'ready' || result.pending.commandId !== pending.commandId || result.pending.generation !== pending.generation
          || !sameCreatePayload(result.pending.payload, pending.payload)) {
          setSavedCopy(pending.payload); setPending(null); setPendingSource(null); setUnavailable(true);
          setMarkers(projectMarkers(accountId, scope)); setMessage('The saved submission is unavailable. Check My projects before creating another project.'); return;
        }
      }
      await send(pending, pendingSource ?? 'server');
    } finally { busy.current = false; if (account.current === accountId) setSending(false); }
  }

  async function recover(marker: string) {
    if (preview) { setMessage('Design preview only. No submission was checked.'); return; }
    if (busy.current) return; busy.current = true; setSending(true);
    try {
      const result = await resolveOwnProjectCreateIntent(accountId, marker);
      if (account.current !== accountId) return;
      if (result.status === 'saved') { await routeToConfirmed(result.projectId, marker); return; }
      if (result.status === 'error') {
        setMessage('The server could not safely confirm this saved command. Check My projects. If its outcome is still unclear, contact IDEALAB support; this form will stay blocked until the submission is resolved.');
        return;
      }
      adoptOutcome(result);
    } catch { if (account.current === accountId) setMessage('We could not confirm the earlier creation. Check My projects and try again later.'); }
    finally { busy.current = false; if (account.current === accountId) setSending(false); }
  }

  const recoveryCopies = projectCreateRecoveryCopyPlan(savedCopy, { title, description, visibility });

  return <div className="project-form" aria-busy={checking || sending}>
    {checking ? <p role="status">Checking for an unfinished submission…</p>
      : pending ? <section className="notice" aria-label="Unresolved project creation">
        <h2>{serverSaved ? 'Confirm the saved project' : 'Review the saved submission'}</h2>
        <p>{serverSaved ? 'The server found a saved project for this exact submission. Confirm it before continuing.' : 'Retry uses the same command, details and server generation. Resolve this submission before starting another project.'}</p>
        <p><strong>{pending.payload.title}</strong></p><p>{pending.payload.description}</p><p>Visibility: {pending.payload.visibility}</p>
        {savedCopy && !sameCreatePayload(savedCopy, pending.payload) && <><p>Another unsent draft is preserved here. Copy it before leaving this page.</p><label htmlFor={`${id}-saved-title`}>Your other title</label><input id={`${id}-saved-title`} readOnly value={savedCopy.title} /><label htmlFor={`${id}-saved-description`}>Your other description</label><textarea id={`${id}-saved-description`} readOnly rows={5} value={savedCopy.description} /><p>Other visibility: {savedCopy.visibility}</p></>}
        <button type="button" className="button button-primary" onClick={retry} disabled={sending}>{sending ? (serverSaved ? 'Confirming…' : 'Checking…') : (serverSaved ? 'Open saved project' : 'Retry saved submission')}</button>
      </section>
      : unavailable ? <section className="notice" aria-label="Earlier project submission needs attention">
        <h2>Check your earlier submission</h2><p>This browser or server could not safely match the saved submission. Check My projects. If its outcome is still unclear, contact IDEALAB support; this form stays blocked until the submission is resolved.</p>
        {recoveryCopies.showSavedCopy && savedCopy && <><p>Copy the saved submission before leaving this page.</p><label htmlFor={`${id}-saved-title`}>Saved submission title</label><input id={`${id}-saved-title`} readOnly value={savedCopy.title} /><label htmlFor={`${id}-saved-description`}>Saved submission description</label><textarea id={`${id}-saved-description`} readOnly rows={5} value={savedCopy.description} /><p>Saved visibility: {savedCopy.visibility}</p></>}
        {recoveryCopies.showDraft && <><p>{recoveryCopies.savedCopyMatchesDraft ? 'Your saved details are shown here for copying.' : 'Copy your entered details before leaving this page. They are kept here only while this page remains open.'}</p><label htmlFor={`${id}-copy-title`}>Your title</label><input id={`${id}-copy-title`} readOnly value={title} /><label htmlFor={`${id}-copy-description`}>Your description</label><textarea id={`${id}-copy-description`} readOnly rows={5} value={description} /><p>Visibility: {visibility}</p></>}
        {intent.status === 'unresolved' && <button type="button" className="button" disabled={sending} onClick={() => recover(intent.commandId)}>Check server submission</button>}
        {markers.map(marker => <button key={marker} type="button" className="button" disabled={sending} onClick={() => recover(marker)}>Check saved submission {marker.slice(0, 8)}</button>)}
      </section>
      : <form method="post" onSubmit={event => { event.preventDefault(); void create(new FormData(event.currentTarget)); }}><fieldset disabled={sending}>
        <legend>Start with the idea.</legend>
        <label htmlFor={`${id}-title`}>Project title</label><input id={`${id}-title`} name="title" required maxLength={320} value={title} onChange={event => setTitle(event.target.value)} />
        <label htmlFor={`${id}-description`}>What are you building?</label><textarea id={`${id}-description`} name="description" required rows={5} maxLength={8000} value={description} onChange={event => setDescription(event.target.value)} /><p className="small-copy">Avoid contact details and other sensitive information.</p>
        <label htmlFor={`${id}-visibility`}>Who can discover it?</label><select id={`${id}-visibility`} name="visibility" value={visibility} onChange={event => setVisibility(event.target.value)}><option value="private">Private — project team only</option><option value="public">Public — signed-in members can discover it</option></select>
        <p className="small-copy">A code only starts a join request. You approve who joins. Profile privacy permissions are still being validated before member rollout.</p>
      </fieldset><button type="submit" className="button button-primary" disabled={sending || generation === null}>{sending ? 'Saving…' : 'Create project'}</button></form>}
    {message && <p ref={feedback} tabIndex={-1} role="alert" className="project-feedback">{message}</p>}
    {confirmed && <Link className="button" href={`/app/projects/${confirmed}`}>Open saved project</Link>}
    <noscript><p>Turn on JavaScript to safely save and retry a project submission.</p></noscript>
    <p className="small-copy"><Link href="/app/projects?view=mine">Check My projects</Link>. Saved retry details stay in this browser; avoid using a shared device.</p>
  </div>;
}
