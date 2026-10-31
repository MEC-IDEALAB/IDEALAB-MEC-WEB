'use client';
import { useEffect } from 'react';

const MINIMUM_REVEAL_MS = 1220;
const READY_CHECK_LIMIT_MS = 1100;
const WATCHDOG_MS = 3600;
const EXIT_MS = 320;

export function BootReady() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.boot !== 'loading' && root.dataset.boot !== 'leaving') return;

    const content = document.getElementById('site-content');
    if (content) content.inert = true;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let finished = false;
    let readyTimer: number | undefined;
    let exitTimer: number | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(exitTimer);
      window.clearTimeout(readyTimer);
      window.clearTimeout(failSafeTimer);
      root.removeAttribute('data-boot');
      delete root.dataset.bootStarted;
      if (content) content.inert = false;
    };

    const leave = () => {
      if (finished) return;
      if (root.dataset.boot === 'loading') root.dataset.boot = 'leaving';
      if (root.dataset.boot !== 'leaving') {
        finish();
      } else if (reducedMotion.matches) {
        finish();
      } else if (exitTimer === undefined) {
        exitTimer = window.setTimeout(finish, EXIT_MS);
      }
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) leave();
    };
    reducedMotion.addEventListener('change', onMotionChange);
    const failSafeTimer = window.setTimeout(leave, WATCHDOG_MS);

    const showReadyState = async () => {
      if (reducedMotion.matches) {
        leave();
        return;
      }

      const fontsReady = document.fonts?.ready.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
      const priorityImages = [...document.images].filter(image => image.fetchPriority === 'high');
      const imagesReady = Promise.all(priorityImages.map(image => image.decode().catch(() => undefined)));
      await Promise.race([
        Promise.all([fontsReady, imagesReady]),
        new Promise<void>(resolve => window.setTimeout(resolve, READY_CHECK_LIMIT_MS)),
      ]);
      await new Promise<void>(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
      if (finished || root.dataset.boot !== 'loading') {
        leave();
        return;
      }

      const started = Number(root.dataset.bootStarted) || performance.now();
      const remaining = Math.max(0, MINIMUM_REVEAL_MS - (performance.now() - started));
      readyTimer = window.setTimeout(leave, remaining);
    };

    void showReadyState();
    return () => {
      reducedMotion.removeEventListener('change', onMotionChange);
      window.clearTimeout(exitTimer);
      window.clearTimeout(readyTimer);
      window.clearTimeout(failSafeTimer);
      if (content) content.inert = false;
    };
  }, []);
  return null;
}
