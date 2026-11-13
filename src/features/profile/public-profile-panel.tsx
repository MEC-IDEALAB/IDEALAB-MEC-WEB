import { loadOwnPublicProfile } from './public-profile-data';
import { publicProfileEnabled } from './public-profile-config';
import { PublicProfileEditor } from './public-profile-editor';
import { savePublicProfile } from './public-profile-actions';
import { ProfileQrCard } from './profile-qr-card';

export async function PublicProfilePanel({ accountId, identity }: { accountId: string; identity: { name: string; detail: string } }) {
  if (!publicProfileEnabled()) return <div className="public-profile-editor public-profile-editor--member profile-share-unavailable">
    <ProfileQrCard path={null} memberName={identity.name} memberDetail={identity.detail} />
    <p role="status">Profile sharing is offline.</p>
  </div>;
  const profile = await loadOwnPublicProfile();
  if (!profile) return <div className="public-profile-editor public-profile-editor--member profile-share-unavailable">
    <ProfileQrCard path={null} memberName={identity.name} memberDetail={identity.detail} />
    <p role="status">Profile details are unavailable.</p>
  </div>;
  return <PublicProfileEditor key={`${accountId}:${profile.revision}`} initial={profile} accountId={accountId} identity={identity} action={savePublicProfile} />;
}
