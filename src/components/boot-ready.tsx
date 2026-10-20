'use client';
import { useEffect } from 'react';

export function BootReady() {
  useEffect(() => {
    document.documentElement.removeAttribute('data-boot');
  }, []);
  return null;
}
