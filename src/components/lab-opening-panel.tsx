import { randomUUID } from 'node:crypto';
import { DoorClosed, DoorOpen, CircleHelp } from 'lucide-react';
import { loadLabOpening } from '@/lib/lab-opening-server';
import { LabOpeningControls, LabStatusRefresh } from './lab-opening-controls';
import { requireMember } from '@/lib/member';

const dateTime = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
export async function LabOpeningPanel({ history = false }: { history?: boolean }) {
  const result = await loadLabOpening();
  const opening = result.status === 'ready' ? result.opening : null;
  const member = opening?.can_manage ? await requireMember() : null;
  const latest = opening?.changes[0];
  const Icon = opening?.status === 'open' ? DoorOpen : opening?.status === 'closed' ? DoorClosed : CircleHelp;
  return <section className="workspace-card lab-opening-panel" data-lab-status={opening?.status ?? 'unavailable'} aria-labelledby="lab-opening-title">
    <div className="lab-opening-heading"><span className="workspace-card-icon"><Icon size={26} aria-hidden="true" /></span><div><span className="eyebrow">THE SPACE, RIGHT NOW</span><h2 id="lab-opening-title" tabIndex={-1}>{opening?.status === 'open' ? 'The lab is open.' : opening?.status === 'closed' ? 'The lab is closed.' : opening ? 'No opening status yet.' : 'Lab status unavailable.'}</h2></div><span className="lab-status-badge">{opening?.status === 'open' ? 'Open' : opening?.status === 'closed' ? 'Closed' : 'Not confirmed'}</span></div>
    {process.env.ACCOUNT_ENVIRONMENT === 'validation' && <p className="lab-status-test-note">Test workspace · this does not report the physical lab’s live status.</p>}
    {latest ? <p className="lab-opening-latest">{latest.action === 'open' ? 'Opened' : 'Closed'} by <strong>{latest.actor_name}</strong> · {latest.actor_duty}<br /><time dateTime={latest.occurred_at}>{dateTime(latest.occurred_at)} IST</time></p>
      : <p>{opening ? 'A core member with opening duty can record the first status. Check with the lab before travelling.' : 'We couldn’t load the current record. Refresh to try again; this does not mean the lab is closed.'}</p>}
    <LabStatusRefresh loadedAt={new Date().toISOString()} />
    {opening?.can_manage && member && <LabOpeningControls key={member.user.id} accountId={member.user.id} revision={opening.revision} status={opening.status} commandId={randomUUID()} />}
    {history && opening && <details className="lab-opening-history"><summary>Opening & closing history</summary>{opening.changes.length === 0 ? <p>No changes have been recorded yet.</p> : <><ol>{opening.changes.map(change => <li key={change.revision}><span className={`lab-history-dot lab-history-dot--${change.action}`} aria-hidden="true" /><div><strong>{change.action === 'open' ? 'Opened' : 'Closed'} by {change.actor_name}</strong><span>{change.actor_duty}</span><time dateTime={change.occurred_at}>{dateTime(change.occurred_at)} IST</time></div></li>)}</ol>{opening.changes.length === 20 && <p className="small-copy">Showing the 20 most recent changes.</p>}</>}</details>}
  </section>;
}
