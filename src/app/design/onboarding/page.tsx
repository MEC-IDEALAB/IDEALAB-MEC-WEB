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
        <p>Six profile details for the MEC student pilot. Your college is already filled in.</p>
      </header>

      <div className="onboarding-preview-grid">
        <aside className="onboarding-preview-context" aria-label="Preview information">
          <div className="onboarding-preview-mark" aria-hidden="true">01<span>/01</span></div>
          <h2>A profile for the MEC pilot.</h2>
          <p>The website and app will share one account and the same MEC student admission rules. Students self-declare MEC eligibility and claim one unique registration number. The pilot does not check claims against college records, so the number is not independently verified.</p>
          <p>These six profile details are intended to stay private by default. Study information does not grant a lab role or staff permission. Current study year is a separate choice, even for lateral entry.</p>
          <div className="onboarding-preview-safety"><ShieldCheck size={21} aria-hidden="true" /><p>Preview only. Use sample details; this page does not send or save anything.</p></div>
        </aside>

        <section className="onboarding-preview-card" aria-labelledby="onboarding-form-title">
          <div className="onboarding-preview-card-heading">
            <p className="eyebrow">REQUIRED PROFILE</p>
            <h2 id="onboarding-form-title">Your details</h2>
            <p>Use sample details to try the layout and basic format feedback. The registration examples are not an exhaustive official course or number-format catalog.</p>
          </div>
          <OnboardingPreviewForm />
        </section>
      </div>
    </main>
  );
}
