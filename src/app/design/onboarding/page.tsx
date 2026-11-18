import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { OnboardingPreviewForm } from '@/features/onboarding/onboarding-preview-form';
import { ProfileSetupForm } from '@/components/profile-setup-form';
import { buildProfileSavePayload, type ProfileSaveState } from '@/features/profile/profile-save';
import type { OwnProfile } from '@/lib/member-profile';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Student onboarding design preview',
  robots: { index: false, follow: false },
};

const sampleProfile: OwnProfile = {
  id: '00000000-0000-4000-8000-000000000001',
  name: '', phone: null, college_roll: null, institution: null,
  department: null, study_year: null, role: 'student', is_active: true,
  profile_completed: false, profile_contract_version: 1,
  profile_revision: '0', mec_admitted: false,
};

async function checkSampleProfile(_state: ProfileSaveState, fields: FormData): Promise<ProfileSaveState> {
  'use server';
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  const input = buildProfileSavePayload(fields);
  if (!input.ok) return input.state;
  return { status: 'saved', message: 'Preview check complete. Nothing was sent to the database.', revision: '0' };
}

export default async function OnboardingDesignPreview({ searchParams }: {
  searchParams: Promise<{ layout?: string | string[] }>;
}) {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  if ((await searchParams).layout === 'wizard') {
    return <main id="main-content" className="auth-page account-setup-page">
      <div className="auth-toolbar"><Link className="text-link" href="/design/onboarding"><ArrowLeft size={18} aria-hidden="true" /> Onboarding preview</Link><ThemePicker /></div>
      <section className="account-setup-card" aria-labelledby="wizard-preview-title">
        <header className="account-setup-intro"><h1 id="wizard-preview-title">Profile setup preview</h1></header>
        <ProfileSetupForm profile={sampleProfile} action={checkSampleProfile} />
        <p className="account-setup-next-note">Use sample details only. This preview does not save a profile.</p>
      </section>
    </main>;
  }

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
          <p>These six profile details are intended for the account owner, but shared database privacy permissions still need validation. Study information does not grant a lab role or staff permission. Current study year is a separate choice, even for lateral entry.</p>
          <div className="onboarding-preview-safety"><ShieldCheck size={21} aria-hidden="true" /><p>Preview only. Use sample details; this page does not send or save anything.</p></div>
        </aside>

        <section className="onboarding-preview-card" aria-labelledby="onboarding-form-title">
          <div className="onboarding-preview-card-heading">
            <p className="eyebrow">REQUIRED PROFILE</p>
            <h2 id="onboarding-form-title">Your details</h2>
            <p>Use sample details to try the layout and basic format feedback. The registration examples are not an exhaustive official course or number-format catalog.</p>
          </div>
          <OnboardingPreviewForm />
          <Link className="text-link" href="/design/onboarding?layout=wizard">Try the step-by-step setup <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </section>
      </div>
      <section className="onboarding-next-profile" aria-labelledby="onboarding-next-profile-title">
        <span className="workspace-pixel-label">AFTER THE MEC ACCOUNT</span>
        <div><h2 id="onboarding-next-profile-title">Keep building your profile.</h2><p>Review the required private MEC details first. Optional interests, social links and portfolio history are separate profile sections; saving those needs more shared-backend support.</p></div>
        <Link className="button button-primary" href="/design/member-profile-edit">Preview profile sections <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </section>
    </main>
  );
}
