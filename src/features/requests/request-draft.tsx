'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import './request-draft.css';
import { sampleCatalog } from './sample-catalog';

type Draft = { kind: 'machine' | 'operations'; serviceId: string; title: string; details: string; preferredTime: string };
const emptyDraft: Draft = { kind: 'machine', serviceId: '', title: '', details: '', preferredTime: '' };
function validDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false;
  const item = value as Draft;
  return ['machine', 'operations'].includes(item.kind) && typeof item.serviceId === 'string' && (item.serviceId === '' || sampleCatalog[item.kind].some(service => service.id === item.serviceId)) && typeof item.title === 'string' && item.title.length <= 120 && typeof item.details === 'string' && item.details.length <= 5000 && typeof item.preferredTime === 'string' && item.preferredTime.length <= 32;
}

export function RequestDraft({ accountId }: { accountId: string }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const initialRender = useRef(true);
  useEffect(() => {
    if (initialRender.current) { initialRender.current = false; return; }
    const heading = formRef.current?.querySelector<HTMLElement>('h2, legend');
    if (heading) { heading.tabIndex = -1; heading.focus(); }
  }, [step]);
  const key = `idealab-mec:request-draft:v1:${accountId}`;
  const update = (field: keyof Draft, value: string) => { setDraft(previous => ({ ...previous, [field]: value, ...(field === 'kind' ? { serviceId: '' } : {}) })); setNotice(''); };
  function save() {
    try { localStorage.setItem(key, JSON.stringify({ version: 1, draft })); setNotice('Draft saved on this browser for your account. It has not been sent to the lab.'); }
    catch { setNotice('Your browser couldn’t save this draft. Keep this page open or copy your text before leaving.'); }
  }
  function restore() {
    try {
      const value = localStorage.getItem(key);
      if (!value) { setNotice('No saved draft was found for this account in this browser.'); return; }
      const stored = JSON.parse(value);
      if (stored.version !== 1 || !validDraft(stored.draft)) { setNotice('The saved draft can’t be opened. Your current text has been kept.'); return; }
      setDraft(stored.draft); setStep(0); setNotice('Saved draft restored. This request has not been submitted.');
    } catch { setNotice('Your browser couldn’t open the saved draft. Your current text has been kept.'); }
  }
  function deleteSaved() {
    try { localStorage.removeItem(key); setNotice('Saved draft deleted from this browser for your account. Text currently on this page has been kept.'); }
    catch { setNotice('Your browser couldn’t delete the saved draft. Please use your browser’s site-data controls if you need to remove it.'); }
  }
  return <section className="request-composer" aria-label="Prepare a work request"><ol className="request-steps" aria-label="Request progress">{['Type', 'Details', 'Review'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><span>{index < step ? <Check size={14} /> : index + 1}</span>{label}</li>)}</ol>
    <p className="notice">This is a browser-only draft. Online submission isn’t connected yet. Saving does not book a machine, notify a head or reserve a time.</p>
    <form ref={formRef} className="form-stack" onSubmit={event => { event.preventDefault(); setNotice(''); setStep(current => Math.min(2, current + 1)); }}>
      {step === 0 && <fieldset><legend>What kind of support do you need?</legend><p>Machine and Operations work are separate requests.</p><div className="request-options">{[{ value: 'machine', title: 'Machine work', description: 'Fabrication support reviewed by the Machine Head.' }, { value: 'operations', title: 'Operations support', description: 'Components, tools and lab support reviewed by Operations.' }].map(option => <label className="request-option" key={option.value}><input type="radio" name="kind" value={option.value} checked={draft.kind === option.value} onChange={() => update('kind', option.value)} /><strong>{option.title}</strong><span>{option.description}</span></label>)}</div></fieldset>}
      {step === 1 && <><h2>Tell us about your idea.</h2><label htmlFor="sample-service">Sample service (optional)</label><select id="sample-service" value={draft.serviceId} onChange={event => update('serviceId', event.target.value)} aria-describedby="catalog-note"><option value="">Choose an example</option>{sampleCatalog[draft.kind].map(service => <option key={service.id} value={service.id}>{service.label}</option>)}</select><p id="catalog-note" className="small-copy">Sample catalog for reviewing the form. These entries do not confirm equipment or service availability.</p><label htmlFor="request-title">Request title</label><input id="request-title" value={draft.title} onChange={event => update('title', event.target.value)} required minLength={5} maxLength={120} placeholder="What would you like help with?" /><label htmlFor="request-details">What do you need?</label><textarea id="request-details" value={draft.details} onChange={event => update('details', event.target.value)} required minLength={20} maxLength={5000} rows={6} aria-describedby="details-help" /><p id="details-help" className="small-copy">Describe your goal, materials and any useful context. Don’t include passwords or private account information.</p><label htmlFor="preferred-time">Preferred time (optional)</label><input id="preferred-time" type="datetime-local" value={draft.preferredTime} onChange={event => update('preferredTime', event.target.value)} /><p className="small-copy">Enter lab local time (India Standard Time). Your head must confirm scheduling. A preferred time is not a reservation.</p></>}
      {step === 2 && <><h2>Review your draft.</h2><dl className="review-list"><dt>Request type</dt><dd>{draft.kind === 'machine' ? 'Machine work' : 'Operations support'}</dd><dt>Sample service</dt><dd>{sampleCatalog[draft.kind].find(service => service.id === draft.serviceId)?.label || 'Not selected'}</dd><dt>Title</dt><dd>{draft.title}</dd><dt>Details</dt><dd>{draft.details}</dd><dt>Preferred time (IST)</dt><dd>{draft.preferredTime.replace('T', ' · ') || 'Not specified'}</dd></dl><p>The service catalog and online review workflow are being connected. Contact the lab team if you need support now.</p><a className="text-link" href="mailto:idealab@mec.ac.in">idealab@mec.ac.in</a></>}
      <div className="button-row">{step > 0 && <button className="button" type="button" onClick={() => { setStep(value => value - 1); setNotice(''); }}><ArrowLeft size={18} /> Back</button>}{step < 2 && <button className="button button-primary" type="submit">Continue <ArrowRight size={18} /></button>}{step === 2 && <button className="button button-primary" type="button" onClick={save}><Save size={18} /> Save draft</button>}</div>
    </form><div className="draft-toolbar"><button className="text-link" type="button" onClick={restore}>Restore saved draft</button>{step !== 2 && <button className="text-link" type="button" onClick={save}>Save for later</button>}<button className="text-link" type="button" onClick={deleteSaved}>Delete saved draft</button></div><p className="small-copy">Local drafts stay in this browser after sign-out. Avoid saving private details on a shared device.</p>{notice && <div className="notice" role="status">{notice}</div>}
  </section>;
}
