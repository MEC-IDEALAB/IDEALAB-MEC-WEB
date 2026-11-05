'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Pause, Play } from 'lucide-react';
import { useAutomaticMotion } from './automatic-motion';

/** A local dot field inspired by the supplied sign-in reference. */
export function AuthPixelBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const pathname = usePathname();
  const { allowed, paused } = useAutomaticMotion();

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    let frame = 0;
    let lastFrame = 0;
    let width = 0;
    let height = 0;
    const signup = pathname === '/sign-up';
    const colors = signup ? ['#ff3994', '#b49aff', '#ffe029'] : ['#ffe029', '#315dff', '#7aafff'];

    function draw() {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const spacing = width < 600 ? 25 : 30;
      for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
          const column = x / spacing;
          const row = y / spacing;
          const seed = (column * 17 + row * 31) % 23;
          const wave = (Math.sin(column * .21 + row * .17 - phaseRef.current) + 1) / 2;
          context.globalAlpha = .08 + wave * .22;
          context.fillStyle = colors[seed % colors.length];
          const size = seed % 7 === 0 ? 5 : 2;
          context.fillRect(x, y, size, size);
        }
      }
      context.globalAlpha = 1;
      element!.dataset.drawn = 'true';
    }
    function resize() {
      const bounds = element!.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      element!.width = Math.round(width * ratio);
      element!.height = Math.round(height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }
    function animate(time: number) {
      frame = 0;
      if (time - lastFrame >= 50) {
        phaseRef.current += Math.min(time - lastFrame, 100) / 1800;
        lastFrame = time;
        draw();
      }
      frame = requestAnimationFrame(animate);
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      if (allowed && !paused && !document.hidden) {
        lastFrame = performance.now();
        frame = requestAnimationFrame(animate);
      }
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [allowed, paused, pathname]);

  return <canvas ref={canvas} id="auth-pixel-background" className="auth-pixel-background" aria-hidden="true" />;
}

export function AuthPixelMotionControl() {
  const { ready, allowed, paused, toggle } = useAutomaticMotion();
  if (!ready || !allowed) return null;
  return <button type="button" className="auth-pixel-motion" onClick={toggle} aria-controls="auth-pixel-background" aria-label={paused ? 'Resume background motion' : 'Pause background motion'} title={paused ? 'Resume background motion' : 'Pause background motion'}>
    {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
  </button>;
}
