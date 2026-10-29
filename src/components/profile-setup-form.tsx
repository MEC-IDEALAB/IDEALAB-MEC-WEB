'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react';
import type { OwnProfile } from '@/lib/member-profile';
import {
  buildProfileSavePayload, initialProfileSaveState, parseProfileSaveResponse,
  profileSaveFieldErrors, profileSaveFields,
  type ProfileSaveField, type ProfileSaveState, type ProfileSaveValues,
} from '@/features/profile/profile-save';

type Props = {
  profile: OwnProfile;
  action: (previous: ProfileSaveState, formData: FormData) => Promise<ProfileSaveState>;
  mode?: 'setup' | 'edit';
};

const labels: Record<ProfileSaveField, string> = {
  name: 'Full name',
  phone: 'Phone number',
  college_roll: 'MEC registration number',
  institution: 'College / institution',
  department: 'Department',
  study_year: 'Current year of study',
};
const reviewLabels: Record<ProfileSaveField, string> = {
  name: 'Name', phone: 'Phone', college_roll: 'Registration',
  institution: 'College', department: 'Department', study_year: 'Study year',
};
const steps: { title: string; label: string; fields: ProfileSaveField[] }[] = [
  { title: 'Your details.', label: 'You', fields: ['name', 'phone'] },
  { title: 'Your studies.', label: 'Studies', fields: ['institution', 'department', 'study_year'] },
  { title: 'Your MEC number.', label: 'Registration', fields: ['college_roll'] },
  { title: 'Looking good?', label: 'Review', fields: [] },
];

/** Reset only for a newly server-loaded account/revision, never after a failure. */
export function ProfileSetupForm(props: Props) {
  return <ProfileSetupFields key={`${props.profile.id}:${props.profile.profile_revision}`} {...props} />;
}

function ProfileSetupFields({ profile, action, mode = 'setup' }: Props) {
  const router = useRouter();
  const prefix = `profile-setup-${useId().replaceAll(':', '')}`;
  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepChanged = useRef(false);
  const focusField = useRef<ProfileSaveField | null>(null);
  const [step, setStep] = useState(0);
  const [reviewReady, setReviewReady] = useState(false);
  const [values, setValues] = useState<ProfileSaveValues>({
    name: profile.name,
    phone: profile.phone ?? '',
    college_roll: profile.college_roll ?? '',
    institution: 'Model Engineering College',
    department: profile.department ?? '',
    study_year: profile.study_year !== null && profile.study_year >= 1 && profile.study_year <= 8 ? String(profile.study_year) : '',
  });
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<ProfileSaveField, boolean>>>({});
  // The completion wizard validates every detail; the server retains its
  // separate versioned full-replacement/partial-save contract.
  const requireComplete = true;
  const errors = profileSaveFieldErrors(values, requireComplete);
  const [state, formAction, pending] = useActionState(async (previous: ProfileSaveState, formData: FormData) => {
    if (Object.keys(profileSaveFieldErrors(values, requireComplete)).length) {
      return { status: 'invalid', message: 'Check the highlighted profile details. Your entries are still here.' } as ProfileSaveState;
    }
    const input = buildProfileSavePayload(formData);
    if (!input.ok) return input.state;
    try {
      return await action(previous, formData);
    } catch {
      // A transport failure cannot establish whether the server committed.
      return parseProfileSaveResponse(null);
    }
  }, initialProfileSaveState);
  const failed = state.status !== 'idle' && state.status !== 'saved';
  const invalidFields = profileSaveFields.filter(field => errors[field]);
  const revision = state.status === 'saved' && state.revision ? state.revision : profile.profile_revision;

  useEffect(() => {
    if (state.status !== 'idle' && state.status !== 'saved') summaryRef.current?.focus();
  }, [state, router]);
  useEffect(() => {
    if (focusField.current) {
      document.getElementById(`${prefix}-${focusField.current}`)?.focus();
      focusField.current = null;
    } else if (stepChanged.current) headingRef.current?.focus();
  }, [step, prefix]);
  useEffect(() => {
    if (step !== steps.length - 1) return;
    // A rapid second click on Next must not land on the newly revealed Submit.
    const ready = window.setTimeout(() => setReviewReady(true), 600);
    return () => window.clearTimeout(ready);
  }, [step]);

  function moveTo(next: number) {
    stepChanged.current = true;
    setReviewReady(false);
    setAttempted(false);
    setStep(next);
  }

  function nextStep() {
    setAttempted(true);
    const firstInvalid = steps[step].fields.find(name => errors[name]);
    if (firstInvalid) {
      document.getElementById(`${prefix}-${firstInvalid}`)?.focus();
      return;
    }
    moveTo(Math.min(step + 1, steps.length - 1));
  }

  function revealField(name: ProfileSaveField) {
    const target = steps.findIndex(item => item.fields.includes(name));
    setTouched(current => ({ ...current, [name]: true }));
    if (target === step) {
      document.getElementById(`${prefix}-${name}`)?.focus();
    } else {
      focusField.current = name;
      moveTo(target);
    }
  }

  const hint = (field: ProfileSaveField) => {
    if (field === 'phone') return 'Include + and your country code.';
    if (field === 'college_roll') return profile.mec_admitted
      ? 'Changing this number needs the separate declaration and claim step. Saving this form does not change your claim.'
      : 'Use your issued MDL or LMDL number. You’ll confirm the student declaration after saving.';
    if (field === 'institution') return 'Preset for the MEC student pilot.';
    if (field === 'study_year') return 'Your current year of study.';
    return undefined;
  };

  function field(fieldName: ProfileSaveField) {
    const fieldId = `${prefix}-${fieldName}`;
    const error = (attempted || touched[fieldName]) ? errors[fieldName] : undefined;
    const hintText = hint(fieldName);
    if (fieldName === 'institution') return <div className="setup-institution" key={fieldName}><input type="hidden" name="institution" value={values.institution} /><span className="eyebrow">College</span><p>{values.institution}</p></div>;
    const describedBy = [hintText ? `${fieldId}-hint` : '', error ? `${fieldId}-error` : ''].filter(Boolean).join(' ') || undefined;
    return <div className="onboarding-field" key={fieldName}>
      <label htmlFor={fieldId}>{labels[fieldName]}{requireComplete && <span aria-hidden="true"> *</span>}</label>
      {fieldName === 'study_year' ? <select
        id={fieldId} name={fieldName} value={values[fieldName]}
        aria-required={requireComplete} aria-invalid={Boolean(error)} aria-describedby={describedBy}
        onBlur={() => setTouched(current => ({ ...current, [fieldName]: true }))}
        onChange={event => setValues(current => ({ ...current, [fieldName]: event.target.value }))}
      >
        <option value="">Not set yet</option>
        {Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Year {index + 1}</option>)}
      </select> : <input
        id={fieldId} name={fieldName} value={values[fieldName]}
        type={fieldName === 'phone' ? 'tel' : 'text'}
        autoComplete={fieldName === 'name' ? 'name' : fieldName === 'phone' ? 'tel' : 'off'}
        autoCapitalize={fieldName === 'college_roll' ? 'off' : undefined}
        spellCheck={fieldName === 'college_roll' ? false : undefined}
        readOnly={fieldName === 'college_roll' && profile.mec_admitted}
        aria-required={requireComplete} aria-invalid={Boolean(error)} aria-describedby={describedBy}
        onBlur={() => setTouched(current => ({ ...current, [fieldName]: true }))}
        onChange={event => setValues(current => ({ ...current, [fieldName]: event.target.value }))}
      />}
      {hintText && <p className="onboarding-field-hint" id={`${fieldId}-hint`}>{hintText}</p>}
      {error && <p className="onboarding-field-error" role="alert" id={`${fieldId}-error`}>{error}</p>}
    </div>;
  }

  return <form className="onboarding-preview-form setup-wizard" action={formAction} noValidate aria-busy={pending}
    aria-describedby={`${prefix}-description`} onSubmit={event => {
      if (pending) { event.preventDefault(); return; }
      if (step < steps.length - 1) { event.preventDefault(); nextStep(); return; }
      if (!reviewReady) { event.preventDefault(); return; }
      setAttempted(true);
      const firstInvalid = profileSaveFields.find(name => errors[name]);
      if (firstInvalid) {
        event.preventDefault();
        moveTo(steps.findIndex(item => item.fields.includes(firstInvalid)));
        setTouched(current => ({ ...current, [firstInvalid]: true }));
      }
    }}>
    <ol className="setup-progress" aria-label={mode === 'edit' ? 'Profile editing progress' : 'Profile setup progress'}>{steps.map((item, index) => <li key={item.label} aria-current={step === index ? 'step' : undefined} data-complete={index < step}>
      <span aria-hidden="true">{index < step ? <Check size={14} /> : `0${index + 1}`}</span><span>{item.label}</span>
    </li>)}</ol>
    <div className="setup-step-heading"><span className="eyebrow">STEP {step + 1} / {steps.length}</span><h2 ref={headingRef} tabIndex={-1} aria-label={`Step ${step + 1} of ${steps.length}: ${steps[step].title}`}>{steps[step].title}</h2></div>
    <p className="setup-private-note" id={`${prefix}-description`}><LockKeyhole size={13} aria-hidden="true" /> Intended for your account. Shared database privacy permissions are still being validated.</p>
    <input type="hidden" name="expected_revision" value={revision} />
    <input type="hidden" name="expected_account" value={profile.id} />
    {failed && <div className="onboarding-error-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby={`${prefix}-errors-title`}>
      <h3 id={`${prefix}-errors-title`}>Your profile needs attention.</h3>
      <p>{state.message}</p>
      {invalidFields.length > 0 && <ul>{invalidFields.map(name => <li key={name}><button type="button" onClick={() => revealField(name)}>{labels[name]}</button></li>)}</ul>}
      {(state.status === 'conflict' || state.status === 'error') && <p>Copy any changes you want to keep before reloading saved details.</p>}
    </div>}
    <div className="setup-step-body">
      {steps.slice(0, 3).map((item, index) => <fieldset key={item.label} className="onboarding-fieldset" hidden={step !== index} disabled={pending}>
        <legend className="sr-only">{item.label}</legend>
        <div className="onboarding-field-grid">{item.fields.map(field)}</div>
      </fieldset>)}
      {step === 3 && <div className="setup-review"><dl>{profileSaveFields.map(name => <div key={name}><dt>{reviewLabels[name]}</dt><dd>{values[name] || 'Not set'}</dd></div>)}</dl><p>{profile.mec_admitted ? 'Review your details, then save your changes.' : 'After saving, you’ll confirm your MEC student declaration.'}</p></div>}
    </div>
    <p role="status" aria-live="polite">{pending ? 'Saving your profile…' : state.status === 'saved' ? state.message : ''}</p>
    <div className="onboarding-preview-actions setup-navigation">
      {step > 0 && <button className="button setup-back" type="button" disabled={pending} onClick={() => moveTo(step - 1)}><ArrowLeft size={16} aria-hidden="true" /> Back</button>}
      {step < steps.length - 1
        ? <button key="next" className="button button-primary setup-next" type="button" disabled={pending} onClick={event => { event.preventDefault(); nextStep(); }}>Next <ArrowRight size={16} aria-hidden="true" /></button>
        : <button key="submit" className="button button-primary setup-next" type="submit" disabled={pending || !reviewReady}>{pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Submit profile'}<Check size={16} aria-hidden="true" /></button>}
      {(state.status === 'conflict' || state.status === 'error') && <button className="button" type="button" disabled={pending} onClick={() => router.refresh()}>Reload saved details</button>}
    </div>
  </form>;
}
