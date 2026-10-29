import Link from 'next/link';
import { ArrowRight, DoorOpen } from 'lucide-react';
import { loadOwnVisits } from '@/lib/visits';
import { randomUUID } from 'node:crypto';
import { loadLabOpening } from '@/lib/lab-opening-server';
import { OwnVisitControls } from './own-visit-controls';
import { requireMember } from '@/lib/member';

const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
export async function OwnVisitsPanel({ history = false }: { history?: boolean }) {
  const result = await loadOwnVisits();
  const member = history ? await requireMember() : null;
  const opening = history ? await loadLabOpening() : null;
  const active = result.status === 'ready' ? result.visits.find(visit => visit.checkout_time === null) : undefined;
  return <section className="workspace-card own-visits-panel" aria-label="Your lab visits">
    <span className="workspace-card-icon"><DoorOpen size={24} aria-hidden="true" /></span>
    <h2 id="own-visit-title" tabIndex={-1}>Your lab visits</h2>
    {process.env.ACCOUNT_ENVIRONMENT === 'validation' && <p className="small-copy">Isolated test workspace · these are not your live Grow visit records.</p>}
    {result.status === 'unavailable' ? <p role="status">We couldn’t load your visit records. Refresh to try again; this does not mean your history is empty.</p>
      : <><p className="visit-current-state">{active ? 'You are checked in.' : 'You are not checked in.'}</p>
        {active && <p>Checked in: <time dateTime={active.checkin_time}>{dateTime(active.checkin_time)} IST</time></p>}
      </>}
    {history && member && result.status === 'ready' && <OwnVisitControls key={member.user.id} accountId={member.user.id} activeVisitId={active?.id ?? null} canCheckIn={opening?.status === 'ready' && opening.opening.status === 'open'} commandId={randomUUID()} />}
    {history && result.status === 'ready' && <details className="own-visit-history"><summary>Your visit history</summary>{result.visits.length === 0 ? <p>No visits have been recorded for your account in this workspace.</p>
      : <ol className="own-visit-list">{result.visits.map(visit => <li key={visit.id}><strong>{visit.purpose || 'Lab visit'}</strong><span>In: <time dateTime={visit.checkin_time}>{dateTime(visit.checkin_time)} IST</time></span><span>{visit.checkout_time ? <>Out: <time dateTime={visit.checkout_time}>{dateTime(visit.checkout_time)} IST</time></> : 'Open visit'}</span></li>)}</ol>}{result.visits.length === 20 && <p className="small-copy">Showing up to 20 recent records, with open visits first.</p>}</details>}
    {!history && <Link className="text-link" href="/app/visits">Manage your visit & history <ArrowRight size={17} aria-hidden="true" /></Link>}
    <p className="small-copy">A visit record does not grant machine access.</p>
  </section>;
}
