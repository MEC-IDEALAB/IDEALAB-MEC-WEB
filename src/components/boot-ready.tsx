'use client';
import { useEffect } from 'react';
import {
  BRAND_LOADING_EXIT_MS,
  BRAND_LOADING_MINIMUM_REVEAL_MS,
  BRAND_LOADING_READY_CHECK_LIMIT_MS,
  BRAND_LOADING_WATCHDOG_MS,
} from '@/lib/brand-loading';

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
    const bootStarted = Number(root.dataset.bootStarted) || performance.now();

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(exitTimer);
      window.clearTimeout(readyTimer);
      window.clearTimeout(failSafeTimer);
      root.removeAttribute('data-boot');
      delete root.dataset.bootStarted;
      delete root.dataset.bootVisualStarted;
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
        exitTimer = window.setTimeout(finish, BRAND_LOADING_EXIT_MS);
      }
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) leave();
    };
    reducedMotion.addEventListener('change', onMotionChange);
    const failSafeTimer = window.setTimeout(leave, Math.max(0, BRAND_LOADING_WATCHDOG_MS - (performance.now() - bootStarted)));

    const showReadyState = async () => {
      if (reducedMotion.matches) {
        leave();
        return;
      }

      const fontsReady = document.fonts?.ready.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
      const priorityImages = [...document.images].filter(image => image.fetchPriority === 'high');
      const imagesReady = Promise.all(priorityImages.map(image => image.decode().catch(() => undefined)));
      const visualReady = Number(root.dataset.bootVisualStarted) > 0 || root.dataset.boot !== 'loading'
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            const observer = new MutationObserver(() => {
              if (Number(root.dataset.bootVisualStarted) <= 0 && root.dataset.boot === 'loading') return;
              observer.disconnect();
              resolve();
            });
            observer.observe(root, { attributes: true, attributeFilter: ['data-boot-visual-started', 'data-boot'] });
          });
      const assetsReady = Promise.race([
        Promise.all([fontsReady, imagesReady]),
        new Promise<void>(resolve => window.setTimeout(resolve, BRAND_LOADING_READY_CHECK_LIMIT_MS)),
      ]);
      await Promise.all([assetsReady, visualReady]);
      await new Promise<void>(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())));
      if (finished || root.dataset.boot !== 'loading') {
        leave();
        return;
      }

      const started = Number(root.dataset.bootVisualStarted) || Number(root.dataset.bootStarted) || performance.now();
      const remaining = Math.max(0, BRAND_LOADING_MINIMUM_REVEAL_MS - (performance.now() - started));
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
