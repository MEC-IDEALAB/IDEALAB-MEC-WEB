import { requireMember } from '@/lib/member';
import { signOut } from '@/app/auth/actions';
import { ProfileWorkspaceHeader } from '@/components/workspace-arcade';
import { SubmitButton } from '@/components/submit-button';
import { publicProfileEnabled } from '@/features/profile/public-profile-config';
import { loadOwnPublicProfile } from '@/features/profile/public-profile-data';
import { MakerProfileShowcase } from '@/features/profile/maker-profile-showcase';
import { loadProjects } from '@/features/projects/project-data';
import { projectCoreEnabled } from '@/features/projects/project-config';

export const metadata = { title: 'Your profile' };

function providerAvatar(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'lh3.googleusercontent.com' || url.username || url.password || url.port) return null;
    return url.href;
  } catch { return null; }
}

export default async function Profile() {
  const { profile, user } = await requireMember();
  const [publicProfile, projectRead] = await Promise.all([
    publicProfileEnabled() ? loadOwnPublicProfile() : Promise.resolve(null),
    projectCoreEnabled() ? loadProjects('mine', '', null) : Promise.resolve(undefined),
  ]);
  const shareHref = publicProfile?.initialized && publicProfile.visibility === 'public' && publicProfile.public_id
    ? `/people/${publicProfile.public_id}` : null;
  const memberDetail = [profile.institution, profile.department, profile.study_year ? `Year ${profile.study_year}` : null].filter(Boolean).join(' · ')
    || (profile.role === 'student' ? 'MEC member' : 'IDEALAB MEC staff');
  const avatarUrl = providerAvatar(user.user_metadata?.avatar_url ?? user.user_metadata?.picture);
  const signOutControl = <form action={signOut}>
    <input type="hidden" name="expected_account" value={user.id} />
    <SubmitButton className="profile-menu-signout" pendingText="Signing out…">Sign out</SubmitButton>
  </form>;

  return <div className="workspace-page workspace-arcade-profile">
    <ProfileWorkspaceHeader settingsHref="/app/settings" shareHref={shareHref} signOutControl={signOutControl} />
    <MakerProfileShowcase
      name={publicProfile?.display_name || profile.name || 'IDEA MAKER'}
      avatarUrl={avatarUrl}
      detail={memberDetail}
      bio={publicProfile?.bio}
      interests={publicProfile?.interests}
      links={publicProfile?.links}
      shareHref={shareHref}
      editHref="/app/profile/edit"
      projectRead={projectRead}
    />
  </div>;
}
