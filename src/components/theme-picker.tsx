'use client';
import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
function isDark() {
  const theme = document.documentElement.dataset.theme;
  return theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const storage = (event: StorageEvent) => {
    if (event.key !== 'idealab-mec:theme' && event.key !== null) return;
    document.documentElement.dataset.theme = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system';
    callback();
  };
  window.addEventListener('storage', storage); window.addEventListener('idealab-theme', callback); media.addEventListener('change', callback);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener('idealab-theme', callback); media.removeEventListener('change', callback); };
}
export function ThemePicker() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  function toggle() {
    const theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('idealab-mec:theme', theme); } catch { /* The immediate choice still applies. */ }
    document.documentElement.dataset.theme = theme;
    window.dispatchEvent(new Event('idealab-theme'));
  }
  return <button className="theme-toggle" type="button" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark} onClick={toggle}>{dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}</button>;
}
