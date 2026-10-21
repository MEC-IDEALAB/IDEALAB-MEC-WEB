'use client';

import { useEffect } from 'react';

/** Progressive enhancement: the server-rendered page is always visible. */
export function HomeMotion() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const active = new Set<Animation>();
    const seen = new WeakSet<Element>();
    let observer: IntersectionObserver | undefined;

    function play(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = element.animate(frames, options);
      active.add(animation);
      const release = () => active.delete(animation);
      animation.onfinish = release;
      animation.oncancel = release;
    }

    function configure() {
      observer?.disconnect();
      for (const animation of active) animation.cancel();
      active.clear();
      if (preference.matches) return;
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting || seen.has(entry.target)) continue;
          const element = entry.target;
          seen.add(element);
          observer?.unobserve(element);
          if (element.matches('[data-reveal]') && !element.contains(document.activeElement)) {
            const stagger = Math.min(2, Math.max(0, Number(element.getAttribute('data-stagger')) || 0));
            play(element, [{ opacity: .55, translate: '0 18px' }, { opacity: 1, translate: '0 0' }], {
              duration: 520, delay: stagger * 85, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards',
            });
          }
          if (element.matches('.doodle')) {
            play(element, [{ translate: '0 0' }, { translate: '0 -5px' }, { translate: '0 0' }], {
              duration: 2200, iterations: 2, easing: 'ease-in-out',
            });
          }
          for (const path of element.matches('.doodle') ? element.querySelectorAll<SVGPathElement>('[data-draw]') : []) {
            const length = path.getTotalLength();
            play(path, [{ strokeDasharray: `${length}`, strokeDashoffset: length }, { strokeDasharray: `${length}`, strokeDashoffset: 0 }], {
              duration: 850, easing: 'cubic-bezier(.2,.7,.2,1)',
            });
          }
        }
      }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
      document.querySelectorAll('.playful-site [data-reveal], .playful-site .doodle, .student-preview-app [data-reveal]').forEach(element => {
        if (!seen.has(element)) observer?.observe(element);
      });
    }

    configure();
    preference.addEventListener('change', configure);
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', configure);
      for (const animation of active) animation.cancel();
      active.clear();
    };
  }, []);
  return null;
}
