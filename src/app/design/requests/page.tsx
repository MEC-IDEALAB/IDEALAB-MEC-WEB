import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RequestWorkspace } from '@/features/requests/request-workspace';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Request workspace design preview', robots: { index: false, follow: false } };
export default function RequestsDesignPreview() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  return <main id="main-content" className="container section narrow">
    <Link href="/" className="text-link">Back to IDEALAB MEC</Link>
    <p className="eyebrow">DESIGN PREVIEW · SAMPLE DATA</p>
    <h1>Your request workspace.</h1>
    <p>This preview keeps temporary sample drafts in page memory. They clear on refresh or when you leave the preview.</p>
    <RequestWorkspace accountId="design-preview" storageScope="memory" composeHref="/design/request" />
    <section className="workspace-card" aria-labelledby="student-estimate-flow">
      <p className="eyebrow">MACHINE REQUEST WIREFRAME</p>
      <h2 id="student-estimate-flow">What happens after you submit</h2>
      <ol className="student-billing-steps">
        <li><strong>Review the estimate.</strong> See the head’s itemized costs and approve the estimate before work begins. If you decline, the head can revise or reject the request.</li>
        <li><strong>Check the final bill.</strong> Review actual usage after the work is done. If the amount increased, tick the approval box and submit it before paying.</li>
        <li><strong>Submit your transaction ID.</strong> Pay with IDEALAB’s official QR and enter the transaction ID. The request closes after the assigned head verifies payment.</li>
      </ol>
      <p className="small-copy">This preview shows the steps only. Payment instructions appear on an approved live bill.</p>
    </section>
  </main>;
}
