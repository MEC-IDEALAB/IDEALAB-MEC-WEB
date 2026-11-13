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
        <section id="account" className="settings-panel" aria-labelledby="settings-account">
          <span className="settings-kicker">01 / ACCOUNT</span><h2 id="settings-account"><UserRound aria-hidden="true" size={23} /> Your details</h2>
          <p>Review your name, contact details and MEC registration in your profile.</p>
          <Link className="button" href={preview ? '/design/member-profile-edit' : '/app/profile/edit'}>{preview ? 'Preview profile sections' : 'Edit your profile'} <ArrowUpRight aria-hidden="true" size={18} /></Link>
          <div className="settings-inset"><h3><ShieldCheck aria-hidden="true" size={19} /> Profile visibility</h3><p>Public display controls are not ready. You cannot publish a profile or change who can see your details here yet.</p></div>
        </section>
        <section id="appearance" className="settings-panel" aria-labelledby="settings-appearance">
          <span className="settings-kicker">02 / LOOK & FEEL</span><h2 id="settings-appearance"><SlidersHorizontal aria-hidden="true" size={23} /> Tune the atmosphere</h2>
          <div className="settings-preference"><div><h3>Light or dark</h3><p>Your choice stays on this device when browser storage is available.</p></div><ThemePicker /></div>
          <div className="settings-preference settings-preference--motion"><div><h3>Automatic motion</h3><p id="automatic-motion-description">Pause or resume decorative movement. Your device’s reduced-motion preference always takes priority.</p></div><AutomaticMotionControl controls="" /></div>
        </section>
        <section id="feedback" className="settings-panel" aria-labelledby="settings-contact">
          <span className="settings-kicker">03 / TALK TO US</span><h2 id="settings-contact"><Mail aria-hidden="true" size={23} /> A thought? A rough edge?</h2><p>Share feedback, ask for help, or start a conversation with the IDEA Lab team.</p>
          <div className="settings-actions"><a className="button button-primary" href="mailto:idealab@mec.ac.in?subject=IDEALAB%20website%20feedback">Email feedback <ArrowUpRight aria-hidden="true" size={18} /></a><a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a></div>
          <p className="settings-help">Opens your email app. Nothing is submitted through this page. You can also write to <a href="mailto:idealab@mec.ac.in">idealab@mec.ac.in</a>. Keep passwords and sensitive account information out of your message.</p>
        </section>
      </div>
      <div className="settings-stack">
        <section id="invite" className="settings-panel settings-invite" aria-labelledby="settings-invite">
          <span className="settings-kicker">04 / MORE CURIOUS MINDS</span><h2 id="settings-invite">Bring a friend.</h2><p>Know someone at MEC who likes making things? Point them towards IDEA Lab.</p>
          {invitationUrl ? <><button type="button" className="button" onClick={copyInvitation}><Copy aria-hidden="true" size={18} /> Copy sign-up link</button><p className="settings-share-url"><a href={invitationUrl}>{invitationUrl}</a></p><p role="status" className="settings-copy-status">{copyStatus}</p></> : <p className="settings-invite-note">{preview ? 'Invitation copying is unavailable in this preview.' : 'The public invitation link is not configured for this environment.'}</p>}
          <p className="settings-help">This is a public sign-up link. It does not vouch for someone, verify admission, or grant lab access.</p>
        </section>
        <section id="policies" className="settings-panel" aria-labelledby="settings-policies"><span className="settings-kicker">05 / POLICIES</span><h2 id="settings-policies">Policies</h2><p>These pages are not published yet.</p><ul className="settings-policy-list"><li id="terms"><span>Terms of service</span><span>Not published</span></li><li id="privacy"><span>Privacy policy</span><span>Not published</span></li><li id="community-guidelines"><span>Community guidelines</span><span>Not published</span></li></ul><a className="button" href="mailto:idealab@mec.ac.in?subject=IDEALAB%20policy%20enquiry">Ask about policies <ArrowUpRight aria-hidden="true" size={18} /></a></section>
        <section id="delete-account" className="settings-panel settings-danger" aria-labelledby="settings-delete"><span className="settings-kicker">06 / ACCOUNT</span><h2 id="settings-delete">Delete account</h2><p>Self-service deletion is not available yet. Request a review from the lab team.</p><a className="button" href="mailto:idealab@mec.ac.in?subject=Account%20deletion%20review%20request&body=Hello%20IDEA%20Lab%20team%2C%0A%0AI%20would%20like%20to%20request%20an%20account%20deletion%20review.%0A">Request deletion review <ArrowUpRight aria-hidden="true" size={18} /></a><p className="settings-help">This opens email; it does not delete your account.</p></section>
      </div>
    </div>
    <section id="sign-out" className="settings-session" aria-labelledby="settings-session"><div><h2 id="settings-session"><LogOut aria-hidden="true" size={22} /> Sign out</h2><p>Sign out on shared devices.</p></div>{preview ? <p className="settings-help">Sign out is unavailable in this preview.</p> : signOutControl}</section>
  </div>;
}
