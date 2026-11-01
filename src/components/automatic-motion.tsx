'use client';

import { Pause, Play } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const MOTION_PREFERENCE_KEY = 'idealab-mec:automatic-motion:v1';

type AutomaticMotionContextValue = {
  ready: boolean;
  allowed: boolean;
  paused: boolean;
  pauseForKeyboard: () => void;
  toggle: () => void;
};

const AutomaticMotionContext = createContext<AutomaticMotionContextValue | null>(null);

function setDocumentMotionPaused(paused: boolean) {
  const root = document.documentElement;
  if (paused) root.dataset.automaticMotion = 'paused';
  else root.removeAttribute('data-automatic-motion');
}

export function AutomaticMotionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [paused, setPaused] = useState(true);
  const keyboardPaused = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const userPaused = () => {
      try { return window.localStorage.getItem(MOTION_PREFERENCE_KEY) === 'paused'; }
      catch { return false; }
    };
    const syncPreference = () => {
      const canMove = !preference.matches;
      const shouldPause = !canMove || userPaused() || keyboardPaused.current;
      setAllowed(canMove);
      setPaused(shouldPause);
      setReady(true);
    };
    const onPreferenceChange = () => {
      if (preference.matches) setDocumentMotionPaused(true);
      syncPreference();
    };
    syncPreference();
    preference.addEventListener('change', onPreferenceChange);
    return () => preference.removeEventListener('change', onPreferenceChange);
  }, []);

  useEffect(() => {
    // The root stays paused through hydration. This effect runs after the
    // rendered header exposes its pause control, so motion cannot start first.
    setDocumentMotionPaused(!ready || !allowed || paused);
  }, [ready, allowed, paused]);

  const pauseForKeyboard = useCallback(() => {
    if (!allowed) return;
    keyboardPaused.current = true;
    setPaused(true);
    setDocumentMotionPaused(true);
  }, [allowed]);

  const toggle = useCallback(() => {
    if (!allowed) return;
    const next = !paused;
    if (!next) keyboardPaused.current = false;
    setPaused(next);
    setDocumentMotionPaused(next);
    try {
      if (next) window.localStorage.setItem(MOTION_PREFERENCE_KEY, 'paused');
      else window.localStorage.removeItem(MOTION_PREFERENCE_KEY);
    } catch {
      // In-memory control still works when browser storage is unavailable.
    }
  }, [allowed, paused]);

  const value = useMemo(() => ({ ready, allowed, paused, pauseForKeyboard, toggle }), [ready, allowed, paused, pauseForKeyboard, toggle]);
  return <AutomaticMotionContext.Provider value={value}>{children}</AutomaticMotionContext.Provider>;
}

export function useAutomaticMotion() {
  const context = useContext(AutomaticMotionContext);
  if (!context) throw new Error('Automatic motion controls require AutomaticMotionProvider.');
  return context;
}

export function AutomaticMotionControl() {
  const { ready, allowed, paused, toggle } = useAutomaticMotion();
  if (!ready || !allowed) return null;

  return (
    <button
      type="button"
      className="automatic-motion-control"
      onClick={toggle}
      aria-label={paused ? 'Resume automatic motion' : 'Pause automatic motion'}
      aria-controls="maker-ticker past-events-carousel quote-ticker"
      aria-describedby="automatic-motion-description"
      title={paused ? 'Resume automatic motion' : 'Pause automatic motion'}
    >
      {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
    </button>
  );
}
