import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireMember } from '@/lib/member';
import { loadEvent } from '@/features/events/event-data';
import { eventId, eventStatuses, eventTypes } from '@/features/events/event-contract';
import { eventDate, EventsUnavailable, EventTestNote } from '@/features/events/event-surfaces';
export const metadata = { title: 'Event details' };
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember(); const { id } = await params; if (!eventId(id)) notFound();
  const result = await loadEvent(id);
  if (result.status === 'ready' && result.data === null) notFound();
  const e = result.status === 'ready' ? result.data : null;
  return <div className="workspace-page"><Link className="text-link" href="/app/events"><ArrowLeft size={18} aria-hidden="true" /> Events & workshops</Link><EventTestNote />
    {!e ? <EventsUnavailable /> : <><span className="eyebrow">{e.event_type ? eventTypes[e.event_type] : 'Type not supplied'}</span><h1>{e.title}</h1><p className="notice">{e.status ? eventStatuses[e.status] : 'Status not supplied'}</p>
      <dl className="event-programme-facts"><div><dt>Starts</dt><dd><time dateTime={e.event_date}>{eventDate(e.event_date)} IST</time></dd></div><div><dt>Ends</dt><dd>{e.end_date ? <time dateTime={e.end_date}>{eventDate(e.end_date)} IST</time> : 'Not supplied'}</dd></div><div><dt>Venue</dt><dd>{e.venue?.trim() || 'Not supplied'}</dd></div></dl>
      <section className="workspace-card"><h2>About this event</h2><p className="event-programme-description">{e.description?.trim() || 'No description has been supplied.'}</p></section>
      <section className="workspace-card"><h2>Participation</h2><p>Registration, payment and attendance controls are not connected yet. This page does not confirm eligibility or reserve a place.</p>{e.status === 'cancelled' && <p>This event is marked cancelled. No refund decision is recorded by this page.</p>}</section></>}
  </div>;
}
