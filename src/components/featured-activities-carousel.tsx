'use client';

import { useRef, useState, type UIEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CircuitBoard, ChevronLeft, ChevronRight, Layers3, Sparkles } from 'lucide-react';
import { activities } from '@/content/lab';

const activityIcons = [Layers3, CircuitBoard, Sparkles];

/** A touch-first carousel with explicit controls; it never advances while someone is reading. */
export function FeaturedActivitiesCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function goTo(index: number) {
    const items = track.current?.querySelectorAll<HTMLElement>('[data-activity-slide]');
    const slide = items?.[index];
    if (!slide || !track.current) return;
    setActiveIndex(index);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const left = slide.getBoundingClientRect().left - track.current.getBoundingClientRect().left + track.current.scrollLeft;
    track.current.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function syncActiveSlide(event: UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const leadingEdge = containerRect.left + Number.parseFloat(getComputedStyle(container).paddingLeft || '0');
    const slides = Array.from(container.querySelectorAll<HTMLElement>('[data-activity-slide]'));
    const nearest = slides.reduce((best, slide, index) => {
      const slideLeft = slide.getBoundingClientRect().left;
      const bestLeft = slides[best].getBoundingClientRect().left;
      return Math.abs(slideLeft - leadingEdge) < Math.abs(bestLeft - leadingEdge) ? index : best;
    }, 0);
    setActiveIndex(nearest);
  }

  return <div className="discovery-activity-carousel">
    <div className="discovery-activity-carousel__toolbar">
      <span className="discovery-activity-carousel__count" aria-live="polite">{String(activeIndex + 1).padStart(2, '0')} <span aria-hidden="true">/</span> {String(activities.length).padStart(2, '0')}</span>
      <div className="discovery-activity-carousel__buttons">
        <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous featured activity"><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === activities.length - 1} aria-label="Next featured activity"><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
    </div>
    <div className="discovery-activity-carousel__track" ref={track} onScroll={syncActiveSlide} role="region" aria-label="Featured activities" aria-roledescription="carousel" tabIndex={0}>
      {activities.map((activity, index) => {
        const Icon = activityIcons[index];
        return <article className={`discovery-activity discovery-activity-${index} discovery-activity-slide`} key={activity.category} data-activity-slide role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${activities.length}: ${activity.title}`}>
          <div className="discovery-activity-top"><span className="discovery-label">/ 0{index + 1}</span><Icon size={36} strokeWidth={1.6} aria-hidden="true" /></div>
          <span className="discovery-label">{activity.category}</span>
          <h3>{activity.title}</h3>
          <p>{activity.description}</p>
          <Link href={index === 0 ? '/lab#facilities' : index === 1 ? '/app/events' : '/explore'} className="discovery-card-link">
            {index === 0 ? 'Explore the tools' : index === 1 ? 'Explore the programme' : 'About the community'}<ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </article>;
      })}
    </div>
    <p className="discovery-activity-carousel__hint">Swipe or scroll to explore all three starting points.</p>
  </div>;
}
