'use client';

import { useEffect } from 'react';

export function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => {
      console.error('IDEALAB offline support could not initialize.', error);
    });
  }, []);

  return null;
}
