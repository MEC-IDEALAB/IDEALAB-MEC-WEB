'use client';

import { useRef, useState } from 'react';
import { Copy, QrCode, ScanLine } from 'lucide-react';

const PROFILE_PATH = /^\/people\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ProfileQrCard({ path, preview = false, memberName = 'IDEA MAKER', memberDetail = 'MODEL ENGINEERING COLLEGE', memberBio = '', memberAvatarUrl, memberAvatarAlt }: {
  path: string | null; preview?: boolean; memberName?: string; memberDetail?: string; memberBio?: string; memberAvatarUrl?: string | null; memberAvatarAlt?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const [qr, setQr] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const frontButton = useRef<HTMLButtonElement>(null);
  const backFaceButton = useRef<HTMLButtonElement>(null);
  const canShare = preview || Boolean(path && PROFILE_PATH.test(path));

  function moveFocusAfterFlip(target: React.RefObject<HTMLButtonElement | null>) {
    requestAnimationFrame(() => target.current?.focus());
  }

  async function revealQr() {
    setFlipped(true);
    moveFocusAfterFlip(backFaceButton);
    if (qr || loading) return;
    if (!canShare || !path) {
      setStatus('Public profile sharing is not available yet.');
      return;
    }

    setLoading(true);
    setStatus('Preparing your QR…');
    try {
      const destination = new URL(path, window.location.origin);
      if (destination.origin !== window.location.origin) throw new Error('Unexpected profile destination.');
      const qrCode = await import('qrcode');
      const dataUrl = await qrCode.toDataURL(destination.toString(), {
        errorCorrectionLevel: 'Q',
        margin: 3,
        width: 320,
        color: { dark: '#111111', light: '#ffffff' },
      });
      setQr(dataUrl);
      setStatus(preview ? 'Preview QR only. It opens this local design preview.' : 'QR contains only your public profile link.');
    } catch {
      setStatus('The QR code could not be created.');
    } finally {
      setLoading(false);
    }
  }

  function hideQr() {
    setFlipped(false);
    moveFocusAfterFlip(frontButton);
  }

  async function copyLink() {
    if (!canShare || !path) {
      setStatus('Public profile sharing is not available yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setStatus(preview ? 'Preview link copied.' : 'Public profile link copied.');
    } catch {
      setStatus('Copy is unavailable in this browser.');
    }
  }

  return <div className={`profile-qr-card${flipped ? ' is-flipped' : ''}`} data-profile-card>
    <div className="profile-qr-card__rotor">
      <button id="profile-qr-front" ref={frontButton} type="button" className="profile-qr-card__face profile-qr-card__front"
        aria-label={`Flip ${memberName}'s ${memberAvatarUrl ? 'photo' : 'identity'} card to show QR code`} aria-describedby="profile-card-member-detail profile-card-member-bio" aria-controls="profile-qr-back" aria-expanded={flipped}
        aria-hidden={flipped} inert={flipped} onClick={revealQr}>
        <span className="profile-qr-card__art" aria-hidden="true">
          <span className="profile-qr-card__art-code">{'01 # 10 + 0 1 # 01 10\n#0 1 01 10 # + 0 1 01\n10 #1 01 + 0 # 10 01\n0 1 # 10 + 01 # 0 1 10\n# + 01 10 0 #1 01 + 10\n01 0 #1 + 10 01 # 0 +\n10 + 0 #1 01 10 # + 01\n0 1 # 10 # + 01 10 0 + 1\n+ 01 10 #0 1 #+ 10 01 #0\n#1 0+ 01 10 #0 +1 10 # 01\n1 #0 10 +1 01 #0 10 +1 0#\n0 → 1 / MEC / 01 10'}</span>
          <span className="profile-qr-card__art-coordinate">IDEA / OBJECT</span>
        </span>
        <span className="profile-qr-card__eyebrow"><span><ScanLine size={15} aria-hidden="true" /> IDEALAB MEC</span><span>MEMBER / CARD</span></span>
        <span className="profile-qr-card__identity">
          <span className="profile-qr-card__avatar">{memberAvatarUrl ? <img src={memberAvatarUrl} alt={memberAvatarAlt || `Profile photo of ${memberName}`} loading="lazy" referrerPolicy="no-referrer" /> : <span aria-hidden="true">{[...memberName.trim()][0]?.toLocaleUpperCase('en-US') || 'M'}</span>}<i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /></span>
          <span className="profile-qr-card__identity-copy"><span className="profile-qr-card__kicker">MAKER PROFILE</span><span className="profile-qr-card__name">{memberName}</span><span className="profile-qr-card__detail" id="profile-card-member-detail">{memberDetail}</span></span>
        </span>
        <span className="profile-qr-card__bio" id="profile-card-member-bio">{memberBio.trim() || 'Add a short introduction about what you like making.'}</span>
        <span className="profile-qr-card__flip"><span>{loading ? 'Preparing…' : 'Flip for QR'}</span><QrCode size={18} aria-hidden="true" /></span>
      </button>

      <section id="profile-qr-back" className="profile-qr-card__face profile-qr-card__back" aria-label="Profile QR code" aria-hidden={!flipped} inert={!flipped}>
        <button ref={backFaceButton} type="button" className="profile-qr-card__back-hit-area" aria-label={`Flip ${memberName}'s profile card back to member details`} aria-controls="profile-qr-front" onClick={hideQr} />
        {qr ? <img className="profile-qr-card__image" src={qr} alt={preview ? 'Sample QR code for this local design preview' : 'QR code linking to your public IDEALAB MEC profile'} width="160" height="160" />
          : <div className="profile-qr-card__placeholder" aria-label={loading ? 'Generating QR code' : canShare ? 'QR code unavailable' : 'Public profile QR is not ready'}><QrCode size={52} aria-hidden="true" /><span>{loading ? 'BUILDING QR…' : canShare ? 'QR UNAVAILABLE' : 'SHARING OFFLINE'}</span></div>}
        <p className="profile-qr-card__caption">{canShare ? 'SCAN TO OPEN PROFILE' : 'SHARING NOT AVAILABLE'}</p>
        <button type="button" className="profile-qr-card__copy" onClick={copyLink} disabled={!canShare}><Copy size={16} aria-hidden="true" /> {preview ? 'Copy preview URL' : 'Copy profile URL'}</button>
      </section>
    </div>
    <p className="profile-qr-card__status" role="status" aria-live="polite">{status || (preview ? 'Preview only · No account connected' : canShare ? 'QR contains your public profile link.' : 'Public profile sharing is not available yet.')}</p>
  </div>;
}
