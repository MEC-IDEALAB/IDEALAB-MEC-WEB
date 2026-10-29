'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import './request-draft.css';
import { sampleCatalog } from './sample-catalog';
import { requestServices, isRequestService } from './request-services';
import { deleteSavedDraft, DraftData, DraftStorageScope, readSavedDraft, referenceError, saveDraft } from './draft-storage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { changeWorkRequest, findConfirmedSubmission } from '@/app/app/requests/actions';
import { draftIntake,type IntakeState } from './work-request-command';
import { clearConfirmedMarker, clearPending, markPending, preparePending, readPending, recoverableMarkers, type PendingSubmission } from './pending-submission';

const emptyDraft: DraftData = { kind: 'machine', serviceId: '', title: '', details: '', preferredTime: '', references: [] };
const referencesToText = (references: string[]) => references.join('\n');
const parseReferenceText = (value: string) => value.split(/\r?\n/).map(reference => reference.trim()).filter(Boolean);
const restoredNotice = (draft: DraftData) => referenceError(draft.references)
  ? 'Saved draft restored. Correct its reference links before saving or continuing.'
  : 'Saved browser draft restored. If you previously submitted it, check request history before submitting again.';

export function RequestDraft({ accountId, restoreOnOpen = false, returnHref, storageScope = 'local', onlineCommandId }: { accountId: string; restoreOnOpen?: boolean; returnHref?: string; storageScope?: DraftStorageScope; onlineCommandId?: string }) {
  const router=useRouter();
  const [sending,setSending]=useState(false);
  const [onlineState,setOnlineState]=useState<IntakeState>({status:'idle',message:''});
  const [pendingSubmission,setPendingSubmission]=useState<PendingSubmission|null>(null);
  const currentAccount=useRef<string|null>(accountId);
  useLayoutEffect(() => { currentAccount.current = accountId; return () => { currentAccount.current = null; }; }, [accountId]);
  const [journalUnavailable,setJournalUnavailable]=useState(false);
  const [recoveryMarkers,setRecoveryMarkers]=useState<string[]>([]);
  const onlineFeedback=useRef<HTMLDivElement>(null);
  const [commandId]=useState(onlineCommandId);
  const [draft, setDraft] = useState<DraftData>(emptyDraft);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState('');
  const [referenceErrorMessage, setReferenceErrorMessage] = useState('');
  const [referencesValue, setReferencesValue] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const referencesRef = useRef<HTMLTextAreaElement>(null);
  const serviceRef = useRef<HTMLSelectElement>(null);
  const focusReferenceAfterStep = useRef(false);
  const preview = storageScope === 'memory';
  const online=Boolean(commandId)&&!preview;
  useEffect(() => {
    if (!online) return;
    let active = true;
    void readPending(accountId).then(result => {
      if (!active) return;
      setJournalUnavailable(result.status === 'unavailable');
      setRecoveryMarkers(result.status === 'unavailable' ? recoverableMarkers(accountId) : []);
      setPendingSubmission(result.status === 'ready' ? result.pending : null);
    });
    return () => { active = false; };
  }, [accountId, online]);
  const catalog = preview ? sampleCatalog : requestServices;
  const legacySample = !preview && draft.serviceId !== '' && !isRequestService(draft.kind,draft.serviceId);
  const initialRender = useRef(true);
  useLayoutEffect(() => {
    if (initialRender.current) { initialRender.current = false; return; }
    if (step === 1 && focusReferenceAfterStep.current) {
      focusReferenceAfterStep.current = false;
      referencesRef.current?.focus();
      return;
    }
    const heading = formRef.current?.querySelector<HTMLElement>('h2, legend');
    if (heading) { heading.tabIndex = -1; heading.focus(); }
  }, [step]);
  useEffect(() => {
    if (!restoreOnOpen) return;
    queueMicrotask(() => {
      const result = readSavedDraft(accountId, undefined, storageScope);
      if (result.status === 'found') { setDraft(result.draft); setReferencesValue(referencesToText(result.draft.references)); setNotice(restoredNotice(result.draft)); }
      else if (result.status === 'empty') setNotice(`No saved draft was found in ${storageScope === 'memory' ? 'this preview session' : 'this browser'}.`);
      else if (result.status === 'invalid') setNotice('The saved draft can’t be opened. Your current text has been kept.');
      else setNotice('Your browser couldn’t open the saved draft. Your current text has been kept.');
    });
  }, [accountId, restoreOnOpen, storageScope]);
  const update = (field: 'serviceId' | 'title' | 'details' | 'preferredTime' | 'technicalDetails', value: string) => { setDraft(previous => ({ ...previous, [field]: value })); setNotice(''); };
  useEffect(()=>{if(onlineState.status!=='idle')onlineFeedback.current?.focus();},[onlineState]);
  async function sendPending(pending:PendingSubmission){
    if(currentAccount.current!==pending.accountId)return;
    if(!markPending(pending)){setJournalUnavailable(true);setRecoveryMarkers(recoverableMarkers(accountId));setOnlineState({status:'error',message:'This browser could not save a retry marker. No new attempt was sent; an earlier attempt may still have been saved.'});return;}
    const form=new FormData();form.set('request_action','submit');form.set('expected_account',accountId);form.set('command_id',pending.commandId);form.set('intake',JSON.stringify(pending.intake));
    try{
      const result=await changeWorkRequest(form);if(currentAccount.current!==pending.accountId)return;setOnlineState(result);
      if(result.status==='saved'&&result.requestId){
        const cleared=await clearPending(accountId,pending.commandId);
        if(currentAccount.current!==pending.accountId)return;
        if(cleared)setPendingSubmission(null);
        router.push(`/app/requests/${result.requestId}`);
      }
    }catch{if(currentAccount.current===pending.accountId)setOnlineState({status:'error',message:'We couldn’t confirm submission. Check request history, then retry the saved submission with the same command.'});}
  }
  async function submitOnline(){
    if(!online||sending||onlineState.status==='saved')return;
    const data=draftIntake(draft);
    if(!data){setOnlineState({status:'error',message:'Check the service, title, description, optional technical details, IST time and links.'});return;}
    setSending(true);
    try{
      const result=await preparePending(accountId,commandId!,data);
      if(currentAccount.current!==accountId)return;
      if(result.status==='unavailable'){setJournalUnavailable(true);setRecoveryMarkers(recoverableMarkers(accountId));setOnlineState({status:'error',message:'This browser could not safely save the submission for retry. No new attempt was sent; check history for any earlier attempt.'});return;}
      setJournalUnavailable(false);setPendingSubmission(result.pending);
      if(JSON.stringify(result.pending.intake)!==JSON.stringify(data)){setOnlineState({status:'error',message:'An earlier submission is still unresolved. Check its history or retry the saved submission before sending a different request.'});return;}
      await sendPending(result.pending);
    }
    finally{setSending(false);}
  }
  async function retryPending(){
    if(sending)return;
    setSending(true);
    try{
      const result=await readPending(accountId);
      if(currentAccount.current!==accountId)return;
      if(result.status!=='ready'){setJournalUnavailable(result.status==='unavailable');setRecoveryMarkers(result.status==='unavailable'?recoverableMarkers(accountId):[]);setPendingSubmission(null);setOnlineState({status:'error',message:'The saved submission could not be opened. Check request history before continuing.'});return;}
      setPendingSubmission(result.pending);await sendPending(result.pending);
    }finally{setSending(false);}
  }
  async function resolveMarker(marker:string){
    if(sending)return;
    setSending(true);
    try{
      const requestId=await findConfirmedSubmission(accountId,marker);
      if(currentAccount.current!==accountId)return;
      if(!requestId){setOnlineState({status:'error',message:'The earlier submission is not yet confirmed. Check request history and try again later; it may still be in progress.'});return;}
      const cleared=await clearConfirmedMarker(accountId,marker);
      if(currentAccount.current!==accountId)return;
      if(!cleared){setOnlineState({status:'error',message:'A saved request was found, but this browser could not safely clear its marker. Open your request history.'});return;}
      router.push(`/app/requests/${requestId}`);
    }catch{if(currentAccount.current===accountId)setOnlineState({status:'error',message:'We could not confirm the earlier submission. Check request history and try again later.'});}
    finally{setSending(false);}
  }
  const updateReferences = (value: string) => {
    setReferencesValue(value);
    const references = parseReferenceText(value);
    setDraft(previous => ({ ...previous, references }));
    if (referenceErrorMessage) setReferenceErrorMessage(referenceError(references) ?? '');
  };
  const focusReferenceField = () => {
    if (step !== 1) {
      focusReferenceAfterStep.current = true;
      setStep(1);
      return;
    }
    referencesRef.current?.focus();
    // Let the browser finish its native submit-button focus before moving to the error.
    window.setTimeout(() => referencesRef.current?.focus(), 0);
  };
  function save() {
    const issue = referenceError(draft.references);
    if (issue) { setReferenceErrorMessage(issue); focusReferenceField(); setNotice('Fix the reference links before saving.'); return; }
    const result = saveDraft(accountId, draft, undefined, storageScope);
    if (result === 'saved') setNotice(storageScope === 'memory' ? 'Draft saved for this preview session. It has not been sent to the lab.' : 'Draft saved on this browser. Saving does not submit it. If you previously submitted this request, check request history before submitting again.');
    else if (result === 'invalid') setNotice('This draft can’t be saved in its current format. Your text has been kept on this page.');
    else setNotice('Your browser couldn’t save this draft. Keep this page open or copy your text before leaving.');
  }
  function restore() {
    const result = readSavedDraft(accountId, undefined, storageScope);
    if (result.status === 'found') { setDraft(result.draft); setReferencesValue(referencesToText(result.draft.references)); setStep(0); setReferenceErrorMessage(''); setNotice(restoredNotice(result.draft)); }
    else if (result.status === 'empty') setNotice(`No saved draft was found in ${storageScope === 'memory' ? 'this preview session' : 'this browser'}.`);
    else if (result.status === 'invalid') setNotice('The saved draft can’t be opened. Your current text has been kept.');
    else setNotice('Your browser couldn’t open the saved draft. Your current text has been kept.');
  }
  function deleteSaved() {
    if (deleteSavedDraft(accountId, undefined, storageScope)) setNotice(storageScope === 'memory' ? 'Preview draft deleted. Text currently on this page has been kept.' : 'Saved draft deleted from this browser for your account. Text currently on this page has been kept.');
    else setNotice('Your browser couldn’t delete the saved draft. Please use your browser’s site-data controls if you need to remove it.');
  }
  return <section className="request-composer" aria-label="Prepare a work request">
    <ol className="request-steps" aria-label="Request progress">{['Type', 'Details', 'Review'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><span>{index < step ? <Check size={14} /> : index + 1}</span>{label}</li>)}</ol>
    <p className="notice">{online?'Isolated request test: Submit saves a private record in the test database. No head is notified and staff review is not connected. Save draft only saves on this device. Neither action reserves time, stock or a machine.':'This is a browser-only draft. Online submission isn’t connected yet. Saving does not book a machine, notify a head or reserve a time.'}</p>
    {online&&pendingSubmission?.accountId===accountId&&<div className="notice" role="status"><strong>Earlier submission needs confirmation: {pendingSubmission.intake.title}</strong><p>It may already be saved. Check your request history or retry the exact saved submission. A different request cannot be submitted until this one is confirmed.</p><details><summary>Review saved submission</summary><dl className="review-list"><dt>Type</dt><dd>{pendingSubmission.intake.kind}</dd><dt>Service</dt><dd>{requestServices[pendingSubmission.intake.kind].find(service=>service.id===pendingSubmission.intake.service_id)?.label ?? pendingSubmission.intake.service_id}</dd><dt>Description</dt><dd>{pendingSubmission.intake.description}</dd><dt>Technical details</dt><dd>{pendingSubmission.intake.technical_details || 'Not specified'}</dd><dt>Preferred time</dt><dd>{pendingSubmission.intake.preferred_at ? new Date(pendingSubmission.intake.preferred_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST' : 'Not specified'}</dd><dt>Reference links</dt><dd>{pendingSubmission.intake.references.length ? <ul>{pendingSubmission.intake.references.map(reference=><li key={reference}><a href={reference} target="_blank" rel="noreferrer">{reference}</a></li>)}</ul> : 'None'}</dd></dl></details><Link href="/app/requests">Check request history</Link> <button className="button" type="button" onClick={retryPending} disabled={sending}>Retry saved submission</button></div>}
    {online&&journalUnavailable&&<p className="notice" role="alert">This browser cannot safely open the submission journal. A previous submission may have been saved or browser storage may have changed. Check request history before starting another request.</p>}
    {online&&journalUnavailable&&recoveryMarkers.length>0&&<div className="notice"><p>Check whether the lab test database confirmed an earlier submission. If no receipt is found, the submission remains unresolved.</p>{recoveryMarkers.map((marker,index)=><button className="button" type="button" disabled={sending} key={marker} onClick={()=>resolveMarker(marker)}>Check pending submission {index+1}</button>)}</div>}
    <form ref={formRef} className="form-stack" inert={sending||onlineState.status==='saved'} aria-busy={sending} onSubmit={event => {
      event.preventDefault();
      setNotice('');
      if (step === 1) {
        if (!preview && !isRequestService(draft.kind,draft.serviceId)) {
          setNotice('Choose a service from the current intake list. An older sample choice cannot be used for a new request.');
          serviceRef.current?.focus();
          return;
        }
        const issue = referenceError(draft.references);
        if (issue) { setReferenceErrorMessage(issue); focusReferenceField(); return; }
      }
      setReferenceErrorMessage('');
      setStep(current => Math.min(2, current + 1));
    }}>
      {step === 0 && <fieldset>
        <legend>What kind of support do you need?</legend><p>Machine and Operations work are separate requests.</p>
        <div className="request-options">{[
          { value: 'machine', title: 'Machine work', description: 'Fabrication and machine support.' },
          { value: 'operations', title: 'Operations support', description: 'Components, tools and other lab support.' },
        ].map(option => <label className="request-option" key={option.value}>
          <input type="radio" name="kind" value={option.value} checked={draft.kind === option.value} onChange={() => { setDraft(previous => ({ ...previous, kind: option.value as DraftData['kind'], serviceId: '' })); setNotice(''); }} />
          <strong>{option.title}</strong><span>{option.description}</span>
        </label>)}</div>
      </fieldset>}
      {step === 1 && <>
        <h2>Tell us about your idea.</h2>
        <label htmlFor="sample-service">{preview ? 'Sample service (optional)' : 'Service'}</label>
        <select ref={serviceRef} id="sample-service" required={!preview} value={draft.serviceId} onChange={event => update('serviceId', event.target.value)} aria-describedby="catalog-note">
          <option value="">{preview ? 'Choose an example' : 'Choose a service'}</option>{legacySample && <option value={draft.serviceId}>Previously saved sample — choose a current service</option>}{catalog[draft.kind].map(service => <option key={service.id} value={service.id}>{service.label}</option>)}
        </select>
        <p id="catalog-note" className="small-copy">{preview ? 'Sample catalog for reviewing the form.' : 'Lab intake categories.'} These entries do not confirm equipment, stock, prices or service availability.</p>
        <label htmlFor="request-title">Request title</label>
        <input id="request-title" value={draft.title} onChange={event => update('title', event.target.value)} required minLength={5} maxLength={120} placeholder="What would you like help with?" />
        <label htmlFor="request-details">What do you need?</label>
        <textarea id="request-details" value={draft.details} onChange={event => update('details', event.target.value)} required minLength={20} maxLength={5000} rows={6} aria-describedby="details-help" />
        <p id="details-help" className="small-copy">{draft.kind === 'machine' ? 'Describe your goal. If known, include quantity, material and dimensions; the head can clarify technical details before approval.' : 'Describe the support you need. If known, include the item name, quantity and purpose; stock and prices need Operations confirmation.'} Don’t include passwords or private account information.</p>
        {!preview&&<><label htmlFor="request-technical">Technical details (optional)</label><textarea id="request-technical" value={draft.technicalDetails??''} onChange={event=>update('technicalDetails',event.target.value)} maxLength={2000} rows={3} aria-describedby="request-technical-hint" /><p id="request-technical-hint" className="small-copy">{draft.kind==='machine'?'Quantity, material and dimensions, if known.':'Item name, quantity and purpose, if known.'} Leave blank when you need guidance.</p></>}
        <label htmlFor="preferred-time">Preferred time (optional)</label>
        <input id="preferred-time" type="datetime-local" value={draft.preferredTime} onChange={event => update('preferredTime', event.target.value)} />
        <p className="small-copy">Enter lab local time (India Standard Time). Your head must confirm scheduling. A preferred time is not a reservation.</p>
        <label htmlFor="request-references">Reference links (optional)</label>
        <textarea id="request-references" ref={referencesRef} value={referencesValue} onChange={event => updateReferences(event.target.value)} rows={4} maxLength={10245} aria-invalid={Boolean(referenceErrorMessage)} aria-describedby={referenceErrorMessage ? 'reference-help reference-error' : 'reference-help'} />
        <p id="reference-help" className="small-copy">Add up to 5 links, one per line. Use http:// or https:// links. Avoid links that reveal private or sensitive information.</p>
        {referenceErrorMessage && <p id="reference-error" className="field-error" role="alert">{referenceErrorMessage}</p>}
      </>}
      {step === 2 && <>
        <h2>Review your draft.</h2>
        <dl className="review-list">
          <dt>Request type</dt><dd>{draft.kind === 'machine' ? 'Machine work' : 'Operations support'}</dd>
          <dt>{preview ? 'Sample service' : 'Service'}</dt><dd>{catalog[draft.kind].find(service => service.id === draft.serviceId)?.label || (legacySample ? 'Previous sample — choose a current service' : 'Not selected')}</dd>
          <dt>Title</dt><dd>{draft.title}</dd><dt>Details</dt><dd>{draft.details}</dd>
          {draft.technicalDetails&&<><dt>Technical details</dt><dd>{draft.technicalDetails}</dd></>}
          <dt>Preferred time (IST)</dt><dd>{draft.preferredTime.replace('T', ' · ') || 'Not specified'}</dd>
          {draft.references.length > 0 && <><dt>Reference links</dt><dd><ul className="reference-list">{draft.references.map(reference => <li key={reference}><a href={reference} target="_blank" rel="noreferrer">{reference}</a></li>)}</ul></dd></>}
        </dl>
        <p>{online?'Submitting saves the entered request and a retry receipt in the isolated test database for this account. No head notification or staff review is connected. Cancellation adds a history event; it does not erase the record. Your preferred time is not agreed or reserved.':'The service catalog and online review workflow are being connected. Contact the lab team if you need support now.'}</p>
        <a className="text-link" href="mailto:idealab@mec.ac.in">idealab@mec.ac.in</a>
      </>}
      <div className="button-row">
        {step > 0 && <button className="button" type="button" onClick={() => { setStep(value => value - 1); setNotice(''); setReferenceErrorMessage(''); }}><ArrowLeft size={18} /> Back</button>}
        {step < 2 && <button className="button button-primary" type="submit">Continue <ArrowRight size={18} /></button>}
        {step === 2 && <button className="button button-primary" type="button" onClick={save}><Save size={18} /> Save draft</button>}
        {step===2&&online&&<button className="button button-primary" type="button" onClick={submitOnline} disabled={sending||onlineState.status==='saved'}>{sending?'Submitting…':'Submit test request'}</button>}
      </div>
    </form>
    {online&&<div className="notice" tabIndex={-1} ref={onlineFeedback} role={onlineState.status==='error'?'alert':'status'}>{onlineState.message}{onlineState.status==='error'&&<p><Link href="/app/requests">Check request history before starting another request</Link>. Your text stays here until you leave.</p>}</div>}
    <div className="draft-toolbar"><button className="text-link" type="button" onClick={restore} disabled={sending}>Restore saved draft</button>{step !== 2 && <button className="text-link" type="button" onClick={save} disabled={sending}>Save for later</button>}<button className="text-link" type="button" onClick={deleteSaved} disabled={sending}>Delete saved draft</button></div>
    <p className="small-copy">{storageScope === 'memory' ? 'Preview drafts stay in page memory and clear on refresh or when you leave the preview.' : 'Local drafts and pending submissions stay in this browser after sign-out. Avoid saving private details on a shared device.'}</p>{notice && <div className="notice" role="status">{notice}</div>}
    {returnHref && <Link className="text-link" href={returnHref}>Return to work requests</Link>}
  </section>;
}
