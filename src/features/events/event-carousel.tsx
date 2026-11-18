'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function EventCarousel({ count, children }: { count: number; children: ReactNode }) {
  const region = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(count <= 1);

  useEffect(() => {
    const viewport = region.current?.querySelector<HTMLElement>('.event-programme-list--carousel');
    if (!viewport) return;
    const update = () => {
      const cards = viewport.querySelectorAll<HTMLElement>('li');
      const first = cards.item(0)?.getBoundingClientRect();
      const last = cards.item(cards.length - 1)?.getBoundingClientRect();
      const bounds = viewport.getBoundingClientRect();
      const style = getComputedStyle(viewport);
      const left = bounds.left + (Number.parseFloat(style.borderLeftWidth) || 0);
      const right = bounds.right - (Number.parseFloat(style.borderRightWidth) || 0);
      setAtStart(!first || first.left >= left - 1);
      setAtEnd(!last || last.right <= right + 1);
    };
    update();
    viewport.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => {
      viewport.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [count]);

  function move(direction: -1 | 1) {
    const viewport = region.current?.querySelector<HTMLElement>('.event-programme-list--carousel');
    const cards = viewport ? [...viewport.querySelectorAll<HTMLElement>('li')] : [];
    if (!viewport || cards.length < 2) return;
    const style = getComputedStyle(viewport);
    const leftInset = (Number.parseFloat(style.borderLeftWidth) || 0) + (Number.parseFloat(style.scrollPaddingLeft) || 0);
    const offsetFor = (card: HTMLElement) => Math.max(0, card.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft - leftInset);
    const activeIndex = cards.reduce((closest, card, index) =>
      Math.abs(offsetFor(card) - viewport.scrollLeft) < Math.abs(offsetFor(cards[closest]) - viewport.scrollLeft) ? index : closest, 0);
    const target = cards[Math.max(0, Math.min(cards.length - 1, activeIndex + direction))];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollTo({ left: offsetFor(target), behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  return <div className="event-carousel" ref={region} role="region" aria-label="Upcoming events" aria-roledescription="carousel">
    {count > 1 && <div className="event-carousel-controls">
      <button type="button" aria-label="Previous upcoming event" disabled={atStart} onClick={() => move(-1)}><ArrowLeft size={19} aria-hidden="true" /></button>
      <button type="button" aria-label="Next upcoming event" disabled={atEnd} onClick={() => move(1)}><ArrowRight size={19} aria-hidden="true" /></button>
    </div>}
    {children}
    {count > 1 && <p className="event-carousel-hint">Swipe to browse, or use the arrow buttons.</p>}
  </div>;
}

/** Layout-only card for the no-data design preview; it contains no invented event. */
export function UpcomingEventPreviewCard() {
  return <section className="upcoming-event-preview" aria-labelledby="upcoming-event-preview-title">
    <div className="workspace-section-heading"><h2 id="upcoming-event-preview-title">Upcoming in the lab.</h2><span className="eyebrow">EVENT CARDS · PREVIEW</span></div>
    <EventCarousel count={0}><ul className="event-programme-list event-programme-list--carousel event-programme-list--preview" aria-label="Upcoming event preview">
      <li><article className="event-programme-card event-preview-card"><span className="event-preview-card__stamp" aria-hidden="true">NEXT<br />UP</span><div><span className="eyebrow">NO LIVE EVENT DATA</span><h3>Event cards will appear here.</h3><p>Published event details will slide into this space when the programme is connected.</p></div></article></li>
    </ul></EventCarousel>
  </section>;
}
