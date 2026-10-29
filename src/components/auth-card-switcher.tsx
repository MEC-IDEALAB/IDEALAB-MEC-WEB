'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

export type AuthView = 'sign-in' | 'create-account';

type AuthCardSwitcherProps = {
  initialView: AuthView;
  signInStory: ReactNode;
  createStory: ReactNode;
  signInPanel: ReactNode;
  createPanel: ReactNode;
};

export function AuthCardSwitcher({
  initialView,
  signInStory,
  createStory,
  signInPanel,
  createPanel,
}: AuthCardSwitcherProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [hasSwitched, setHasSwitched] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const nextFocus = useRef(false);

  useEffect(() => {
    if (!nextFocus.current) return;
    stageRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    nextFocus.current = false;
  }, [view]);

  useEffect(() => {
    const restoreView = () => {
      setView(window.location.pathname === '/sign-up' ? 'create-account' : 'sign-in');
      setHasSwitched(true);
    };
    window.addEventListener('popstate', restoreView);
    return () => window.removeEventListener('popstate', restoreView);
  }, []);

  function switchView() {
    nextFocus.current = true;
    setHasSwitched(true);
    const next = view === 'sign-in' ? 'create-account' : 'sign-in';
    window.history.pushState(null, '', next === 'sign-in' ? '/sign-in' : '/sign-up');
    setView(next);
  }

  const isSignIn = view === 'sign-in';
  const titleId = isSignIn ? 'sign-in-title' : 'create-account-title';

  return (
    <div className="auth-grid" data-auth-view={view}>
      <section className={`auth-story${hasSwitched ? ' auth-story-arrive' : ''}`} key={`story-${view}`} aria-label={isSignIn ? 'Welcome back' : 'New maker account'}>
        {isSignIn ? signInStory : createStory}
      </section>
      <div className="auth-card-stage" ref={stageRef}>
        <section
          className={`auth-card${hasSwitched ? ' auth-card-arrive' : ''}`}
          key={view}
          aria-labelledby={titleId}
          aria-live="polite"
        >
          {isSignIn ? signInPanel : createPanel}
          <div className="auth-account-switch">
            <span>{isSignIn ? 'New here?' : 'Already have an account?'}</span>
            <button type="button" onClick={switchView} aria-label={isSignIn ? 'Create a new account' : 'Return to sign in'}>
              {isSignIn ? <>Create a new account <ArrowUpRight size={16} aria-hidden="true" /></> : <><ArrowLeft size={16} aria-hidden="true" /> Back to sign in</>}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
