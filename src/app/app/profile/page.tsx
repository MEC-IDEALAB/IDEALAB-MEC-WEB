import { requireMember } from '@/lib/member';
import { saveRequiredProfile, claimMecRegistration } from '@/app/account-access/actions';
import { MecDeclarationForm } from '@/components/mec-declaration-form';
import { ProfileSetupForm } from '@/components/profile-setup-form';
import Link from 'next/link';
import { ArrowUpRight, UserRound, Sparkles, LockKeyhole } from 'lucide-react';
import { WorkspaceArcadeHeading } from '@/components/workspace-arcade';
import { PublicProfilePanel } from '@/features/profile/public-profile-panel';
import { MemberLoadingSkeleton } from '@/components/member-loading-skeleton';
import { Suspense } from 'react';
export const metadata = { title: 'Your profile' };
export default async function Profile() {
  const { profile, user } = await requireMember();
  return <div className="workspace-page workspace-arcade-profile"><WorkspaceArcadeHeading kind="profile" />
    <section className="member-id-card" aria-label="Your member profile"><div className="member-id-heading"><span>IDEALAB MEC · YOUR ACCOUNT</span><Sparkles size={22} aria-hidden="true" /></div><div className="member-id-person"><span className="profile-avatar" aria-hidden="true"><UserRound size={36} /></span><div><h2>{profile.name || 'Lab member'}</h2><p>{profile.role === 'student' ? 'Student · Model Engineering College' : 'Staff account'}</p></div></div><div className="member-id-footer"><span><LockKeyhole size={15} aria-hidden="true" /> Account view</span><span>MAKE · TEST · LEARN</span></div></section>
    <Suspense fallback={<MemberLoadingSkeleton kind="page" />}><PublicProfilePanel accountId={user.id} /></Suspense>
    <section className="workspace-card profile-account-card" aria-labelledby="profile-details-title"><div className="profile-account-heading"><div><h2 id="profile-details-title">Your private account details</h2><p>Manage the details used for your account and MEC admission. These are separate from the planned shareable profile.</p></div><span className="profile-private-label"><LockKeyhole size={15} aria-hidden="true" /> Private details</span></div><dl className="profile-summary-list"><div><dt>Full name</dt><dd>{profile.name || 'Not provided'}</dd></div><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Phone</dt><dd>{profile.phone || 'Not provided'}</dd></div><div><dt>MEC registration number</dt><dd>{profile.college_roll || 'Not provided'}</dd></div><div><dt>Department</dt><dd>{profile.department || 'Not provided'}</dd></div><div><dt>Study year</dt><dd>{profile.study_year ? `Year ${profile.study_year}` : 'Not provided'}</dd></div><div><dt>Institution</dt><dd>{profile.institution || 'Not provided'}</dd></div></dl>
    {profile.role === 'student' ? <>
      <details className="profile-edit-panel"><summary>Edit your profile details</summary><ProfileSetupForm key={profile.profile_revision} profile={profile} action={saveRequiredProfile} mode="edit" /></details>
      <details className="profile-edit-panel"><summary>Manage your MEC registration</summary><MecDeclarationForm key={`${profile.id}:${profile.profile_revision}`} profile={profile} action={claimMecRegistration} /></details>
    </> : <p className="small-copy">Staff profile editing is not available yet.</p>}</section>
    <div className="workspace-home-footer"><Link className="button" href="/app/settings">Appearance & settings <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
  </div>;
}
