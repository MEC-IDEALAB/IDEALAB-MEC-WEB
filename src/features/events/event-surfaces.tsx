import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { eventStatuses, eventTypes, type EventCard } from './event-contract';
export const eventDate = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
export function EventTestNote() { return process.env.ACCOUNT_ENVIRONMENT === 'validation' ? <p className="notice">Isolated validation programme. Registration, payment and staff publishing are not connected.</p> : null; }
export function EventsUnavailable() { return <section className="empty-state" role="status"><CalendarDays size={40} aria-hidden="true" /><h2>The programme couldn’t be loaded.</h2><p>Event records are unavailable right now. This does not mean there are no events.</p><Link className="button" href="/app/events">Try the programme again</Link></section>; }
export function EventCards({ items, headingLevel = 'h2' }: { items: EventCard[]; headingLevel?: 'h2' | 'h3' }) {
  const Heading = headingLevel;
  return <ul className="event-programme-list">{items.map(e => <li key={e.id}><Link className="event-programme-card" href={`/app/events/${e.id}`}>
    <span className="event-programme-date"><CalendarDays size={24} aria-hidden="true" /><time dateTime={e.event_date}>{eventDate(e.event_date)} IST</time></span>
    <div className="event-programme-copy"><span className="eyebrow">{e.event_type ? eventTypes[e.event_type] : 'Type not supplied'}</span><Heading>{e.title}</Heading><span className="event-programme-venue"><MapPin size={16} aria-hidden="true" />{e.venue?.trim() || 'Venue not supplied'}</span><span className="event-programme-status">{e.status ? eventStatuses[e.status] : 'Status not supplied'}</span></div>
    <ArrowUpRight className="event-programme-arrow" size={24} aria-hidden="true" />
  </Link></li>)}</ul>;
}
