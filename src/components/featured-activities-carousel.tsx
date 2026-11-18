'use client';

import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CircuitBoard, ChevronLeft, ChevronRight, Layers3, Sparkles } from 'lucide-react';
import { activities } from '@/content/lab';
import { useAutomaticMotion } from '@/components/automatic-motion';
import { HomePixelIllustration } from '@/components/home-pixel-illustration';

const activityIcons = [Layers3, CircuitBoard, Sparkles];
const activityArtwork = ['prototype', 'electronics', 'makers'] as const;

/** Wide cards move through the active pixel illustration; phones retain a swipeable strip. */
export function FeaturedActivitiesCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const { allowed, paused, pauseForKeyboard } = useAutomaticMotion();

  const goTo = useCallback((index: number) => {
    const items = track.current?.querySelectorAll<HTMLElement>('[data-activity-slide]');
    const slide = items?.[index];
    if (!slide || !track.current) return;
    setActiveIndex(index);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const left = slide.getBoundingClientRect().left - track.current.getBoundingClientRect().left + track.current.scrollLeft;
    track.current.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, []);

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
    setActiveIndex(current => current === nearest ? current : nearest);
  }

  useEffect(() => {
    if (!allowed || paused || hoverPaused) return;
    const timer = window.setTimeout(() => goTo((activeIndex + 1) % activities.length), 7200);
    return () => window.clearTimeout(timer);
  }, [activeIndex, allowed, paused, hoverPaused, goTo]);

  return <div className="discovery-activity-carousel" onPointerEnter={() => setHoverPaused(true)} onPointerLeave={() => setHoverPaused(false)} onFocusCapture={event => { if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) pauseForKeyboard(); }}>
    <div className="discovery-activity-carousel__toolbar">
      <span className="discovery-activity-carousel__count" aria-live="off">{String(activeIndex + 1).padStart(2, '0')} <span aria-hidden="true">/</span> {String(activities.length).padStart(2, '0')}</span>
      <div className="discovery-activity-carousel__buttons">
        <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous featured activity"><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === activities.length - 1} aria-label="Next featured activity"><ChevronRight size={20} aria-hidden="true" /></button>
      </div>
    </div>
    <div id="featured-activities-carousel" className="discovery-activity-carousel__track" ref={track} onScroll={syncActiveSlide} role="region" aria-label="Featured activities" aria-describedby="featured-activities-help" aria-roledescription="carousel" tabIndex={0}>
      <span id="featured-activities-help" className="sr-only">Automatic motion pauses when hovered or focused. Use the site motion control to resume.</span>
      {activities.map((activity, index) => {
        const Icon = activityIcons[index];
        return <article className={`discovery-activity discovery-activity-${index} discovery-activity-slide${activeIndex === index ? ' is-active' : ''}`} key={activity.category} data-activity-slide role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${activities.length}: ${activity.title}`}>
          <div className="discovery-activity-top"><span className="discovery-label">/ 0{index + 1}</span><Icon size={36} strokeWidth={1.6} aria-hidden="true" /></div>
          <div className="discovery-activity-body">
            <div className="discovery-activity-copy">
              <span className="discovery-label">{activity.category}</span>
              <h3>{activity.title}</h3>
              <p>{activity.description}</p>
            </div>
            <div className="discovery-activity-art"><HomePixelIllustration variant={activityArtwork[index]} /></div>
          </div>
          <Link href={index === 0 ? '/lab#facilities' : index === 1 ? '/app/events' : '/explore'} className="discovery-card-link">
            {index === 0 ? 'Explore the tools' : index === 1 ? 'Explore the programme' : 'About the community'}<ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </article>;
      })}
    </div>
    <div className="discovery-activity-carousel__dots" role="group" aria-label="Choose a featured activity">
      {activities.map((activity, index) => <button key={activity.category} type="button" aria-label={`Show featured activity ${index + 1}: ${activity.title}`} aria-controls="featured-activities-carousel" aria-pressed={activeIndex === index} onClick={() => goTo(index)}><span /></button>)}
    </div>
    <p className="discovery-activity-carousel__hint">Use the arrows or dots; swipe through the cards on a phone.</p>
  </div>;
}
