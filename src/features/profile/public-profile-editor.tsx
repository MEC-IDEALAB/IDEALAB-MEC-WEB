'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { Plus, X, Globe2, LockKeyhole, ArrowUpRight, Share2 } from 'lucide-react';
import { emptyPublicProfile, profilePayloadFromForm, type PublicProfile, type PublicProfilePayload, type PublicProfileState } from './public-profile-contract';
import { PublicProfileContent } from './public-profile-content';
import { ProfileQrCard } from './profile-qr-card';

const interests = ['Robotics', 'AI', 'Electronics', '3D printing', 'CNC', 'Design', 'Art', 'Painting', 'Photography', 'Fitness', 'Music', 'Writing'];
const initialState: PublicProfileState = { status: 'idle', message: '' };
async function unavailableAction(): Promise<PublicProfileState> { return { status: 'error', message: 'Saving is unavailable.' }; }

export function PublicProfileEditor({ initial = emptyPublicProfile, accountId = '', action, preview = false, identity, defaultOpen = false, showCard = true }: {
  initial?: PublicProfile; accountId?: string; preview?: boolean;
  identity?: { name: string; detail: string };
  defaultOpen?: boolean;
  showCard?: boolean;
  action?: (previous: PublicProfileState, form: FormData) => Promise<PublicProfileState>;
}) {
  const id = useId();
  const [state, submit, pending] = useActionState(action ?? unavailableAction, initialState);
  const [review, setReview] = useState<PublicProfilePayload | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);
  function clearReview() {
    setReview(null);
    setReviewError('');
    setPreviewConfirmed(false);
  }
  function reviewDraft(form: HTMLFormElement) {
    const parsed = profilePayloadFromForm(new FormData(form));
    if (!parsed || !parsed.payload.display_name || !parsed.payload.bio || parsed.payload.interests.length === 0) {
      setReviewError('Add a display name, bio and at least one interest. Check the format of any links.');
      return;
    }
    setReview(parsed.payload);
    setReviewError('');
  }
  const [visibility, setVisibility] = useState(initial.visibility);
  const [displayName, setDisplayName] = useState(initial.display_name ?? '');
  const [bio, setBio] = useState(initial.bio);
  const [selected, setSelected] = useState(initial.interests);
  const [custom, setCustom] = useState('');
  const [skills, setSkills] = useState(initial.skills.join(', '));
  const [links, setLinks] = useState(initial.links.length ? initial.links : [{ label: '', url: '' }]);
  const [feedback, setFeedback] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');
  const revision = state.status === 'saved' && state.profile ? state.profile.revision : initial.revision;
  const persistedProfile = state.profile ?? initial;
  const sharePath = !preview && persistedProfile.initialized && persistedProfile.visibility === 'public'
    && visibility === 'public' && persistedProfile.public_id ? `/people/${persistedProfile.public_id}` : null;
  const cardPath = preview ? '/design/member-space?screen=profile' : sharePath;
  async function copyProfileLink() {
    if (!sharePath) return;
    try {
      await navigator.clipboard.writeText(new URL(sharePath, window.location.href).toString());
      setShareFeedback('Public profile link copied. Anyone with the link can view it.');
    } catch { setShareFeedback('Copy is unavailable here. Open your public profile and copy its address.'); }
  }
  function toggle(interest: string) {
    clearReview();
    if (selected.includes(interest)) setSelected(selected.filter(item => item !== interest));
    else if (selected.length < 20) { setSelected([...selected, interest]); setFeedback(''); }
    else setFeedback('Choose up to 20 interests. Remove one before adding another.');
  }
  function addInterest() {
    const value = custom.trim();
    if (!value || [...value].length > 32) { setFeedback('Enter an interest with 1–32 characters.'); return; }
    if (selected.some(item => item.toLocaleLowerCase('en-US') === value.toLocaleLowerCase('en-US'))) { setFeedback('That interest is already selected.'); return; }
    toggle(value); setCustom('');
  }
  return <section className="public-profile-editor public-profile-editor--member" aria-label="Profile card and sharing settings">
    {showCard && <ProfileQrCard path={cardPath} preview={preview} memberName={identity?.name} memberDetail={identity?.detail} />}
    {state.status === 'saved' && <p className="profile-save-feedback" role="status">{state.message}</p>}
    <details className="profile-edit-panel profile-editor-disclosure" open={defaultOpen}>
      <summary>Edit optional profile</summary>
    <form action={preview ? undefined : submit} method={preview ? 'dialog' : undefined} aria-busy={pending} onChange={preview ? clearReview : undefined}
      onSubmit={preview ? event => {
        event.preventDefault();
        reviewDraft(event.currentTarget);
      } : undefined}>
      <input type="hidden" name="expected_account" value={accountId} /><input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="interests" value={JSON.stringify(selected)} /><input type="hidden" name="skills" value={JSON.stringify(skills.split(',').map(value => value.trim()).filter(Boolean))} />
      <input type="hidden" name="links" value={JSON.stringify(links.filter(link => link.label.trim() || link.url.trim()).map(link => ({ label: link.label.trim(), url: link.url.trim() })))} />
      {preview ? <div id="profile-settings" className="profile-visibility-note profile-visibility-note--private">
        <LockKeyhole size={24} aria-hidden="true" />
        <div><strong>Private draft</strong><p>Review the fields anyone with your link could see before publishing.</p></div>
        <input type="hidden" name="visibility" value="private" />
      </div> : <>
      <div id="profile-settings" className={`profile-visibility-note profile-visibility-note--${visibility}`}>
        {visibility === 'public' ? <Globe2 size={24} aria-hidden="true" /> : <LockKeyhole size={24} aria-hidden="true" />}
        <div><strong>{visibility === 'public' ? 'Public when you save' : 'Private when you save'}</strong><p>{visibility === 'public' ? 'Anyone with your profile link can read the details you enter here.' : 'Your optional profile is hidden from public readers.'} Your account email, phone and MEC registration are never added automatically.</p></div>
      </div>
      <label htmlFor={`${id}-visibility`}>Who can see this profile?</label><select id={`${id}-visibility`} name="visibility" value={visibility} onChange={event => setVisibility(event.target.value as 'public' | 'private')}><option value="public">Public — anyone with the link</option><option value="private">Private — only me</option></select></>}
      <label htmlFor={`${id}-name`}>Name to share {!preview && <span>(optional)</span>}</label><input id={`${id}-name`} name="display_name" autoComplete="nickname" value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} aria-describedby={`${id}-name-help`} /><p id={`${id}-name-help`} className="profile-field-help">{preview ? 'Enter the display name that should appear in the public preview.' : 'Use the same name if you like. Leaving this blank shows a generic member label; it never copies your private account name.'}</p>
      <label htmlFor={`${id}-bio`}>A little about you</label><textarea id={`${id}-bio`} name="bio" value={bio} onChange={event => setBio(event.target.value)} maxLength={1000} rows={4} aria-describedby={`${id}-bio-help`} /><p id={`${id}-bio-help`} className="profile-field-help">Up to 1,000 characters. Keep phone numbers, registration details and other private information out of public text.</p>
      <fieldset id="interests"><legend>Pick your interests</legend><p>Technical, creative or something else. These are self-selected interests, not verified skills or machine permissions.</p>
        <div className="profile-interest-chips">{[...new Set([...interests, ...selected])].map(interest => <button type="button" key={interest} aria-pressed={selected.includes(interest)} onClick={() => toggle(interest)}>{interest}{selected.includes(interest) && <X size={14} aria-hidden="true" />}</button>)}</div>
        <label htmlFor={`${id}-interest`}>Add your own interest</label><div className="profile-add-interest"><input id={`${id}-interest`} value={custom} maxLength={32} onChange={event => setCustom(event.target.value)} /><button className="button" type="button" onClick={addInterest}><Plus size={18} aria-hidden="true" /> Add</button></div><p role="status" className="profile-field-help">{feedback || `${selected.length} of 20 interests selected.`}</p>
      </fieldset>
      <label htmlFor={`${id}-skills`}>Skills you want to share</label><input id={`${id}-skills`} value={skills} onChange={event => setSkills(event.target.value)} maxLength={1000} aria-describedby={`${id}-skills-help`} /><p className="profile-field-help" id={`${id}-skills-help`}>Separate with commas. Up to 20 skills, 48 characters each. These are your own descriptions.</p>
      <fieldset id="social-links"><legend>Your links</legend><p>Up to eight HTTPS links: GitHub, LinkedIn, a portfolio or another page you want to share.</p>{links.map((link, index) => <div className="profile-link-row" key={index}>
        <div><label htmlFor={`${id}-link-label-${index}`}>Label {index + 1}</label><input id={`${id}-link-label-${index}`} value={link.label} maxLength={60} onChange={event => setLinks(links.map((item, position) => position === index ? { ...item, label: event.target.value } : item))} /></div>
        <div><label htmlFor={`${id}-link-url-${index}`}>URL {index + 1}</label><input id={`${id}-link-url-${index}`} value={link.url} type="url" inputMode="url" maxLength={2048} placeholder="https://" onChange={event => setLinks(links.map((item, position) => position === index ? { ...item, url: event.target.value } : item))} /></div>
        <button className="profile-remove-link" type="button" aria-label={`Remove link ${index + 1}`} onClick={() => { clearReview(); setLinks(links.filter((_, position) => position !== index)); }}><X size={20} aria-hidden="true" /></button>
      </div>)}{links.length < 8 && <button className="button" type="button" onClick={() => setLinks([...links, { label: '', url: '' }])}><Plus size={18} aria-hidden="true" /> Add link</button>}</fieldset>
      {state.message && <p role={state.status === 'error' || state.status === 'conflict' ? 'alert' : 'status'} className="profile-save-feedback">{state.message}</p>}
      <div className="profile-editor-actions"><button ref={reviewButton} className="button button-primary" type={preview ? "button" : "submit"} onClick={preview ? event => { if (event.currentTarget.form) reviewDraft(event.currentTarget.form); } : undefined} disabled={pending || state.status === 'conflict'}>{pending ? 'Saving…' : preview ? 'Review local draft' : visibility === 'public' ? 'Save public profile' : 'Save private profile'}<ArrowUpRight size={18} aria-hidden="true" /></button>
        {(state.status === 'error' || state.status === 'conflict') && <button className="button" type="button" onClick={() => { if (window.confirm('Reload saved details? Unsaved edits on this page will be lost.')) window.location.reload(); }}>Reload saved details</button>}</div>
      {reviewError && <p role="alert" className="profile-save-feedback">{reviewError}</p>}
      {preview && review && <section aria-labelledby={id + '-public-review'}>
        <h2 id={id + '-public-review'} ref={reviewHeading} tabIndex={-1}>Public profile preview</h2>
        <PublicProfileContent profile={review} preview />
        <div className="profile-editor-actions">
          <button className="button" type="button" onClick={() => { clearReview(); reviewButton.current?.focus(); }}>Back to editing</button>
          <button className="button button-primary" type="button" disabled={previewConfirmed} onClick={() => setPreviewConfirmed(true)}>Publish preview</button>
        </div>
        {previewConfirmed && <p role="status">This is a local design draft. No account or database has been changed.</p>}
      </section>}
      {sharePath && <div className="profile-share-actions" aria-label="Public profile link"><a className="button" href={sharePath}>Open public profile <ArrowUpRight size={18} aria-hidden="true" /></a><button className="button" type="button" onClick={copyProfileLink}><Share2 size={18} aria-hidden="true" /> Copy profile link</button><p role="status" className="profile-field-help">{shareFeedback || 'Your optional profile is public. Phone, email and MEC registration remain private.'}</p></div>}
    </form>
    </details>
  </section>;
}
