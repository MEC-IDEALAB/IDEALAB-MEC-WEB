import Link from 'next/link';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { saveRequiredProfile, claimMecRegistration } from '@/app/account-access/actions';
import { signOut } from '@/app/auth/actions';
import { MecDeclarationForm } from '@/components/mec-declaration-form';
import { ProfileSetupForm } from '@/components/profile-setup-form';
import { ProfileWorkspaceHeader } from '@/components/workspace-arcade';
import { SubmitButton } from '@/components/submit-button';
import { RecentProjects } from '@/features/projects/recent-projects';
import { MemberLoadingSkeleton } from '@/components/member-loading-skeleton';
import { Suspense } from 'react';
import { publicProfileEnabled } from '@/features/profile/public-profile-config';
import { loadOwnPublicProfile } from '@/features/profile/public-profile-data';
import { PublicProfileEditor } from '@/features/profile/public-profile-editor';
import { savePrivateProfileDraft } from '@/features/profile/public-profile-actions';

export const metadata = { title: 'Edit profile' };

function NotReadySection({ id, number, title, message }: { id: string; number: string; title: string; message: string }) {
  return <section id={id} className="profile-edit-section" aria-labelledby={`${id}-title`}>
    <div className="profile-edit-section-heading"><div><span className="workspace-pixel-label">{number} / PROFILE</span><h2 id={`${id}-title`}>{title}</h2></div><span className="profile-edit-status profile-edit-status--offline">Not connected</span></div>
    <div className="profile-edit-next-step"><p>{message}</p></div>
  </section>;
}

export default async function EditProfilePage() {
  const { profile, user } = await requireMember();
  const optionalProfileReady = publicProfileEnabled();
  const optionalProfile = optionalProfileReady ? await loadOwnPublicProfile() : null;
  const shareHref = optionalProfile?.initialized && optionalProfile.visibility === 'public' && optionalProfile.public_id
    ? `/people/${optionalProfile.public_id}` : null;
  const memberDetail = [profile.department, profile.study_year ? `Year ${profile.study_year}` : null, profile.institution].filter(Boolean).join(' · ')
    || (profile.role === 'student' ? 'MEC member' : 'IDEALAB MEC staff');
  const signOutControl = <form action={signOut}>
    <input type="hidden" name="expected_account" value={user.id} />
    <SubmitButton className="profile-menu-signout" pendingText="Signing out…">Sign out</SubmitButton>
  </form>;

  return <div className="workspace-page workspace-arcade-profile profile-edit-page">
    <ProfileWorkspaceHeader settingsHref="/app/settings" shareHref={shareHref} signOutControl={signOutControl} />
    <div className="profile-edit-page-heading">
      <div><span className="workspace-pixel-label">IDEALAB MEC / PROFILE EDITOR</span><h2>Edit your profile</h2><p>Your account details stay private. Choose a section to review what is saved and what can be added later.</p></div>
      <Link className="text-link" href="/app/profile"><ArrowLeft size={17} aria-hidden="true" /> Profile</Link>
    </div>

    <nav className="profile-edit-section-nav" aria-label="Edit profile sections">
      <a href="#basic-profile"><span>01</span>Basic profile</a>
      <a href="#social-links"><span>02</span>Social links</a>
      <a href="#profile-settings"><span>03</span>Profile settings</a>
      <a href="#projects"><span>04</span>Projects</a>
      <a href="#activities"><span>05</span>Activity</a>
      <a href="#work-experience"><span>06</span>Work experience</a>
      <a href="#education"><span>07</span>Education</a>
      <a href="#volunteering"><span>08</span>Volunteering</a>
      <a href="#interests"><span>09</span>Interests</a>
    </nav>

    <section id="basic-profile" className="profile-edit-section profile-setup-section" aria-labelledby="basic-profile-title">
      <div className="profile-edit-section-heading"><div><span className="workspace-pixel-label">01 / PRIVATE DETAILS</span><h2 id="basic-profile-title">Basic profile</h2><p>These six MEC account fields are used for your account and admission.</p></div><span className="profile-edit-status profile-edit-status--ready"><LockKeyhole size={13} aria-hidden="true" /> Private</span></div>
      {profile.role === 'student' ? <>
        <ProfileSetupForm key={profile.profile_revision} profile={profile} action={saveRequiredProfile} mode="edit" />
        <details className="profile-edit-panel profile-registration-panel"><summary>MEC student declaration</summary><MecDeclarationForm key={`${profile.id}:${profile.profile_revision}`} profile={profile} action={claimMecRegistration} /></details>
      </> : <p className="profile-edit-preview-note">Staff account details are read-only here.</p>}
    </section>

    {optionalProfileReady && optionalProfile ? <div className="profile-edit-section profile-optional-editor" id="optional-profile" aria-label="Optional share profile settings">
      <div className="profile-edit-section-heading"><div><span className="workspace-pixel-label">02 / OPTIONAL PROFILE</span><h2>Profile settings</h2><p>Edit optional public-profile content separately from your private MEC account details.</p></div><span className="profile-edit-status profile-edit-status--ready">Connected</span></div>
      <PublicProfileEditor initial={optionalProfile} accountId={user.id} action={savePrivateProfileDraft} identity={{ name: profile.name || 'IDEA MAKER', detail: memberDetail }} defaultOpen showCard={false} />
    </div> : <>
      <NotReadySection id="social-links" number="02" title="Social links" message="Social links are not saved to your profile yet. This section will be available after the shared profile contract is ready." />
      <NotReadySection id="profile-settings" number="03" title="Profile settings" message="Public or private profile controls are not connected yet. Your account details remain private." />
      <NotReadySection id="interests" number="08" title="Interests" message="Your interests can be self-selected, but this app cannot save them to the shared profile yet." />
    </>}

    <section id="projects" className="profile-edit-section" aria-label="Your projects"><Suspense fallback={<MemberLoadingSkeleton kind="projects" />}><RecentProjects /></Suspense></section>
    <NotReadySection id="activities" number="05" title="Activity" message="IDEALAB event attendance will be shown from verified event records. Activity history is not connected to this profile yet." />
    <NotReadySection id="work-experience" number="06" title="Work experience" message="Work experience entries are not part of the current profile data and cannot be saved yet." />
    <NotReadySection id="education" number="07" title="Education" message="Your MEC department and current study year are in Basic profile. Additional education history is not saved yet." />
    <NotReadySection id="volunteering" number="08" title="Volunteering" message="Volunteering history is not part of the current profile data and cannot be saved yet." />
  </div>;
}
