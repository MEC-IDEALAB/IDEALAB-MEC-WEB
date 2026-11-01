'use client';

import Image from 'next/image';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { pastEvents } from '@/content/past-events';
import { useAutomaticMotion } from '@/components/automatic-motion';

export function PastEventCarousel({ variant = 'feature' }: { variant?: 'feature' | 'editorial' }) {
  const [active, setActive] = useState(0);
  const [pointerInside, setPointerInside] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const { allowed, paused, pauseForKeyboard } = useAutomaticMotion();
  const carouselRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const count = pastEvents.length;

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(carousel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const syncPageVisibility = () => setPageVisible(document.visibilityState === 'visible');
    syncPageVisibility();
    document.addEventListener('visibilitychange', syncPageVisibility);
    return () => document.removeEventListener('visibilitychange', syncPageVisibility);
  }, []);

  useEffect(() => {
    if (!allowed || paused || !isVisible || !pageVisible || pointerInside) return;
    const timer = window.setInterval(() => {
      setActive(current => (current + 1) % count);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [allowed, paused, count, isVisible, pageVisible, pointerInside]);

  function moveBy(amount: number) {
    setActive(current => (current + amount + count) % count);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;
    moveBy(dx > 0 ? 1 : -1);
  }

  return (
    <div
      id="past-events-carousel"
      className={`past-event-carousel past-event-carousel--${variant}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Past IDEA Lab events"
      ref={carouselRef}
      onPointerEnter={() => setPointerInside(true)}
      onPointerLeave={() => setPointerInside(false)}
      onFocusCapture={pauseForKeyboard}
    >
      <div className="event-carousel-topline">
        <span>ARCHIVE / 01—04</span>
        <div className="event-carousel-arrows" aria-label="Event carousel controls">
          <button type="button" onClick={() => moveBy(-1)} aria-label="Previous event">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => moveBy(1)} aria-label="Next event">
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="event-carousel-window"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStart.current = null; }}
      >
        <div className="event-carousel-track" style={{ transform: `translate3d(${active * 100}%, 0, 0)` }}>
          {pastEvents.map((event, index) => (
            <article
              className="past-event-slide"
              key={event.title}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}: ${event.title}`}
              aria-hidden={index !== active}
              style={{ '--event-accent': event.accent, '--event-accent-ink': event.accentInk, '--event-image-position': 'imagePosition' in event ? event.imagePosition : 'center' } as CSSProperties}
            >
              <div className="event-slide-image">
                <Image
                  src={event.image}
                  alt={event.alt}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1000px) 48vw, 580px"
                  loading="eager"
                />
                <span className="event-image-index" aria-hidden="true">/ {String(index + 1).padStart(2, '0')}</span>
                <div className="event-pixel-mask" aria-hidden="true">
                  {event.pixels.split('').map((pixel, pixelIndex) => (
                    <span className={pixel === '1' ? 'is-filled' : undefined} key={pixelIndex} />
                  ))}
                </div>
              </div>
              <div className="event-slide-copy">
                <p className="event-slide-kicker">IDEA LAB / EVENT ARCHIVE</p>
                <p className="event-slide-date">{event.date}</p>
                <h3>{event.title}</h3>
                <span className="event-slide-rule" aria-hidden="true" />
                <p className="event-slide-note">A moment from the lab’s workshop and learning history.</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="event-carousel-footer">
        <div className="event-carousel-dots" aria-label="Choose an event">
          {pastEvents.map((event, index) => (
            <button
              key={event.title}
              type="button"
              className={index === active ? 'is-active' : undefined}
              aria-label={`Show event ${index + 1}: ${event.title}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
        <p className="event-carousel-status" aria-live={allowed && !paused && !pointerInside && isVisible && pageVisible ? 'off' : 'polite'} aria-atomic="true">{String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</p>
        <a href="https://idealab.mec.ac.in/events" target="_blank" rel="noreferrer">
          Official event archive <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
