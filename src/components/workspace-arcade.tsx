import { Wifi, Zap, UsersRound, ArrowUpRight, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { AuthAscii } from './auth-ascii';

export function WorkspaceArcadeHeading({ kind }: { kind: 'lab' | 'profile' }) {
  const lab = kind === 'lab';
  return <header className={`workspace-arcade-heading workspace-arcade-heading--${kind}`}>
    <div><span className="eyebrow">{lab ? 'IDEALAB MEC / THE LAB' : 'IDEALAB MEC / YOUR PROFILE'}</span>
      <h1>{lab ? <>Less waiting.<br /><em>More making.</em></> : <>A little you.<br /><em>A lot of possibility.</em></>}</h1>
      <p>{lab ? 'Check the space. Plan your visit. Put your next idea in motion.' : 'Your interests, your work and the things you’re curious about.'}</p>
      <span className="workspace-pixel-label">{lab ? 'EXPLORE / EXPERIMENT / REPEAT' : 'THINK / MAKE / CONNECT'}</span>
    </div>
    <div className="workspace-ascii-window" aria-hidden="true"><span>FIELD NOTES / MEC</span><AuthAscii /><span>0 → 1 → SOMETHING REAL</span></div>
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
  return <section className="workspace-presence" aria-labelledby="presence-heading"><UsersRound size={28} aria-hidden="true" />
    <div><span className="workspace-pixel-label">PEOPLE / NOW</span><h2 id="presence-heading">Who’s making today?</h2>
      <p>The live presence list isn’t connected yet. Your own visits and session history are separate.</p></div>
    <Link className="text-link" href="/app/visits">My sessions <ArrowUpRight size={18} aria-hidden="true" /></Link>
  </section>;
}

export function ProfileSharingNotice() {
  return <section className="workspace-share-note" aria-labelledby="profile-share-heading"><ScanLine size={32} aria-hidden="true" />
    <div><span className="workspace-pixel-label">YOUR NEXT CONNECTION</span><h2 id="profile-share-heading">Make yourself known.</h2>
      <p>Shareable profiles, QR links and interest badges are being connected. Your account details below are private; no public profile has been published here.</p></div>
  </section>;
}
