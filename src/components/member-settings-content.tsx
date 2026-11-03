'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Copy, LogOut, Mail, ShieldCheck, SlidersHorizontal, UserRound } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { AutomaticMotionControl } from '@/components/automatic-motion';

export function MemberSettingsContent({ preview = false, invitationUrl, signOutControl }: {
  preview?: boolean;
  invitationUrl?: string;
  signOutControl?: ReactNode;
}) {
  const [copyStatus, setCopyStatus] = useState('');
  async function copyInvitation() {
    if (!invitationUrl) return;
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopyStatus('Sign-up link copied. Share it with your friend.');
    } catch {
      setCopyStatus('Copy is unavailable in this browser. Select and copy the sign-up link below.');
    }
  }
  return <div className="workspace-page member-settings">
    <header className="settings-heading">
      <div><span className="settings-kicker">YOUR SPACE / YOUR SETUP</span><h1>Make it<br /><span>feel like you.</span></h1><p>Account details, a little fine-tuning, and a direct line to the lab.</p></div>
      <pre id="settings-ascii" className="settings-ascii" aria-hidden="true">{'┌──────────────┐\n│ [#]  SETUP   │\n│ ──●───────   │\n│ ──────●───   │\n│ ───●──────   │\n└──────┬───────┘\n     [:::]'}</pre>
    </header>
    {preview && <p className="settings-preview-note">Design preview · No account is connected. Theme and motion controls affect this browser.</p>}
    <div className="settings-columns">
      <div className="settings-stack">
        <section className="settings-panel" aria-labelledby="settings-account">
          <span className="settings-kicker">01 / ACCOUNT</span><h2 id="settings-account"><UserRound aria-hidden="true" size={23} /> Your details</h2>
          <p>Review your name, contact details and MEC registration in your profile.</p>
          <Link className="button" href={preview ? '/design/member-space?screen=profile' : '/app/profile'}>{preview ? 'Preview profile' : 'Edit your profile'} <ArrowUpRight aria-hidden="true" size={18} /></Link>
          <div className="settings-inset"><h3><ShieldCheck aria-hidden="true" size={19} /> Profile visibility</h3><p>Public display controls are not ready. You cannot publish a profile or change who can see your details here yet.</p></div>
        </section>
        <section className="settings-panel" aria-labelledby="settings-appearance">
          <span className="settings-kicker">02 / LOOK & FEEL</span><h2 id="settings-appearance"><SlidersHorizontal aria-hidden="true" size={23} /> Tune the atmosphere</h2>
          <div className="settings-preference"><div><h3>Light or dark</h3><p>Your choice stays on this device when browser storage is available.</p></div><ThemePicker /></div>
          <div className="settings-preference settings-preference--motion"><div><h3>Automatic motion</h3><p id="automatic-motion-description">Pause or resume decorative movement. Your device’s reduced-motion preference always takes priority.</p></div><AutomaticMotionControl controls="" /></div>
        </section>
        <section className="settings-panel" aria-labelledby="settings-contact">
          <span className="settings-kicker">03 / TALK TO US</span><h2 id="settings-contact"><Mail aria-hidden="true" size={23} /> A thought? A rough edge?</h2><p>Share feedback, ask for help, or start a conversation with the IDEA Lab team.</p>
          <div className="settings-actions"><a className="button button-primary" href="mailto:idealab@mec.ac.in?subject=IDEALAB%20website%20feedback">Email feedback <ArrowUpRight aria-hidden="true" size={18} /></a><a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a></div>
          <p className="settings-help">Opens your email app. Nothing is submitted through this page. You can also write to <a href="mailto:idealab@mec.ac.in">idealab@mec.ac.in</a>. Keep passwords and sensitive account information out of your message.</p>
        </section>
      </div>
      <div className="settings-stack">
        <section className="settings-panel settings-invite" aria-labelledby="settings-invite">
          <span className="settings-kicker">04 / MORE CURIOUS MINDS</span><h2 id="settings-invite">Bring a friend.</h2><p>Know someone at MEC who likes making things? Point them towards IDEA Lab.</p>
          {invitationUrl ? <><button type="button" className="button" onClick={copyInvitation}><Copy aria-hidden="true" size={18} /> Copy sign-up link</button><p className="settings-share-url"><a href={invitationUrl}>{invitationUrl}</a></p><p role="status" className="settings-copy-status">{copyStatus}</p></> : <p className="settings-invite-note">{preview ? 'Invitation copying is unavailable in this preview.' : 'The public invitation link is not configured for this environment.'}</p>}
          <p className="settings-help">This is a public sign-up link. It does not vouch for someone, verify admission, or grant lab access.</p>
        </section>
        <section className="settings-panel" aria-labelledby="settings-policies"><span className="settings-kicker">05 / PRIVACY & POLICIES</span><h2 id="settings-policies">Know where you stand.</h2><p>Approved privacy and account policy pages are not published in this app yet.</p><a className="button" href="mailto:idealab@mec.ac.in?subject=IDEALAB%20privacy%20and%20policy%20enquiry">Ask about privacy & policies <ArrowUpRight aria-hidden="true" size={18} /></a></section>
        <section className="settings-panel settings-danger" aria-labelledby="settings-delete"><span className="settings-kicker">06 / ACCOUNT DELETION</span><h2 id="settings-delete">Thinking of leaving?</h2><p>Self-service account deletion is not available. Email the team to ask for a review of your deletion request and the applicable data-handling process.</p><a className="button" href="mailto:idealab@mec.ac.in?subject=Account%20deletion%20review%20request&body=Hello%20IDEA%20Lab%20team%2C%0A%0AI%20would%20like%20to%20discuss%20deleting%20my%20account.%20Please%20let%20me%20know%20the%20verification%20process%20and%20applicable%20data-handling%20policy.%0A">Email a deletion review request <ArrowUpRight aria-hidden="true" size={18} /></a><p className="settings-help">Opening or sending an email does not delete your account. No account details are added to the message.</p></section>
      </div>
    </div>
    <section className="settings-session" aria-labelledby="settings-session"><div><h2 id="settings-session"><LogOut aria-hidden="true" size={22} /> Finished for now?</h2><p>Sign out when you’re using a shared computer.</p></div>{preview ? <p className="settings-help">Sign out is unavailable in this preview.</p> : signOutControl}</section>
  </div>;
}
