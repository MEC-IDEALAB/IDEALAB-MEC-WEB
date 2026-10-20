'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { deleteSavedDraft, DraftStorageScope, readSavedDraft } from './draft-storage';
import './request-workspace.css';

export function RequestWorkspace({ accountId, composeHref, storageScope = 'local' }: { accountId: string; composeHref: string; storageScope?: DraftStorageScope }) {
  const [saved, setSaved] = useState<ReturnType<typeof readSavedDraft> | null>(null);
  const [notice, setNotice] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const confirmationWasOpen = useRef(false);
  useEffect(() => {
    if (confirmDelete) { keepRef.current?.focus(); confirmationWasOpen.current = true; }
    else if (confirmationWasOpen.current) { checkRef.current?.focus(); confirmationWasOpen.current = false; }
  }, [confirmDelete]);
  useEffect(() => {
    const refresh = () => setSaved(readSavedDraft(accountId, undefined, storageScope));
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [accountId, storageScope]);
  function remove() {
    if (deleteSavedDraft(accountId, undefined, storageScope)) { setSaved({ status: 'empty' }); setNotice(storageScope === 'memory' ? 'Preview draft deleted.' : 'Saved draft deleted from this browser for this account.'); }
    else setNotice('Your browser couldn’t delete this draft. Your saved text has not been changed.');
    setConfirmDelete(false);
  }
  const storagePlace = storageScope === 'memory' ? 'this preview session' : 'this browser';
  return <div className="request-workspace"><section className="draft-panel" aria-labelledby="browser-draft-heading">
    <div className="draft-panel-heading"><FileText size={24} aria-hidden="true" /><h2 id="browser-draft-heading">Saved in {storagePlace}</h2></div>
    <p>{storageScope === 'memory' ? 'One temporary sample draft held in page memory.' : 'One local draft for this account.'} It has not been submitted, booked or sent to a head.</p>
    {!saved && <p role="status">Checking this browser for a saved draft…</p>}
    {saved?.status === 'found' && <><span className="eyebrow">UNSUBMITTED DRAFT</span><h3>{saved.draft.title || 'Untitled work request'}</h3><p>{saved.draft.kind === 'machine' ? 'Machine work' : 'Operations support'}</p>{saved.savedAt && <p className="small-copy">Saved using this device’s clock: <time dateTime={saved.savedAt}>{new Date(saved.savedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</time></p>}<Link className="button button-primary" href={`${composeHref}?restore=1`}>Continue saved draft <ArrowRight size={18} /></Link></>}
    {saved?.status === 'empty' && <><h3>Start with what you have.</h3><p>There is no saved draft for this account in {storagePlace}. Prepare your idea, review it and save it for later.</p><Link className="button button-primary" href={composeHref}>Prepare a work request <ArrowRight size={18} /></Link></>}
    {saved?.status === 'invalid' && <div className="notice"><p>The saved draft can’t be opened. Its stored data has been kept. You can delete it below or prepare a new draft; saving a new draft replaces it.</p><Link className="text-link" href={composeHref}>Prepare a new draft</Link></div>}
    {saved?.status === 'unavailable' && <div className="notice"><p>This browser isn’t allowing access to saved drafts. You can still prepare a request and keep the page open while you work.</p><Link className="text-link" href={composeHref}>Prepare without saving</Link></div>}
    <div className="draft-actions"><button ref={checkRef} type="button" className="text-link" onClick={() => { setSaved(readSavedDraft(accountId, undefined, storageScope)); setNotice('Browser draft checked again.'); }}>Check again</button>{saved && ['found', 'invalid'].includes(saved.status) && !confirmDelete && <button type="button" className="text-link" onClick={() => setConfirmDelete(true)}>Delete browser draft</button>}</div>
    {confirmDelete && <div className="notice" role="group" aria-label="Confirm browser draft deletion"><p>Delete the saved draft for this account from this browser? This cannot be undone.</p><div className="button-row"><button ref={keepRef} type="button" className="button" onClick={() => setConfirmDelete(false)}>Keep draft</button><button type="button" className="button" onClick={remove}>Delete draft permanently</button></div></div>}
    <p className="small-copy">{storageScope === 'memory' ? 'Preview drafts clear on refresh or when you leave the preview.' : 'Local drafts remain after sign-out. Avoid saving private information on a shared device.'}</p>{notice && <p role="status" className="notice">{notice}</p>}
  </section><section className="draft-panel submitted-unavailable" aria-labelledby="submitted-heading"><span className="eyebrow">LAB REQUESTS</span><h2 id="submitted-heading">Submitted requests</h2><p>Online request history and submission are being connected. We can’t check your submitted requests here yet.</p><p>For an existing request or support now, contact the lab team.</p><a className="text-link" href="mailto:idealab@mec.ac.in">idealab@mec.ac.in <ArrowRight size={16} /></a></section></div>;
}
