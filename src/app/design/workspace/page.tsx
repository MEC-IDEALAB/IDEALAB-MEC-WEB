import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { StaffWorkspacePreview } from '@/features/staff/staff-workspace-preview';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Staff workspace design preview',
  robots: { index: false, follow: false },
};

export default function StaffWorkspaceDesignPreview() {
  if (process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();

  return (
    <main id="main-content" className="staff-preview-page">
      <div className="staff-preview-topbar">
        <Link className="text-link" href="/"><ArrowLeft size={18} aria-hidden="true" /> Back to IDEALAB MEC</Link>
        <ThemePicker />
      </div>

      <div className="staff-preview-content">
        <header className="staff-preview-heading">
          <div>
            <p className="eyebrow">IDEALAB MEC · STAFF EXPERIENCE</p>
            <h1>A workspace built around the work.</h1>
            <p>Explore the planned staff layouts. Every panel below is an empty wireframe: no account, assignments, records or actions are connected.</p>
          </div>
          <div className="staff-preview-badge"><Eye size={17} aria-hidden="true" /><span>Design preview</span></div>
        </header>

        <StaffWorkspacePreview />

        <footer className="staff-preview-footer">
          <span className="staff-preview-footer-mark" aria-hidden="true">IDEA</span>
          <p>Live staff access stays off until shared identity, scoped permissions and database workflows pass review.</p>
          <Link href="/sign-in">Sign in information</Link>
        </footer>
      </div>
    </main>
  );
}
