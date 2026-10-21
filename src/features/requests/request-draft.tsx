'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import './request-draft.css';
import { sampleCatalog } from './sample-catalog';
import { deleteSavedDraft, DraftData, DraftStorageScope, readSavedDraft, referenceError, saveDraft } from './draft-storage';
import Link from 'next/link';

const emptyDraft: DraftData = { kind: 'machine', serviceId: '', title: '', details: '', preferredTime: '', references: [] };
const referencesToText = (references: string[]) => references.join('\n');
const parseReferenceText = (value: string) => value.split(/\r?\n/).map(reference => reference.trim()).filter(Boolean);

export function RequestDraft({ accountId, restoreOnOpen = false, returnHref, storageScope = 'local' }: { accountId: string; restoreOnOpen?: boolean; returnHref?: string; storageScope?: DraftStorageScope }) {
  const [draft, setDraft] = useState<DraftData>(emptyDraft);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState('');
  const [referenceErrorMessage, setReferenceErrorMessage] = useState('');
  const [referencesValue, setReferencesValue] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const referencesRef = useRef<HTMLTextAreaElement>(null);
  const initialRender = useRef(true);
  useLayoutEffect(() => {
    if (initialRender.current) { initialRender.current = false; return; }
    const heading = formRef.current?.querySelector<HTMLElement>('h2, legend');
    if (heading) { heading.tabIndex = -1; heading.focus(); }
  }, [step]);
  useEffect(() => {
    if (!restoreOnOpen) return;
    queueMicrotask(() => {
      const result = readSavedDraft(accountId, undefined, storageScope);
      if (result.status === 'found') { setDraft(result.draft); setReferencesValue(referencesToText(result.draft.references)); setNotice('Saved draft restored. This request has not been submitted.'); }
      else if (result.status === 'empty') setNotice(`No saved draft was found in ${storageScope === 'memory' ? 'this preview session' : 'this browser'}.`);
      else if (result.status === 'invalid') setNotice('The saved draft can’t be opened. Your current text has been kept.');
      else setNotice('Your browser couldn’t open the saved draft. Your current text has been kept.');
    });
  }, [accountId, restoreOnOpen, storageScope]);
  const update = (field: 'serviceId' | 'title' | 'details' | 'preferredTime', value: string) => { setDraft(previous => ({ ...previous, [field]: value })); setNotice(''); };
  const updateReferences = (value: string) => {
    setReferencesValue(value);
    const references = parseReferenceText(value);
    setDraft(previous => ({ ...previous, references }));
    if (referenceErrorMessage) setReferenceErrorMessage(referenceError(references) ?? '');
  };
  const focusReferenceField = () => {
    referencesRef.current?.focus();
    // Let the browser finish its native submit-button focus before moving to the error.
    window.setTimeout(() => referencesRef.current?.focus(), 0);
  };
  function save() {
    const issue = referenceError(draft.references);
    if (issue) { setReferenceErrorMessage(issue); focusReferenceField(); setNotice('Fix the reference links before saving.'); return; }
    const result = saveDraft(accountId, draft, undefined, storageScope);
    if (result === 'saved') setNotice(storageScope === 'memory' ? 'Draft saved for this preview session. It has not been sent to the lab.' : 'Draft saved on this browser for your account. It has not been sent to the lab.');
    else if (result === 'invalid') setNotice('This draft can’t be saved in its current format. Your text has been kept on this page.');
    else setNotice('Your browser couldn’t save this draft. Keep this page open or copy your text before leaving.');
  }
  function restore() {
    const result = readSavedDraft(accountId, undefined, storageScope);
    if (result.status === 'found') { setDraft(result.draft); setReferencesValue(referencesToText(result.draft.references)); setStep(0); setReferenceErrorMessage(''); setNotice('Saved draft restored. This request has not been submitted.'); }
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
    <p className="notice">This is a browser-only draft. Online submission isn’t connected yet. Saving does not book a machine, notify a head or reserve a time.</p>
    <form ref={formRef} className="form-stack" onSubmit={event => {
      event.preventDefault();
      setNotice('');
      if (step === 1) {
        const issue = referenceError(draft.references);
        if (issue) { setReferenceErrorMessage(issue); focusReferenceField(); return; }
      }
      setReferenceErrorMessage('');
      setStep(current => Math.min(2, current + 1));
    }}>
      {step === 0 && <fieldset>
        <legend>What kind of support do you need?</legend><p>Machine and Operations work are separate requests.</p>
        <div className="request-options">{[
          { value: 'machine', title: 'Machine work', description: 'Fabrication support reviewed by the Machine Head.' },
          { value: 'operations', title: 'Operations support', description: 'Components, tools and lab support reviewed by Operations.' },
        ].map(option => <label className="request-option" key={option.value}>
          <input type="radio" name="kind" value={option.value} checked={draft.kind === option.value} onChange={() => { setDraft(previous => ({ ...previous, kind: option.value as DraftData['kind'], serviceId: '' })); setNotice(''); }} />
          <strong>{option.title}</strong><span>{option.description}</span>
        </label>)}</div>
      </fieldset>}
      {step === 1 && <>
        <h2>Tell us about your idea.</h2>
        <label htmlFor="sample-service">Sample service (optional)</label>
        <select id="sample-service" value={draft.serviceId} onChange={event => update('serviceId', event.target.value)} aria-describedby="catalog-note">
          <option value="">Choose an example</option>{sampleCatalog[draft.kind].map(service => <option key={service.id} value={service.id}>{service.label}</option>)}
        </select>
        <p id="catalog-note" className="small-copy">Sample catalog for reviewing the form. These entries do not confirm equipment or service availability.</p>
        <label htmlFor="request-title">Request title</label>
        <input id="request-title" value={draft.title} onChange={event => update('title', event.target.value)} required minLength={5} maxLength={120} placeholder="What would you like help with?" />
        <label htmlFor="request-details">What do you need?</label>
        <textarea id="request-details" value={draft.details} onChange={event => update('details', event.target.value)} required minLength={20} maxLength={5000} rows={6} aria-describedby="details-help" />
        <p id="details-help" className="small-copy">Describe your goal, materials and any useful context. Don’t include passwords or private account information.</p>
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
          <dt>Sample service</dt><dd>{sampleCatalog[draft.kind].find(service => service.id === draft.serviceId)?.label || 'Not selected'}</dd>
          <dt>Title</dt><dd>{draft.title}</dd><dt>Details</dt><dd>{draft.details}</dd>
          <dt>Preferred time (IST)</dt><dd>{draft.preferredTime.replace('T', ' · ') || 'Not specified'}</dd>
          {draft.references.length > 0 && <><dt>Reference links</dt><dd><ul className="reference-list">{draft.references.map(reference => <li key={reference}><a href={reference} target="_blank" rel="noreferrer">{reference}</a></li>)}</ul></dd></>}
        </dl>
        <p>The service catalog and online review workflow are being connected. Contact the lab team if you need support now.</p>
        <a className="text-link" href="mailto:idealab@mec.ac.in">idealab@mec.ac.in</a>
      </>}
      <div className="button-row">
        {step > 0 && <button className="button" type="button" onClick={() => { setStep(value => value - 1); setNotice(''); setReferenceErrorMessage(''); }}><ArrowLeft size={18} /> Back</button>}
        {step < 2 && <button className="button button-primary" type="submit">Continue <ArrowRight size={18} /></button>}
        {step === 2 && <button className="button button-primary" type="button" onClick={save}><Save size={18} /> Save draft</button>}
      </div>
    </form>
    <div className="draft-toolbar"><button className="text-link" type="button" onClick={restore}>Restore saved draft</button>{step !== 2 && <button className="text-link" type="button" onClick={save}>Save for later</button>}<button className="text-link" type="button" onClick={deleteSaved}>Delete saved draft</button></div>
    <p className="small-copy">{storageScope === 'memory' ? 'Preview drafts stay in page memory and clear on refresh or when you leave the preview.' : 'Local drafts stay in this browser after sign-out. Avoid saving private details on a shared device.'}</p>{notice && <div className="notice" role="status">{notice}</div>}
    {returnHref && <Link className="text-link" href={returnHref}>Return to work requests</Link>}
  </section>;
}
