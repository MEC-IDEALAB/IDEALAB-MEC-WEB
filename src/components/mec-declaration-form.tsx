'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { evaluateOwnProfile, type OwnProfile } from '@/lib/member-profile';
import {
  buildRegistrationClaimPayload, initialRegistrationClaimState,
  parseRegistrationClaimResponse, registrationClaimNumberError,
  type RegistrationClaimState,
} from '@/features/profile/registration-claim';

type Props = {
  profile: OwnProfile;
  action: (previous: RegistrationClaimState, formData: FormData) => Promise<RegistrationClaimState>;
};

/** Staff never receive a student-claim editor. The action must recheck authority. */
export function MecDeclarationForm(props: Props) {
  const result = evaluateOwnProfile([props.profile], props.profile.id);
  if (props.profile.role !== 'student' || (result.profileState !== 'ready' && result.profileState !== 'admission-required')) return null;
  return <MecDeclarationFields key={`${props.profile.id}:${props.profile.profile_revision}`} {...props} />;
}

function MecDeclarationFields({ profile, action }: Props) {
  const router = useRouter();
  const prefix = `mec-declaration-${useId().replaceAll(':', '')}`;
  const summaryRef = useRef<HTMLDivElement>(null);
  const [number, setNumber] = useState(profile.college_roll ?? '');
  const [declaresEligibility, setDeclaresEligibility] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const numberError = registrationClaimNumberError(number);
  const [state, formAction, pending] = useActionState(async (previous: RegistrationClaimState, formData: FormData) => {
    const input = buildRegistrationClaimPayload(formData);
    if (!input.ok) return input.state;
    try { return await action(previous, formData); }
    catch { return parseRegistrationClaimResponse(null); }
  }, initialRegistrationClaimState);
  const failed = state.status !== 'idle' && state.status !== 'claimed';
  const showValidation = attempted || state.status === 'invalid';
  const showNumberError = showValidation && numberError;
  const showDeclarationError = showValidation && !declaresEligibility;
  const reloadSuggested = state.status === 'error' || state.status === 'conflict';

  useEffect(() => {
    if (state.status !== 'idle' && state.status !== 'claimed') summaryRef.current?.focus();
  }, [state]);

  return <form className="onboarding-preview-form" action={formAction} onReset={event => event.preventDefault()} noValidate aria-busy={pending}
    aria-describedby={`${prefix}-purpose`} onSubmit={event => {
      if (pending) { event.preventDefault(); return; }
      setAttempted(true);
    }}>
    <p className="small-copy" id={`${prefix}-purpose`}>The MEC pilot uses your self-declaration and one unique registration claim. It does not check student status or number ownership against college records.</p>
    <p className="small-copy">One MEC registration number belongs to one account. If you already completed onboarding with another email, use Sign out above and sign in to that account.</p>
    <input type="hidden" name="expected_revision" value={state.status === 'claimed' && state.revision ? state.revision : profile.profile_revision} />
    <input type="hidden" name="expected_account" value={profile.id} />
    {failed && <div className="onboarding-error-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby={`${prefix}-error-title`}>
      <h3 id={`${prefix}-error-title`}>Your declaration needs attention.</h3>
      <p>{state.message}</p>
      {(showNumberError || showDeclarationError) && <ul>
        {showNumberError && <li><a href={`#${prefix}-number`}>MEC registration number</a></li>}
        {showDeclarationError && <li><a href={`#${prefix}-checkbox`}>Student declaration</a></li>}
      </ul>}
      {reloadSuggested && <p>Copy the number you want to keep before reloading saved details.</p>}
    </div>}
    <fieldset className="onboarding-fieldset" disabled={pending}>
      <legend>{profile.mec_admitted ? 'Update your registration claim' : 'Your MEC registration'}</legend>
      <div className="onboarding-field-grid"><div className="onboarding-field">
        <label htmlFor={`${prefix}-number`}>MEC registration number <span aria-hidden="true">*</span></label>
        <input id={`${prefix}-number`} name="registration_number" value={number} autoComplete="off"
          autoCapitalize="off" spellCheck={false} required aria-required="true" aria-invalid={Boolean(showNumberError)}
          aria-describedby={`${prefix}-number-hint${showNumberError ? ` ${prefix}-number-error` : ''}`}
          onChange={event => setNumber(event.target.value)} />
        <p className="onboarding-field-hint" id={`${prefix}-number-hint`}>For example MDL24CS219; lateral-entry numbers start with LMDL. These examples do not verify who owns a number.</p>
        {showNumberError && <p className="onboarding-field-error" id={`${prefix}-number-error`}>{numberError}</p>}
      </div></div>
    </fieldset>
    <fieldset className="onboarding-declaration" disabled={pending} aria-describedby={`${prefix}-declaration-note`}>
      <legend>Student declaration</legend>
      <label htmlFor={`${prefix}-checkbox`}>
        <input id={`${prefix}-checkbox`} name="self_declaration" type="checkbox" value="on" checked={declaresEligibility}
          required aria-required="true" aria-invalid={Boolean(showDeclarationError)}
          aria-describedby={showDeclarationError ? `${prefix}-declaration-error ${prefix}-declaration-note` : `${prefix}-declaration-note`}
          onChange={event => setDeclaresEligibility(event.target.checked)} />
        <span>I currently attend Model Engineering College and this registration number was issued to me.</span>
      </label>
      <p id={`${prefix}-declaration-note`}>Confirm this declaration for each claim. {profile.mec_admitted ? 'Your current claim remains in place if the change cannot be saved.' : 'A saved profile alone does not complete this step.'}</p>
      {showDeclarationError && <p className="onboarding-field-error" id={`${prefix}-declaration-error`}>Confirm the student declaration to continue.</p>}
    </fieldset>
    <p role="status" aria-live="polite">{pending ? 'Saving your student declaration…' : state.status === 'claimed' ? state.message : ''}</p>
    <div className="onboarding-preview-actions">
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : profile.mec_admitted ? 'Update registration claim' : 'Confirm student declaration'}</button>
      {reloadSuggested && <button className="button" type="button" disabled={pending} onClick={() => router.refresh()}>Reload saved details</button>}
      <span>Your entry stays on this page until you leave or reload saved details.</span>
    </div>
  </form>;
}
