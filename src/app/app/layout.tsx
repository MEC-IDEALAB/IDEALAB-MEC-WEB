import { LogOut } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { signOut } from '@/app/auth/actions';
import { MemberWorkspaceShell } from '@/components/member-workspace-shell';
export const dynamic = 'force-dynamic';
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  if (member.profileState !== 'ready') {
    const isUnverified = member.profileState === 'unverified';
    const isInactive = member.profileState === 'inactive';
    return <main id="main-content" className="section narrow">
      <span className="eyebrow">ACCOUNT ACCESS</span>
      <h1>{isUnverified ? 'Confirm your email to continue.' : isInactive ? 'Account access is paused.' : 'Your profile isn’t available yet.'}</h1>
      <p>{isUnverified
        ? 'Open the confirmation link sent to your email address, then sign in again to continue to IDEALAB MEC.'
        : isInactive
          ? 'This account is not currently active. Contact the lab team if you think this is a mistake.'
          : 'We couldn’t verify your account profile right now. Please try again later or contact the lab team.'}</p>
      <div className="button-row">
        {isUnverified && <a className="button" href="/sign-in">Back to sign in</a>}
        {!isUnverified && <a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a>}
        <form action={signOut}><button className="button button-ink" type="submit">Sign out</button></form>
      </div>
    </main>;
  }
  return <MemberWorkspaceShell signOutControl={<form action={signOut}><button type="submit"><LogOut size={18} aria-hidden="true" /><span>Sign out</span></button></form>}>{children}</MemberWorkspaceShell>;
}
