import Link from 'next/link';
import { ArrowUpRight, DoorOpen, History } from 'lucide-react';

/** Account-free visual preview; real visits render on the protected Lab route. */
export function LabVisitsPreview() {
  return <section className="lab-visits-preview" aria-labelledby="lab-visits-preview-title">
    <header className="lab-visits-preview__intro">
      <span className="workspace-pixel-label">YOUR TIME IN THE LAB</span>
      <h2 id="lab-visits-preview-title">Arrive curious.<br /><em>Leave with progress.</em></h2>
      <p>Sign in to check in while the lab is open and see your own session history.</p>
    </header>
    <div className="lab-visits-preview__cards">
      <article className="lab-visits-preview__card lab-visits-preview__card--checkin">
        <span className="lab-visits-preview__icon" aria-hidden="true"><DoorOpen size={24} /></span>
        <span className="workspace-pixel-label">CHECK IN / CHECK OUT</span>
        <h3>Start a session</h3>
        <p>Check-in follows the lab’s current opening status. A visit never grants machine access.</p>
        <Link className="button button-primary" href="/sign-in">Sign in to check in <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </article>
      <article className="lab-visits-preview__card lab-visits-preview__card--history">
        <span className="lab-visits-preview__icon" aria-hidden="true"><History size={24} /></span>
        <span className="workspace-pixel-label">PRIVATE TO YOUR ACCOUNT</span>
        <h3>Your sessions</h3>
        <p>Visit times and check-out history appear here after you sign in.</p>
        <Link className="text-link" href="/sign-in">View my history <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </article>
    </div>
  </section>;
}
