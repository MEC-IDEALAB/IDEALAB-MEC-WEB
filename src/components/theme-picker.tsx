'use client';
import { useRef, useSyncExternalStore } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
type Theme = 'system' | 'light' | 'dark';
function current(): Theme { const value = document.documentElement.getAttribute('data-theme'); return value === 'dark' || value === 'light' ? value : 'system'; }
function subscribe(callback: () => void) {
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== 'idealab-mec:theme' && event.key !== null) return;
    document.documentElement.setAttribute('data-theme', event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'system');
    callback();
  };
  window.addEventListener('storage', storageChanged); window.addEventListener('idealab-theme', callback);
  return () => { window.removeEventListener('storage', storageChanged); window.removeEventListener('idealab-theme', callback); };
}
export function ThemePicker() {
  const theme = useSyncExternalStore(subscribe, current, () => 'system' as Theme);
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  function choose(value: Theme) {
    try { localStorage.setItem('idealab-mec:theme', value); } catch { /* Apply the theme even when browser persistence is blocked. */ }
    document.documentElement.setAttribute('data-theme', value);
    window.dispatchEvent(new Event('idealab-theme'));
    if (details.current) details.current.open = false;
    trigger.current?.focus();
  }
  return <details className="theme-picker" ref={details} onKeyDown={event => { if (event.key === 'Escape' && details.current) { details.current.open = false; trigger.current?.focus(); } }}><summary ref={trigger} aria-label="Color theme" title="Choose color theme"><Sun className="theme-sun" size={20} aria-hidden="true" /><Moon className="theme-moon" size={20} aria-hidden="true" /></summary><div className="theme-options" role="group" aria-label="Choose color theme">{([{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }] as const).map(({value,label,icon:Icon}) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => choose(value)}><Icon size={17} aria-hidden="true" />{label}<span aria-hidden="true">{theme === value ? '✓' : ''}</span></button>)}</div></details>;
}
