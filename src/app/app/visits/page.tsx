import Link from 'next/link';
import { ArrowLeft, DoorOpen } from 'lucide-react';
import { requireMember } from '@/lib/member';

export const metadata = { title: 'Lab visits' };

export default async function VisitsPage() {
  await requireMember();

  return (
    <div className="workspace-page">
      <Link className="text-link" href="/app"><ArrowLeft size={18} aria-hidden="true" /> Your space</Link>
      <span className="eyebrow">PLAN A VISIT</span>
      <h1>Lab visits.</h1>
      <p>Find approved access guidance before you travel to the lab.</p>
      <section className="empty-state" aria-labelledby="visits-unavailable-title">
        <DoorOpen size={42} aria-hidden="true" />
        <h2 id="visits-unavailable-title">Visit services are not connected yet.</h2>
        <p>Approved access hours, check-in and visit history are not available in this release. No visit has been created or recorded.</p>
        <a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a>
      </section>
    </div>
  );
}
