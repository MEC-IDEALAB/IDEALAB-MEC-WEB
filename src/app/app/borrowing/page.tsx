import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import { requireMember } from '@/lib/member';

export const metadata = { title: 'Borrowing' };

export default async function BorrowingPage() {
  await requireMember();

  return (
    <div className="workspace-page">
      <Link className="text-link" href="/app/lab"><ArrowLeft size={18} aria-hidden="true" /> Back to the lab</Link>
      <span className="eyebrow">SHARED LAB TOOLS</span>
      <h1>Borrowing.</h1>
      <p>Follow approved equipment details and return guidance once the lab catalog is connected.</p>
      <section className="empty-state" aria-labelledby="borrowing-unavailable-title">
        <Package size={42} aria-hidden="true" />
        <h2 id="borrowing-unavailable-title">Borrowing is not connected yet.</h2>
        <p>Live stock, prices, item requests and return records are not available in this release. Nothing is reserved or checked out here.</p>
        <p>For components, electronics tools or hardware, you can prepare a work request and choose <strong>Operations support</strong>. Preparing a request does not reserve an item or notify the team.</p>
        <div className="button-row"><Link className="button button-primary" href="/app/requests/new">Prepare a support request</Link><a className="button" href="mailto:idealab@mec.ac.in">Contact the lab</a></div>
      </section>
    </div>
  );
}
