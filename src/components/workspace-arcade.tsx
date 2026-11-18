import Link from 'next/link';
import type { ReactNode } from 'react';
import { Settings2, Wifi, Zap, UsersRound } from 'lucide-react';
import { ProfileShareButton } from '@/components/profile-share-button';

export function WorkspaceArcadeHeading({ kind }: { kind: 'lab' | 'profile' }) {
  const lab = kind === 'lab';
  return <header className={`workspace-arcade-heading workspace-arcade-heading--${kind}`}>
    <div><span className="eyebrow">{lab ? 'IDEALAB MEC / THE LAB' : 'IDEALAB MEC / YOUR PROFILE'}</span>
      <h1>{lab ? <>Less waiting.<br /><em>More making.</em></> : <>A little you.<br /><em>A lot of possibility.</em></>}</h1>
      {lab && <p>Check the space. Plan your visit. Put your next idea in motion.</p>}
    </div>
  </header>;
}

export function ProfileWorkspaceHeader({ settingsHref, profileEditHref = '/app/profile/edit', shareHref = null, signOutControl }: {
  settingsHref: string;
  profileEditHref?: string;
  shareHref?: string | null;
  signOutControl?: ReactNode;
}) {
  return <header className="profile-page-heading">
    <div><span className="workspace-pixel-label">IDEALAB MEC / MEMBER</span><h1>Profile</h1></div>
    <div className="profile-page-actions">
      <ProfileShareButton href={shareHref} />
      <details className="profile-settings-dropdown">
        <summary className="profile-settings-button" aria-label="Open profile settings" title="Settings"><Settings2 size={19} aria-hidden="true" /></summary>
        <nav className="profile-settings-popover" aria-label="Profile settings">
          <section className="profile-settings-group" aria-labelledby="profile-menu-edit-title">
            <h2 id="profile-menu-edit-title">PROFILE</h2>
            <Link href={profileEditHref}>Edit profile</Link>
            <Link href={`${profileEditHref}#profile-settings`}>Profile settings</Link>
          </section>
          <section className="profile-settings-group" aria-labelledby="profile-menu-preferences-title">
            <h2 id="profile-menu-preferences-title">PREFERENCES</h2>
            <Link href={`${settingsHref}#appearance`}>Appearance & motion</Link>
          </section>
          <section className="profile-settings-group" aria-labelledby="profile-menu-community-title">
            <h2 id="profile-menu-community-title">COMMUNITY</h2>
            <Link href={`${settingsHref}#feedback`}>Feedback / talk to us</Link>
            <Link href={`${settingsHref}#terms`}>Terms of service</Link>
            <Link href={`${settingsHref}#privacy`}>Privacy policy</Link>
            <Link href={`${settingsHref}#community-guidelines`}>Community guidelines</Link>
            <Link href={`${settingsHref}#invite`}>Invite a friend</Link>
          </section>
          <section className="profile-settings-group profile-settings-group--account" aria-labelledby="profile-menu-account-title">
            <h2 id="profile-menu-account-title">ACCOUNT</h2>
            <Link href={`${settingsHref}#delete-account`}>Request account deletion</Link>
            {signOutControl ?? <Link href={`${settingsHref}#sign-out`}>Sign out</Link>}
          </section>
        </nav>
      </details>
    </div>
  </header>;
}

/** Absence of a verified core status must never render as a healthy service. */
export function LabUtilityStatus() {
  return <section className="workspace-utilities" aria-labelledby="utilities-heading">
    <div><span className="workspace-pixel-label">SPACE SIGNALS</span><h2 id="utilities-heading">Before you plug in.</h2></div>
    <ul><li><Wifi size={22} aria-hidden="true" /><span><strong>Wi-Fi</strong><small>Status unknown</small></span></li>
      <li><Zap size={22} aria-hidden="true" /><span><strong>Electricity</strong><small>Status unknown</small></span></li></ul>
    <p>Core updates aren’t connected yet. Check with the team before relying on availability.</p>
  </section>;
}
export function LabPresenceUnavailable() {
  return <section className="workspace-presence workspace-card" aria-labelledby="presence-heading"><UsersRound size={22} aria-hidden="true" />
    <div><span className="workspace-pixel-label">IN THE LAB</span><h2 id="presence-heading">Who’s here now?</h2>
      <p role="status">Live attendance isn’t connected.</p></div>
    <span className="workspace-presence__status">Not connected</span>
  </section>;
}
