'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { AuthLoadingSkeleton } from './auth-loading-skeleton';

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
  const pathname = usePathname();
  const view: AuthView = pathname === '/sign-up' ? 'create-account' : pathname === '/sign-in' ? 'sign-in' : initialView;
  const stageRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    stageRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [view]);

  const isSignIn = view === 'sign-in';
  const titleId = isSignIn ? 'sign-in-title' : 'create-account-title';

  if (pending) return <AuthLoadingSkeleton signup={isSignIn} />;

  return (
    <div className="auth-grid" data-auth-view={view}>
      <section className="auth-story auth-story-arrive" key={`story-${view}`} aria-label={isSignIn ? 'Welcome back' : 'New maker account'}>
        {isSignIn ? signInStory : createStory}
      </section>
      <div className="auth-card-stage" ref={stageRef}>
        <section
          className="auth-card auth-card-arrive"
          key={view}
          aria-labelledby={titleId}
          aria-live="polite"
        >
          {isSignIn ? signInPanel : createPanel}
          <div className="auth-account-switch">
            <span>{isSignIn ? 'New here?' : 'Have an account?'}</span>
            <Link href={isSignIn ? '/sign-up' : '/sign-in'} prefetch={false} onNavigate={() => setPending(true)}>
              {isSignIn ? <>Create a new account <ArrowUpRight size={16} aria-hidden="true" /></> : <><ArrowLeft size={16} aria-hidden="true" /> Back to sign in</>}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
