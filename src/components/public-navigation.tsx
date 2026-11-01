'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type MouseEvent } from 'react';
import { Menu } from 'lucide-react';

const links = [['Explore', '/explore'], ['The lab', '/lab'], ['Projects', '/projects'], ['Events', '/events']];
const mobileLinks = [
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore' },
  { label: 'Lab', href: '/lab' },
  { label: 'Projects', href: '/projects' },
  { label: 'Events', href: '/events' },
];

function NavigationLinks({ onSelect }: { onSelect?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  const pathname = usePathname();
  return links.map(([label, href]) => <Link key={href} href={href} onClick={onSelect}
    aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}>{label}</Link>);
}

export function DesktopNavigation() {
  return <nav className="desktop-nav" aria-label="Main navigation"><NavigationLinks /></nav>;
}

function dismiss(details: HTMLDetailsElement | null, restoreFocus = false) {
  if (!details?.open) return;
  if (restoreFocus) details.querySelector('summary')?.focus();
  details.open = false;
}

function focusDesktop(details: HTMLDetailsElement) {
  const desktop = details.closest('header')?.querySelector<HTMLElement>('.desktop-nav');
  (desktop?.querySelector<HTMLAnchorElement>('a[aria-current="page"]') ?? desktop?.querySelector<HTMLAnchorElement>('a'))?.focus();
}

export function MobileNavigation() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => { dismiss(detailsRef.current); }, [pathname]);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const outsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.contains(event.target)) {
        // Restore visible focus before the pointer's default action focuses its target.
        dismiss(details, details.contains(document.activeElement));
      }
    };
    // Keep this breakpoint aligned with the navigation rules in globals.css.
    const mobile = window.matchMedia('(max-width: 800px)');
    const resize = () => {
      if (mobile.matches) return;
      if (details.contains(document.activeElement)) {
        focusDesktop(details);
      }
      dismiss(details);
    };
    document.addEventListener('pointerdown', outsidePointer);
    mobile.addEventListener('change', resize);
    return () => {
      document.removeEventListener('pointerdown', outsidePointer);
      mobile.removeEventListener('change', resize);
    };
  }, []);

  const selectLink = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) dismiss(detailsRef.current, true);
  };

  return <details className="mobile-nav" ref={detailsRef}
    onKeyDown={event => {
      if (event.key === 'Escape' && detailsRef.current?.open) {
        event.preventDefault();
        dismiss(detailsRef.current, true);
      }
    }}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        // Hiding the focused control can blur it before the media-change listener runs.
        if (!event.relatedTarget && getComputedStyle(event.currentTarget).display === 'none') focusDesktop(event.currentTarget);
        dismiss(detailsRef.current);
      }
    }}>
    <summary aria-label="Navigation menu"><Menu size={23} aria-hidden="true" /></summary>
    <nav aria-label="Mobile navigation"><NavigationLinks onSelect={selectLink} /></nav>
  </details>;
}

/** Keep public mobile destinations together below the header, in document flow. */
export function MobileTopNavigation() {
  const pathname = usePathname();
  return (
    <nav className="public-mobile-topnav" aria-label="Mobile primary navigation">
      {mobileLinks.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}
        >
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
