import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RequestWorkspace } from '@/features/requests/request-workspace';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Request workspace design preview', robots: { index: false, follow: false } };
export default function RequestsDesignPreview() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  return <main id="main-content" className="container section narrow"><Link href="/" className="text-link">Back to IDEALAB MEC</Link><p className="eyebrow">DESIGN PREVIEW · LOCAL SAMPLE</p><h1>Your request workspace.</h1><p>This preview uses separate sample storage. It does not access member accounts or operational records.</p><RequestWorkspace accountId="design-preview" composeHref="/design/request" /></main>;
}
