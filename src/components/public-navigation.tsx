'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [['Explore', '/explore'], ['The lab', '/lab'], ['Projects', '/projects'], ['Events', '/events']];
const mobileLinks = [
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore' },
  { label: 'Lab', href: '/lab' },
  { label: 'Projects', href: '/projects' },
  { label: 'Events', href: '/events' },
];

function NavigationLinks() {
  const pathname = usePathname();
  return links.map(([label, href]) => <Link key={href} href={href}
    aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}>{label}</Link>);
}

export function DesktopNavigation() {
  return <nav className="desktop-nav" aria-label="Main navigation"><NavigationLinks /></nav>;
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
