import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RequestDraft } from '@/features/requests/request-draft';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Request design preview', robots: { index: false, follow: false } };
export default function RequestDesignPreview() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  return <main id="main-content" className="container section narrow"><Link href="/" className="text-link">Back to IDEALAB MEC</Link><p className="eyebrow">DESIGN PREVIEW · SAMPLE DATA</p><h1>Try the request flow.</h1><p>This preview uses a separate local sample draft. It does not access member accounts, send work to the lab or demonstrate backend authorization.</p><RequestDraft accountId="design-preview" /></main>;
}
