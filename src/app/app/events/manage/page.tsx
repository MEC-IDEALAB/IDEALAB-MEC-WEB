import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Plus, Radio } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { MemberSignalArt } from '@/components/member-signal-art';
import { eventId, eventTime } from '@/features/events/event-contract';
import { EventDraftEditor } from '@/features/events/event-draft-editor';
import { eventManagementEnabled, loadEventDrafts, loadEventManagementScopes } from '@/features/events/management-data';
import './event-manager.css';

export const metadata = { title: 'Event studio', robots: { index: false, follow: false } };
export default async function EventManagerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireMember();
  if (!eventManagementEnabled()) notFound();
  const params = await searchParams, scopes = await loadEventManagementScopes();
  const scope = params.scope ?? scopes?.[0]?.id;
  const valid = (scope === undefined || eventId(scope)) && (params.event === undefined || eventId(params.event))
    && (params.new === undefined || params.new === '1') && !(params.event && params.new)
    && ((params.before === undefined && params.cursor === undefined) || eventTime(params.before) && eventId(params.cursor))
    && !(params.before && (params.event || params.new));
  const assigned = typeof scope === 'string' && scopes?.some(item => item.id === scope);
  const result = valid && assigned && params.new !== '1' ? await loadEventDrafts(scope as string, typeof params.event === 'string' ? params.event : null,
    typeof params.before === 'string' && typeof params.cursor === 'string' ? { created_at: params.before, id: params.cursor } : null) : null;
  const editor = valid && assigned && (params.new === '1' || typeof params.event === 'string' && result?.items.length === 1);
  return <div className="workspace-page event-manager-page">
    <Link className="text-link" href="/app/events"><ArrowLeft size={18} aria-hidden="true" /> Events & workshops</Link>
    <header className="event-manager-hero"><div><span className="eyebrow">EVENT HEAD / VALIDATION</span><h1>Make room<br />for what’s next.</h1><p>Your event studio. Draft privately, review the details, then publish.</p></div><div className="event-manager-art"><Radio size={26} aria-hidden="true" /><MemberSignalArt variant="home" /></div></header>
    <p className="notice">Validation workflow. Registration and payments are not connected in this environment.</p>
    {!valid ? <p className="notice" role="alert">This event-management link is invalid. <Link href="/app/events/manage">Return to the studio</Link>.</p>
      : scopes === null ? <section className="empty-state"><h2>The studio couldn’t load.</h2><p>Your current assignment could not be verified. Saved drafts have not been changed.</p><Link className="button" href="/app/events/manage">Try again</Link></section>
      : !scopes.length ? <section className="empty-state"><h2>No Event Head assignment.</h2><p>An active assignment from the Super Admin is needed to create or manage an event.</p></section>
      : !assigned ? <p className="notice" role="alert">This scope is not in your current Event Head assignments.</p>
      : <>
        <nav className="event-manager-scopes" aria-label="Assigned event scopes">{scopes.map(item => <Link key={item.id} href={`/app/events/manage?scope=${item.id}`} aria-current={item.id === scope ? 'page' : undefined}>{item.label}</Link>)}</nav>
        {editor ? <section className="event-manager-panel"><Link className="text-link" href={`/app/events/manage?scope=${scope}`}><ArrowLeft size={18} aria-hidden="true" /> All drafts in this scope</Link><h2>{params.new === '1' ? 'Start with a spark.' : result!.items[0].state === 'published' ? 'Your published event.' : 'Shape the next gathering.'}</h2><EventDraftEditor key={`${member.user.id}:${scope}:${params.new === '1' ? 'new' : `${result!.items[0].id}:${result!.items[0].revision}`}`} accountId={member.user.id} scopeId={scope as string} draft={params.new === '1' ? null : result!.items[0]} /></section>
          : params.event ? <section className="empty-state"><h2>Draft unavailable.</h2><p>The draft could not be found in this scope or your access has changed.</p></section>
          : result === null ? <section className="empty-state"><h2>Drafts couldn’t load.</h2><p>Keep any unsaved text before reloading.</p><Link className="button" href={`/app/events/manage?scope=${scope}`}>Retry this scope</Link></section>
          : <section aria-labelledby="event-drafts-title"><div className="event-manager-list-heading"><div><span className="eyebrow">YOUR ASSIGNED SCOPE</span><h2 id="event-drafts-title">From draft to gathering.</h2></div><Link className="button" href={`/app/events/manage?scope=${scope}&new=1`}><Plus size={18} aria-hidden="true" /> New event</Link></div>
            {!result.items.length ? <p className="empty-state">No events created in this scope yet. Start with a private draft.</p> : <ul className="event-manager-drafts">{result.items.map((item, index) => <li key={item.id}><Link href={`/app/events/manage?scope=${scope}&event=${item.id}`}><span className="event-manager-card-mark" aria-hidden="true">{String(index + 1).padStart(2, '0')}<br />{item.state === 'draft' ? '[+]' : '[↗]'}</span><div><span className="eyebrow">{item.state} · REV {item.revision}</span><h3>{item.details.title}</h3><p>{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.details.event_date))} IST · {item.details.venue}</p></div><ArrowRight size={20} aria-hidden="true" /></Link></li>)}</ul>}
            {result.cursor && <Link className="button button-secondary" href={`/app/events/manage?${new URLSearchParams({ scope: scope as string, before: result.cursor.created_at, cursor: result.cursor.id })}`}>Older drafts <ArrowRight size={18} aria-hidden="true" /></Link>}
          </section>}
      </>}
  </div>;
}
