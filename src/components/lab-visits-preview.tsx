import Link from 'next/link';
import { ArrowUpRight, DoorOpen, History, Clock3 } from 'lucide-react';

/** Account-free visual preview; real visits render on the protected Lab route. */
export function LabVisitsPreview() {
  return <section className="lab-visits-preview workspace-card" aria-labelledby="lab-visits-preview-title">
    <header className="lab-visits-preview__heading"><span className="lab-visits-preview__icon" aria-hidden="true"><DoorOpen size={22} /></span><div><span className="workspace-pixel-label">YOUR TIME IN THE LAB</span><h2 id="lab-visits-preview-title">Your session</h2></div><span className="lab-visits-preview__badge">Sign in required</span></header>
    <div className="lab-visits-preview__summary"><div><small><Clock3 size={14} aria-hidden="true" /> LAB STATUS</small><strong>Check-in follows the core’s open status</strong></div><div><small><History size={14} aria-hidden="true" /> SESSION HISTORY</small><strong>Private to your account</strong></div></div>
    <div className="lab-visits-preview__actions"><Link className="button button-primary" href="/sign-in">Sign in for sessions <ArrowUpRight size={17} aria-hidden="true" /></Link><span>Check-in, checkout and history live together here.</span></div>
  </section>;
}
