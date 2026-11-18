import Link from 'next/link';
import { ArrowUpRight, CalendarClock, Package, Wrench } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { RequestWorkspace } from '@/features/requests/request-workspace';
import { SubmittedRequests } from '@/features/requests/submitted-requests';
import { requestId, requestTime, type RequestCursor } from '@/features/requests/work-request-contract';

export const metadata = { title: 'Make & borrow' };

export default async function MakeAndBorrowPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, profile } = await requireMember();
  const params = await searchParams;
  const section = params.section === 'borrow' || params.section === 'book' ? params.section : 'make';
  const before = typeof params.before === 'string' ? params.before : undefined;
  const cursorId = typeof params.cursor === 'string' ? params.cursor : undefined;
  const invalid = (params.before !== undefined || params.cursor !== undefined) && (!requestTime(before) || !requestId(cursorId));
  const cursor: RequestCursor | null = !invalid && requestTime(before) && requestId(cursorId) ? { created_at: before, id: cursorId } : null;
  const onlineIntake = process.env.ACCOUNT_ENVIRONMENT === 'validation' && process.env.ENABLE_WORK_REQUEST_INTAKE === 'true' && profile.role === 'student';

  return <div className="workspace-page make-borrow-page">
    <span className="eyebrow">ONE PLACE · TWO WAYS TO GET STARTED</span>
    <h1>Make & borrow.</h1>
    <p>Prepare work with the lab, propose a machine time, or ask about shared tools.</p>
    <nav className="make-borrow-tabs" aria-label="Make and borrow sections">
      <Link href="/app/make-and-borrow?section=make" aria-current={section === 'make' ? 'page' : undefined}><Wrench size={18} aria-hidden="true" /> Make</Link>
      <Link href="/app/make-and-borrow?section=book" aria-current={section === 'book' ? 'page' : undefined}><CalendarClock size={18} aria-hidden="true" /> Book</Link>
      <Link href="/app/make-and-borrow?section=borrow" aria-current={section === 'borrow' ? 'page' : undefined}><Package size={18} aria-hidden="true" /> Borrow</Link>
    </nav>
    {section === 'make' ? <RequestWorkspace key={user.id} accountId={user.id} composeHref="/app/requests/new" submitted={onlineIntake ? <SubmittedRequests cursor={cursor} invalid={invalid} /> : undefined} />
      : section === 'book' ? <section className="borrowing-panel" aria-labelledby="booking-panel-title">
        <span className="workspace-card-icon"><CalendarClock size={22} aria-hidden="true" /></span>
        <h2 id="booking-panel-title">Propose a machine time.</h2>
        <p>Choose a machine service and add your preferred time in the request form. A confirmed booking requires approval from the responsible head. Live availability and booking confirmations are currently unavailable here.</p>
        <div className="button-row"><Link className="button button-primary" href="/app/requests/new?from=book">Prepare a machine request <ArrowUpRight size={17} aria-hidden="true" /></Link><Link className="button" href="/lab#facilities">Explore lab equipment</Link></div>
      </section>
      : <section className="borrowing-panel" aria-labelledby="borrowing-panel-title">
        <span className="workspace-card-icon"><Package size={22} aria-hidden="true" /></span>
        <h2 id="borrowing-panel-title">Shared tools.</h2>
        <p>Inventory, availability and return records are not connected yet. Nothing can be reserved or checked out here.</p>
        <p>For components, electronics tools or hardware, prepare a request and choose <strong>Operations support</strong>.</p>
        <div className="button-row"><Link className="button button-primary" href="/app/requests/new?from=borrow">Prepare an Operations request <ArrowUpRight size={17} aria-hidden="true" /></Link><a className="button" href="mailto:idealab@mec.ac.in">Ask the lab team</a></div>
      </section>}
  </div>;
}
