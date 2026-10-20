import { requireMember } from '@/lib/member';
export const metadata = { title: 'Your profile' };
export default async function Profile() {
  const { profile, user } = await requireMember();
  return <div className="workspace-page"><span className="eyebrow">YOUR ACCOUNT</span><h1>Your profile.</h1><p>The same account you use across the lab platform.</p><section className="workspace-card"><dl><dt>Name</dt><dd>{profile?.name}</dd><dt>Email address</dt><dd>{user.email}</dd></dl><p className="small-copy">Profile editing will be enabled after the shared account update permissions have been verified.</p></section></div>;
}
