import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { OnboardingPreviewForm } from '@/features/onboarding/onboarding-preview-form';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Student onboarding design preview',
  robots: { index: false, follow: false },
};

export default function OnboardingDesignPreview() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();

  return (
    <main id="main-content" className="playful-site onboarding-preview-page">
      <div className="auth-toolbar onboarding-preview-toolbar">
        <Link className="text-link" href="/sign-up"><ArrowLeft size={18} aria-hidden="true" /> Back to sign up</Link>
        <ThemePicker />
      </div>

      <header className="onboarding-preview-heading">
        <p className="eyebrow">DESIGN PREVIEW · STUDENT ONBOARDING</p>
        <h1>Tell us a little about yourself.</h1>
        <p>One focused step for the six details the lab needs before a student enters the member space.</p>
      </header>

      <div className="onboarding-preview-grid">
        <aside className="onboarding-preview-context" aria-label="Preview information">
          <div className="onboarding-preview-mark" aria-hidden="true">01<span>/01</span></div>
          <h2>Your account, ready for the lab.</h2>
          <p>In the planned flow, email verification confirms account ownership. These details tell us about your studies and institution; they do not assign a lab role or staff permission.</p>
          <div className="onboarding-preview-safety"><ShieldCheck size={21} aria-hidden="true" /><p>Preview only. Use sample details; this page does not send or save anything.</p></div>
        </aside>

        <section className="onboarding-preview-card" aria-labelledby="onboarding-form-title">
          <div className="onboarding-preview-card-heading">
            <p className="eyebrow">REQUIRED PROFILE</p>
            <h2 id="onboarding-form-title">Your details</h2>
            <p>Planned member flow: complete every field before entering Home.</p>
          </div>
          <OnboardingPreviewForm />
        </section>
      </div>
    </main>
  );
}
