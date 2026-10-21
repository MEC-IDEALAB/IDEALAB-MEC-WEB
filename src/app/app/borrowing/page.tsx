import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import { requireMember } from '@/lib/member';

export const metadata = { title: 'Borrowing' };

export default async function BorrowingPage() {
  await requireMember();

  return (
    <div className="workspace-page">
      <Link className="text-link" href="/app"><ArrowLeft size={18} aria-hidden="true" /> Your space</Link>
      <span className="eyebrow">SHARED LAB TOOLS</span>
      <h1>Borrowing.</h1>
      <p>Follow approved equipment details and return guidance once the lab catalog is connected.</p>
      <section className="empty-state" aria-labelledby="borrowing-unavailable-title">
        <Package size={42} aria-hidden="true" />
        <h2 id="borrowing-unavailable-title">Borrowing is not connected yet.</h2>
        <p>Live stock, prices, item requests and return records are not available in this release. Nothing is reserved or checked out here.</p>
        <a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a>
      </section>
    </div>
  );
}
