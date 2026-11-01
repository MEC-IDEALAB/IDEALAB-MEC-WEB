'use client';

import { useEffect } from 'react';

/** Progressive enhancement: the server-rendered page is always visible. */
export function HomeMotion() {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const active = new Set<Animation>();
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
          if (!entry.isIntersecting) continue;
          const element = entry.target;
          if (element.matches('[data-reveal]') && !element.contains(document.activeElement)) {
            const stagger = Math.min(2, Math.max(0, Number(element.getAttribute('data-stagger')) || 0));
            const timeline = element.matches('[data-reveal="timeline-step"]');
            const card = element.matches('[data-reveal="card"]');
            play(element, [
              { translate: timeline ? '26px 0' : '0 28px', rotate: card ? '-1deg' : '0deg' },
              { translate: '0 0', rotate: '0deg' },
            ], {
              duration: 650, delay: stagger * 110, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards',
            });
            if (timeline) {
              const number = element.querySelector('span');
              if (number) play(number, [{ scale: '.8', rotate: '-12deg' }, { scale: '1', rotate: '0deg' }], {
                duration: 520, delay: stagger * 110, easing: 'cubic-bezier(.2,.7,.2,1)',
              });
            }
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
      document.querySelectorAll('.playful-site [data-reveal], .playful-site .doodle, .member-shell--preview [data-reveal]').forEach(element => {
        observer?.observe(element);
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
