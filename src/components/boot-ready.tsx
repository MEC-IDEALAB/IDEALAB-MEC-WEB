'use client';
import { useEffect } from 'react';
import {
  BRAND_LOADING_EXIT_MS,
  BRAND_LOADING_MINIMUM_DURATION_MS,
  BRAND_LOADING_READY_CHECK_LIMIT_MS,
  BRAND_LOADING_WATCHDOG_MS,
} from '@/lib/brand-loading';

export function BootReady() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.boot !== 'loading' && root.dataset.boot !== 'leaving') return;

    root.dataset.bootHydrated = '1';
    const content = document.getElementById('site-content');
    if (content) content.inert = true;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const explicitlyRequestedMotion = root.dataset.bootMotion === 'requested';
    let finished = false;
    let readyTimer: number | undefined;
    let exitTimer: number | undefined;
    const bootStarted = Number(root.dataset.bootStarted) || performance.now();

    const finish = () => {
      if (finished) return;
      finished = true;
      const focusWasInIntro = Boolean(document.activeElement?.closest('.boot-loader'));
      window.clearTimeout(exitTimer);
      window.clearTimeout(readyTimer);
      window.clearTimeout(failSafeTimer);
      root.removeAttribute('data-boot');
      delete root.dataset.bootStarted;
      delete root.dataset.bootVisualStarted;
      delete root.dataset.bootHydrated;
      delete root.dataset.bootMotion;
      if (content) content.inert = false;
      if (focusWasInIntro) document.querySelector<HTMLAnchorElement>('.skip-link')?.focus({ preventScroll: true });
    };

    const leave = () => {
      if (finished) return;
      if (root.dataset.boot === 'loading') root.dataset.boot = 'leaving';
      if (root.dataset.boot !== 'leaving') {
        finish();
      } else if (reducedMotion.matches && !explicitlyRequestedMotion) {
        finish();
      } else if (exitTimer === undefined) {
        exitTimer = window.setTimeout(finish, BRAND_LOADING_EXIT_MS);
      }
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches && !explicitlyRequestedMotion) leave();
    };
    reducedMotion.addEventListener('change', onMotionChange);
    const failSafeTimer = window.setTimeout(() => {
      if (Number(root.dataset.bootVisualStarted) > 0) return;
      leave();
    }, Math.max(0, BRAND_LOADING_WATCHDOG_MS - (performance.now() - bootStarted)));

    const showReadyState = async () => {
      if (reducedMotion.matches && !explicitlyRequestedMotion) {
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

      const visualStarted = Number(root.dataset.bootVisualStarted) || bootStarted;
      const remaining = Math.max(0, BRAND_LOADING_MINIMUM_DURATION_MS - (performance.now() - visualStarted));
      readyTimer = window.setTimeout(leave, remaining);
    };

    window.addEventListener('idealab-skip-intro', finish);
    void showReadyState();
    return () => {
      reducedMotion.removeEventListener('change', onMotionChange);
      window.removeEventListener('idealab-skip-intro', finish);
      window.clearTimeout(exitTimer);
      window.clearTimeout(readyTimer);
      window.clearTimeout(failSafeTimer);
      if (content) content.inert = false;
    };
  }, []);
  return null;
}
