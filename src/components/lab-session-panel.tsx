import { randomUUID } from 'node:crypto';
import { DoorClosed, DoorOpen, CircleHelp, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { loadLabOpening } from '@/lib/lab-opening-server';
import { loadOwnVisits } from '@/lib/visits';
import { LabOpeningControls, LabStatusRefresh } from './lab-opening-controls';
import { OwnVisitControls } from './own-visit-controls';

const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));

/** One compact server-rendered card for opening status, the member's visit and history. */
export async function LabSessionPanel({ accountId, history = false }: { accountId: string; history?: boolean }) {
  const [openingResult, visitsResult] = await Promise.all([loadLabOpening(), loadOwnVisits()]);
  const opening = openingResult.status === 'ready' ? openingResult.opening : null;
  const visits = visitsResult.status === 'ready' ? visitsResult.visits : null;
  const active = visits?.find(visit => visit.checkout_time === null);
  const lastCompleted = visits?.find(visit => visit.checkout_time !== null);
  const latest = opening?.changes[0];
  const Icon = opening?.status === 'open' ? DoorOpen : opening?.status === 'closed' ? DoorClosed : CircleHelp;
  const status = opening?.status === 'open' ? 'Open' : opening?.status === 'closed' ? 'Closed' : opening ? 'Not set' : 'Unavailable';
  const checkedIn = visits === null ? 'Unavailable' : active ? 'Checked in' : 'Not checked in';

  return <section className="workspace-card lab-session-card" data-reveal="section" data-lab-status={opening?.status ?? 'unavailable'} aria-labelledby="own-visit-title">
    <header className="lab-session-card__heading">
      <span className="workspace-card-icon"><Icon size={24} aria-hidden="true" /></span>
      <div><span className="eyebrow">YOUR LAB SESSION</span><h2 id="own-visit-title" tabIndex={-1}>Your lab session</h2></div>
      <span className="lab-status-badge">{status}</span>
    </header>
    {process.env.ACCOUNT_ENVIRONMENT === 'validation' && <p className="small-copy">Test workspace · not live lab attendance.</p>}
    <div className="lab-session-card__summary">
      <div className="lab-session-card__opening" data-lab-status={opening?.status ?? 'unavailable'}>
        <small>LAB STATUS</small><h3 id="lab-opening-title" tabIndex={-1}>{status}</h3>
        <p>{latest ? <>Updated by {latest.actor_name} · <time dateTime={latest.occurred_at}>{dateTime(latest.occurred_at)} IST</time></> : opening ? 'Waiting for a core update.' : 'Status data is unavailable.'}</p>
      </div>
      <div><small>YOUR VISIT</small><strong role="status" aria-live="polite">{checkedIn}</strong>
        {active && <time dateTime={active.checkin_time}>Since {dateTime(active.checkin_time)} IST</time>}
        {!active && lastCompleted?.checkout_time && <>
          <time dateTime={lastCompleted.checkin_time}>Last check-in · {dateTime(lastCompleted.checkin_time)} IST</time>
          <time dateTime={lastCompleted.checkout_time}>Last checkout · {dateTime(lastCompleted.checkout_time)} IST</time>
        </>}
      </div>
    </div>
    {history && <LabStatusRefresh loadedAt={new Date().toISOString()} />}
    {history && opening?.can_manage && <div className="lab-session-card__opening-controls"><LabOpeningControls accountId={accountId} revision={opening.revision} status={opening.status} commandId={randomUUID()} /></div>}
    {history && <div className="lab-session-card__visit-controls"><OwnVisitControls key={active?.id ?? 'check-in'} accountId={accountId} activeVisitId={active?.id ?? null} canCheckIn={opening?.status === 'open'} available={visits !== null} commandId={randomUUID()} /></div>}
    {!history && <Link className="lab-session-card__open-link" href="/app/lab">Open Lab sessions <ArrowUpRight size={17} aria-hidden="true" /></Link>}
    {history && visits && <details className="own-visit-history lab-session-card__history"><summary>Session history</summary>
      {visits.length === 0 ? <p>No sessions yet.</p> : <ol className="own-visit-list">{visits.map(visit => <li key={visit.id}>
        <strong>{visit.purpose || 'Lab visit'}</strong><span>In: <time dateTime={visit.checkin_time}>{dateTime(visit.checkin_time)} IST</time></span>
        <span>{visit.checkout_time ? <>Out: <time dateTime={visit.checkout_time}>{dateTime(visit.checkout_time)} IST</time></> : 'Open visit'}</span>
      </li>)}</ol>}
      {visits.length === 20 && <p className="small-copy">Showing 20 recent sessions.</p>}
    </details>}
    {history && opening && <details className="lab-opening-history lab-session-card__opening-history"><summary>Opening history</summary>
      {opening.changes.length === 0 ? <p>No opening changes yet.</p> : <ol>{opening.changes.map(change => <li key={change.revision}>
        <span className={`lab-history-dot lab-history-dot--${change.action}`} aria-hidden="true" /><div>
          <strong>{change.action === 'open' ? 'Opened' : 'Closed'} · {change.actor_name}</strong><span>{change.actor_duty}</span>
          <time dateTime={change.occurred_at}>{dateTime(change.occurred_at)} IST</time>
        </div>
      </li>)}</ol>}
    </details>}
  </section>;
}
