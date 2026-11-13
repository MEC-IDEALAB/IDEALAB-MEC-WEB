import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { loadEvents } from '@/features/events/event-data';
import { eventPageParams, eventStatuses } from '@/features/events/event-contract';
import { EventCards, EventsUnavailable, EventTestNote } from '@/features/events/event-surfaces';
import { eventManagementEnabled } from '@/features/events/management-data';
export const metadata = { title: 'Events & workshops' };
export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireMember(); const p = await searchParams;
  const page = eventPageParams(p);
  const filter = page?.filter;
  const result = page ? await loadEvents(page.filter, page.cursor, page.version) : null;
  const next = result?.status === 'ready' ? result.data.cursor : null;
  return <div className="workspace-page"><Link className="text-link" href="/app/lab"><ArrowLeft size={18} aria-hidden="true" /> Back to the lab</Link><span className="eyebrow">LEARN BY SHOWING UP</span><h1>Events & workshops.</h1><p>Explore the recorded programme. Dates and times are shown in IST.</p><EventTestNote />
    <nav className="event-programme-filters" aria-label="Event status">{(['upcoming', 'ongoing', 'completed', 'cancelled', 'all'] as const).map(status => <Link key={status} href={status === 'upcoming' ? '/app/events' : `/app/events?status=${status}`} aria-current={filter === status ? 'page' : undefined}>{status === 'all' ? 'All events' : status === 'completed' ? 'Past' : eventStatuses[status]}</Link>)}</nav>
    {!page ? <p className="notice" role="alert">This programme link is invalid. <Link href="/app/events">Return to upcoming events</Link>.</p> : result?.status !== 'ready' ? <EventsUnavailable /> : result.data.items.length ? <EventCards items={result.data.items} /> : <section className="empty-state"><h2>{filter === 'upcoming' ? 'No upcoming events on this page.' : 'No events on this page.'}</h2><p>Explore <Link href="/app/events?status=all">all events</Link> for the wider programme.</p></section>}
    {next && page && <Link className="button" href={`/app/events?${new URLSearchParams({ status: page.filter, before: next.event_date, cursor: next.id, ...(page.version === 2 ? { order: `2:${page.filter}` } : {}) })}`}>Next events <ArrowRight size={18} aria-hidden="true" /></Link>}
    {eventManagementEnabled() && <Link className="button button-secondary" href="/app/events/manage">Event Head studio <ArrowRight size={18} aria-hidden="true" /></Link>}
    <p className="small-copy">Registration and payment are not available here yet. An event listing does not reserve a place.</p>
  </div>;
}
