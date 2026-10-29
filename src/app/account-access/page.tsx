import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { loadMemberAccount } from '@/lib/member';
import { signOut } from '@/app/auth/actions';
import { ThemePicker } from '@/components/theme-picker';
import { ProfileSetupForm } from '@/components/profile-setup-form';
import { saveRequiredProfile, claimMecRegistration } from './actions';
import { MecDeclarationForm } from '@/components/mec-declaration-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your account access', robots: { index: false, follow: false } };

const feedback = {
  unverified: {
    title: 'Confirm your email to continue.',
    text: 'Open the confirmation link sent to your email address, then sign in again.',
  },
  inactive: {
    title: 'Account access is paused.',
    text: 'This account is not currently active. Contact the lab team if you think this is a mistake.',
  },
  incomplete: {
    title: 'Make it yours.',
    text: 'A few details. Then you’re ready for the next step.',
  },
  'admission-required': {
    title: 'Your MEC student declaration is needed.',
    text: 'Your profile also needs a MEC student declaration and an accepted registration-number claim. This pilot uses self-declared eligibility; it does not verify registration ownership against college records.',
  },
  unavailable: {
    title: 'Your profile isn’t available right now.',
    text: 'We couldn’t verify your account profile. Try again shortly. Your saved details haven’t been changed.',
  },
};

export default async function AccountAccess() {
  const account = await loadMemberAccount();
  if (account.profileState === 'ready') redirect('/app');
  const message = feedback[account.profileState];
  return <main id="main-content" className="auth-page account-setup-page">
    <div className="auth-toolbar"><Link className="text-link" href="/"><ArrowLeft size={18} aria-hidden="true" /> IDEALAB MEC</Link><div className="setup-toolbar-actions"><form action={signOut}><input type="hidden" name="expected_account" value={account.user.id} /><button type="submit">Sign out</button></form><ThemePicker /></div></div>
    <section className="account-setup-card" aria-labelledby="access-title">
      <header className="account-setup-intro"><span className="eyebrow">IDEALAB MEC / YOUR ACCOUNT</span>
      <h1 id="access-title">{message.title}</h1>
      <p>{message.text}</p></header>
      {account.profileState === 'incomplete' && <ProfileSetupForm
        key={account.profile.profile_revision}
        profile={account.profile}
        action={saveRequiredProfile}
      />}
      {account.profileState === 'admission-required' && <MecDeclarationForm key={`${account.profile.id}:${account.profile.profile_revision}`} profile={account.profile} action={claimMecRegistration} />}
      {account.profileState === 'admission-required' && <details className="setup-edit-profile"><summary>Edit saved profile</summary><ProfileSetupForm profile={account.profile} action={saveRequiredProfile} mode="edit" /></details>}
      <div className="button-row setup-account-actions">
        {account.profileState === 'unverified'
          ? <Link className="button" href="/sign-in">Back to sign in</Link>
          : account.profileState !== 'incomplete' && account.profileState !== 'admission-required' && <Link className="button" href="/account-access"><RefreshCw size={17} aria-hidden="true" /> Try again</Link>}
        {account.profileState === 'inactive' && <a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a>}
      </div>
    </section>
  </main>;
}
