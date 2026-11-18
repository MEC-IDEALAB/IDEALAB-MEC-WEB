import { signOut } from '@/app/auth/actions';
import { MemberSettingsContent } from '@/components/member-settings-content';
import { SubmitButton } from '@/components/submit-button';
import { requireMember } from '@/lib/member';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const member = await requireMember();
  let invitationUrl: string | undefined;
  try {
    const origin = new URL(process.env.AUTH_SITE_URL ?? '');
    if (origin.protocol === 'https:' && !origin.username && !origin.password && !origin.port
      && origin.pathname === '/' && !origin.search && !origin.hash
      && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
      && !origin.hostname.endsWith('.invalid')) invitationUrl = new URL('/sign-up', origin).href;
  } catch { /* A missing canonical origin must not produce an invitation link. */ }
  return <MemberSettingsContent invitationUrl={invitationUrl} signOutControl={
    <form action={signOut}>
      <input type="hidden" name="expected_account" value={member.user.id} />
      <SubmitButton className="button settings-signout" pendingText="Signing out…">Sign out of this browser</SubmitButton>
    </form>
  } />;
}
