'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, Copy, QrCode, ScanLine } from 'lucide-react';

const PROFILE_PATH = /^\/people\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ProfileQrCard({ path, preview = false }: { path: string; preview?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const [qr, setQr] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const frontButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);

  function moveFocusAfterFlip(target: React.RefObject<HTMLButtonElement | null>) {
    requestAnimationFrame(() => target.current?.focus());
  }

  async function revealQr() {
    setFlipped(true);
    moveFocusAfterFlip(backButton);
    if (qr || loading) return;
    if (!preview && !PROFILE_PATH.test(path)) {
      setStatus('This profile link is not available. Save a public profile to create a share card.');
      return;
    }

    setLoading(true);
    setStatus('Preparing your QR card…');
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
      setStatus(preview ? 'Preview QR only. It opens this local design preview.' : 'QR code ready. It contains only your public profile link.');
    } catch {
      setStatus('The QR code could not be created. You can still copy or open your profile link.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setStatus(preview ? 'Preview link copied.' : 'Public profile link copied. Anyone with the link can view it.');
    } catch {
      setStatus('Copy is unavailable here. Open the profile link and copy its address.');
    }
  }

  return <div className={`profile-qr-card${flipped ? ' is-flipped' : ''}`}>
    <div className="profile-qr-card__rotor">
      <section className="profile-qr-card__face profile-qr-card__front" aria-label="Shareable profile card" aria-hidden={flipped} inert={flipped}>
        <span className="profile-qr-card__eyebrow"><ScanLine size={16} aria-hidden="true" /> IDEALAB MEC / MEMBER CARD</span>
        <div className="profile-qr-card__art" aria-hidden="true"><span>01</span><span>IDEA → OBJECT</span><QrCode size={76} strokeWidth={1.4} /></div>
        <div><strong>Pass your work around.</strong><p>{preview ? 'A preview of the profile share card. No account is connected.' : 'Your QR links to the details you chose to make public.'}</p></div>
        <button ref={frontButton} type="button" className="profile-qr-card__flip" onClick={revealQr}>
          {loading ? 'Preparing…' : 'Flip for QR'} <QrCode size={18} aria-hidden="true" />
        </button>
      </section>

      <section className="profile-qr-card__face profile-qr-card__back" aria-label="Profile QR code" aria-hidden={!flipped} inert={!flipped}>
        <button ref={backButton} type="button" className="profile-qr-card__back-button" onClick={() => { setFlipped(false); moveFocusAfterFlip(frontButton); }}><ArrowLeft size={17} aria-hidden="true" /> Back to card</button>
        {qr ? <img className="profile-qr-card__image" src={qr} alt={preview ? 'Sample QR code for this local design preview' : 'QR code linking to your public IDEALAB MEC profile'} width="160" height="160" />
          : <div className="profile-qr-card__placeholder" aria-label={loading ? 'Generating QR code' : 'QR code unavailable'}><QrCode size={56} aria-hidden="true" /><span>{loading ? 'BUILDING QR…' : 'QR UNAVAILABLE'}</span></div>}
        <p className="profile-qr-card__caption">{preview ? 'DESIGN PREVIEW · NOT A MEMBER PROFILE' : 'SCAN TO OPEN MY PUBLIC PROFILE'}</p>
        <button type="button" className="profile-qr-card__copy" onClick={copyLink}><Copy size={16} aria-hidden="true" /> {preview ? 'Copy preview URL' : 'Copy profile URL'}</button>
      </section>
    </div>
    <p className="profile-qr-card__status" role="status" aria-live="polite">{status || (preview ? 'This QR is a local visual preview only.' : 'Your private email, phone and registration details are never in this QR.')}</p>
  </div>;
}
