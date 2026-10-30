import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { OwnVisitsPanel } from '@/components/own-visits-panel';
import { LabOpeningPanel } from '@/components/lab-opening-panel';

export const metadata = { title: 'Lab visits' };

export default async function VisitsPage() {
  await requireMember();

  return (
    <div className="workspace-page">
      <Link className="text-link" href="/app/lab"><ArrowLeft size={18} aria-hidden="true" /> Back to the lab</Link>
      <span className="eyebrow">PLAN A VISIT</span>
      <h1>Lab visits.</h1>
      <p>Find approved access guidance before you travel to the lab.</p>
      <LabOpeningPanel history />
      <OwnVisitsPanel history />
      <p className="small-copy">Opening follows core duty rather than fixed hours. Viewing this page does not create a visit.</p>
    </div>
  );
}
