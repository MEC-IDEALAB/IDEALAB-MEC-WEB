'use client';

import { useLayoutEffect, useRef, useState } from 'react';

const fields = [
  { name: 'name', label: 'Full name', group: 'about' },
  { name: 'phone', label: 'Phone number', type: 'tel', hint: 'Include + and your country code, for example +919876543210. This preview checks the format only.', group: 'about' },
  { name: 'rollNumber', label: 'MEC registration number', hint: 'For example MDL24CS219; lateral-entry numbers use LMDL. Preview format checks do not verify who owns a number.', group: 'about' },
  { name: 'department', label: 'Department', group: 'study' },
  { name: 'year', label: 'Current year of study', options: Array.from({ length: 8 }, (_, index) => `Year ${index + 1}`), group: 'study' },
  { name: 'institution', label: 'College / institution', hint: 'Preset for the MEC student pilot in both the website and app.', readOnly: true, group: 'study' },
] as const;

type FieldName = (typeof fields)[number]['name'];
type Values = Record<FieldName, string>;

const emptyValues: Values = {
  name: '',
  phone: '',
  rollNumber: '',
  department: '',
  year: '',
  institution: 'Model Engineering College',
};

function fieldError(name: FieldName, value: string): string | undefined {
  if (!value.trim()) {
    const label = fields.find(field => field.name === name)!.label;
    return `Enter your ${label.toLowerCase()}.`;
  }
  if (name === 'phone' && !/^\+[1-9]\d{1,14}$/.test(value.trim())) {
    return 'Use + followed by your country code and phone number, with up to 15 digits and no spaces.';
  }
  if (name === 'rollNumber' && !/^(?:MDL|LMDL)[A-Z0-9]+$/i.test(value.trim())) {
    return 'For this format preview, use MDL or LMDL followed by letters or digits, without spaces. The detailed official number and course catalog is unverified.';
  }
}

export function OnboardingPreviewForm() {
  const [values, setValues] = useState<Values>(emptyValues);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [validPreview, setValidPreview] = useState(false);
  const [declaresEligibility, setDeclaresEligibility] = useState(false);
  const [declarationTouched, setDeclarationTouched] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);

  const errors = Object.fromEntries(fields.map(({ name }) => [name, fieldError(name, values[name])])) as Partial<Record<FieldName, string>>;
  const invalidFields = fields.filter(({ name }) => errors[name]);
  const invalidDeclaration = !declaresEligibility;
  const showDeclarationError = (submitted || declarationTouched) && invalidDeclaration;
  const visibleError = (name: FieldName) => submitted || touched[name] ? errors[name] : undefined;

  useLayoutEffect(() => {
    if (focusRequest > 0) summaryRef.current?.focus();
  }, [focusRequest]);

  function checkFields() {
    setSubmitted(true);
    setValidPreview(false);
    if (invalidFields.length || invalidDeclaration) {
      setFocusRequest(request => request + 1);
      return;
    }
    setValidPreview(true);
  }

  return (
    <div
      className="onboarding-preview-form"
      role="group"
      aria-labelledby="onboarding-form-title"
      onKeyDown={event => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type !== 'checkbox') {
          event.preventDefault();
          checkFields();
        }
      }}
    >
      {submitted && (invalidFields.length > 0 || invalidDeclaration) && (
        <div className="onboarding-error-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby="onboarding-errors-title">
          <h3 id="onboarding-errors-title">Check these details.</h3>
          <ul>
            {invalidFields.map(({ name, label }) => <li key={name}><a href={`#onboarding-${name}`}>{label}</a></li>)}
            {invalidDeclaration && <li><a href="#onboarding-mec-declaration">MEC student declaration</a></li>}
          </ul>
        </div>
      )}

      <fieldset className="onboarding-fieldset">
        <legend>About you</legend>
        <div className="onboarding-field-grid">
          {fields.filter(field => field.group === 'about').map(field => <PreviewField key={field.name} field={field} value={values[field.name]} error={visibleError(field.name)} onChange={value => { setValues(current => ({ ...current, [field.name]: value })); setValidPreview(false); }} onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))} />)}
        </div>
      </fieldset>

      <fieldset className="onboarding-fieldset">
        <legend>Your studies</legend>
        <div className="onboarding-field-grid">
          {fields.filter(field => field.group === 'study').map(field => <PreviewField key={field.name} field={field} value={values[field.name]} error={visibleError(field.name)} onChange={value => { setValues(current => ({ ...current, [field.name]: value })); setValidPreview(false); }} onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))} />)}
        </div>
      </fieldset>

      <fieldset className="onboarding-declaration" aria-describedby="onboarding-declaration-note">
        <legend>MEC student declaration</legend>
        <label htmlFor="onboarding-mec-declaration">
          <input
            id="onboarding-mec-declaration"
            type="checkbox"
            checked={declaresEligibility}
            aria-invalid={showDeclarationError}
            aria-describedby={showDeclarationError ? 'onboarding-declaration-error onboarding-declaration-note' : 'onboarding-declaration-note'}
            onBlur={() => setDeclarationTouched(true)}
            onChange={event => { setDeclaresEligibility(event.target.checked); setValidPreview(false); }}
          />
          <span>I confirm that I am currently a Model Engineering College student and this is my MEC registration number.</span>
        </label>
        <p id="onboarding-declaration-note">The pilot relies on this self-declaration and a one-claim-per-number rule. It does not check student status against college records.</p>
        {showDeclarationError && <p className="onboarding-field-error" id="onboarding-declaration-error">Confirm the MEC student declaration to continue this preview.</p>}
      </fieldset>

      {validPreview && <p className="onboarding-preview-result" role="status">Preview check complete. Nothing was sent or saved. The self-declaration was not checked against college records, and registration-number availability was not checked.</p>}
      <div className="onboarding-preview-actions">
        <button className="button button-primary" type="button" onClick={checkFields}>Check preview fields</button>
        <span>Production signup and profile saving remain disabled.</span>
      </div>
    </div>
  );
}

function PreviewField({
  field,
  value,
  error,
  onChange,
  onBlur,
}: {
  field: (typeof fields)[number];
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const errorId = `onboarding-${field.name}-error`;
  const hintId = `onboarding-${field.name}-hint`;
  return (
    <div className="onboarding-field">
      <label htmlFor={`onboarding-${field.name}`}>{field.label}<span aria-hidden="true"> *</span></label>
      {'options' in field ? (
        <select
          id={`onboarding-${field.name}`}
          value={value}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={event => onChange(event.target.value)}
          onBlur={onBlur}
        >
          <option value="">Select your current year</option>
          {field.options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          autoComplete="off"
          id={`onboarding-${field.name}`}
          type={'type' in field ? field.type : 'text'}
          value={value}
          readOnly={'readOnly' in field && field.readOnly}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={[('hint' in field && field.hint) ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          onChange={event => onChange(event.target.value)}
          onBlur={onBlur}
        />
      )}
      {'hint' in field && <p className="onboarding-field-hint" id={hintId}>{field.hint}</p>}
      {error && <p className="onboarding-field-error" id={errorId}>{error}</p>}
    </div>
  );
}
