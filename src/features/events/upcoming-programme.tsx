import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { loadUpcomingEvents } from './event-data';
import { EventCards, EventTestNote } from './event-surfaces';

/** Uses the same guarded programme read as the Events page. */
export async function UpcomingProgramme() {
  const events = await loadUpcomingEvents();
  return <section aria-labelledby="upcoming-programme-title">
    <div className="workspace-section-heading"><h2 id="upcoming-programme-title">Next events.</h2><Link className="text-link" href="/app/events?status=upcoming">View the programme <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
    <EventTestNote />
    {events.status === 'unavailable'
      ? <div className="workspace-card" role="status"><h3>The programme couldn’t be loaded.</h3><p>Open Events to try again. This does not mean there are no events.</p></div>
      : events.data.items.length === 0
        ? <div className="workspace-card"><h3>No future events are marked upcoming.</h3><p>Visit Events to explore the full recorded programme.</p></div>
        : <><p className="small-copy">Up to three future events marked upcoming, shown in India Standard Time.</p><EventCards items={events.data.items} headingLevel="h3" /></>}
    <p className="small-copy">Registration and payment are not available here yet.</p>
  </section>;
}
