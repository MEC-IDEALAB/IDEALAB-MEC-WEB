'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

export function ProfileShareButton({ href }: { href: string | null }) {
  const [status, setStatus] = useState('');

  async function shareProfile() {
    if (!href) {
      setStatus('Profile sharing is not available yet.');
      return;
    }
    const url = new URL(href, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'IDEALAB MEC profile', url });
        setStatus('Profile link shared.');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setStatus('Share cancelled.');
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Profile link copied.');
    } catch {
      setStatus('Copy is unavailable in this browser.');
    }
  }

  return <>
    <button type="button" className="profile-share-button" onClick={shareProfile} aria-label="Share profile" title="Share profile" aria-describedby="profile-share-status">
      <Share2 size={19} aria-hidden="true" />
    </button>
    <span id="profile-share-status" className={status ? 'profile-share-feedback' : 'sr-only'} role="status">{status}</span>
  </>;
}
