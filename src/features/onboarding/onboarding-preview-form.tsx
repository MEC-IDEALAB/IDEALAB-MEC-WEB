'use client';

import { useRef, useState } from 'react';

const fields = [
  { name: 'name', label: 'Full name', group: 'about' },
  { name: 'phone', label: 'Phone number', type: 'tel', group: 'about' },
  { name: 'rollNumber', label: 'Roll number', group: 'about' },
  { name: 'department', label: 'Department', group: 'study' },
  { name: 'year', label: 'Current year of study', group: 'study' },
  { name: 'institution', label: 'College / institution', hint: 'Free text. Any institution is welcome; email domain does not verify affiliation.', group: 'study' },
] as const;

type FieldName = (typeof fields)[number]['name'];
type Values = Record<FieldName, string>;

const emptyValues: Values = {
  name: '',
  phone: '',
  rollNumber: '',
  department: '',
  year: '',
  institution: '',
};

export function OnboardingPreviewForm() {
  const [values, setValues] = useState<Values>(emptyValues);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [validPreview, setValidPreview] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const missing = fields.filter(({ name }) => !values[name].trim());
  const showFieldError = (name: FieldName) => Boolean((submitted || touched[name]) && !values[name].trim());

  function checkFields() {
    setSubmitted(true);
    setValidPreview(false);
    if (missing.length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
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
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          checkFields();
        }
      }}
    >
      {submitted && missing.length > 0 && (
        <div className="onboarding-error-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby="onboarding-errors-title">
          <h3 id="onboarding-errors-title">A few details are still missing.</h3>
          <ul>{missing.map(({ name, label }) => <li key={name}><a href={`#onboarding-${name}`}>{label}</a></li>)}</ul>
        </div>
      )}

      <fieldset className="onboarding-fieldset">
        <legend>About you</legend>
        <div className="onboarding-field-grid">
          {fields.filter(field => field.group === 'about').map(field => <PreviewField key={field.name} field={field} value={values[field.name]} invalid={showFieldError(field.name)} onChange={value => { setValues(current => ({ ...current, [field.name]: value })); setValidPreview(false); }} onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))} />)}
        </div>
      </fieldset>

      <fieldset className="onboarding-fieldset">
        <legend>Your studies</legend>
        <div className="onboarding-field-grid">
          {fields.filter(field => field.group === 'study').map(field => <PreviewField key={field.name} field={field} value={values[field.name]} invalid={showFieldError(field.name)} onChange={value => { setValues(current => ({ ...current, [field.name]: value })); setValidPreview(false); }} onBlur={() => setTouched(current => ({ ...current, [field.name]: true }))} />)}
        </div>
      </fieldset>

      {validPreview && <p className="onboarding-preview-result" role="status">Preview check complete. Nothing was sent or saved.</p>}
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
  invalid,
  onChange,
  onBlur,
}: {
  field: (typeof fields)[number];
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const errorId = `onboarding-${field.name}-error`;
  const hintId = `onboarding-${field.name}-hint`;
  return (
    <div className="onboarding-field">
      <label htmlFor={`onboarding-${field.name}`}>{field.label}<span aria-hidden="true"> *</span></label>
      <input
        autoComplete="off"
        id={`onboarding-${field.name}`}
        type={'type' in field ? field.type : 'text'}
        value={value}
        required
        aria-invalid={invalid}
        aria-describedby={[('hint' in field && field.hint) ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ') || undefined}
        onChange={event => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {'hint' in field && <p className="onboarding-field-hint" id={hintId}>{field.hint}</p>}
      {invalid && <p className="onboarding-field-error" id={errorId}>Enter your {field.label.toLowerCase()}.</p>}
    </div>
  );
}
