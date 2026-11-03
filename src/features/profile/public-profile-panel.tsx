import { loadOwnPublicProfile } from './public-profile-data';
import { publicProfileEnabled } from './public-profile-config';
import { PublicProfileEditor } from './public-profile-editor';
import { savePublicProfile } from './public-profile-actions';
import { ProfileSharingNotice } from '@/components/workspace-arcade';

export async function PublicProfilePanel({ accountId }: { accountId: string }) {
  if (!publicProfileEnabled()) return <ProfileSharingNotice />;
  const profile = await loadOwnPublicProfile();
  if (!profile) return <section className="workspace-card"><h2>We couldn’t load your shareable profile.</h2><p>Your existing details have not been changed. Reload to try again.</p></section>;
  return <PublicProfileEditor key={`${accountId}:${profile.revision}`} initial={profile} accountId={accountId} action={savePublicProfile} />;
}
