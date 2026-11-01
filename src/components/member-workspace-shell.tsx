'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Bell, CalendarDays, ClipboardList, DoorOpen, FlaskConical, FolderKanban, Home, Package, Settings2, UserRound } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';

const primary = [
  { id: 'home', href: '/app', label: 'Home', icon: Home },
  { id: 'lab', href: '/app/lab', label: 'Lab', icon: FlaskConical },
  { id: 'profile', href: '/app/profile', label: 'Profile', icon: UserRound },
] as const;
const labLinks = [
  { id: 'lab', href: '/app/lab', label: 'Overview', icon: FlaskConical },
  { id: 'requests', href: '/app/requests', label: 'Requests', icon: ClipboardList },
  { id: 'borrowing', href: '/app/borrowing', label: 'Borrowing', icon: Package },
  { id: 'events', href: '/app/events', label: 'Events', icon: CalendarDays },
  { id: 'visits', href: '/app/visits', label: 'Visits', icon: DoorOpen },
  { id: 'projects', href: '/app/projects', label: 'Projects', icon: FolderKanban },
] as const;
const profileLinks = [
  { id: 'profile', href: '/app/profile', label: 'Your details', icon: UserRound },
  { id: 'settings', href: '/app/settings', label: 'Settings', icon: Settings2 },
] as const;
const destinations = [...primary, ...labLinks, ...profileLinks, { id: 'notifications', href: '/app/notifications', label: 'Notifications', icon: Bell }];

export function MemberWorkspaceShell({ children, signOutControl, variant = 'member', activeScreen, activeLabel }: {
  children: ReactNode;
  signOutControl?: ReactNode;
  variant?: 'member' | 'preview';
  activeScreen?: string;
  activeLabel?: string;
}) {
  const pathname = usePathname() ?? '/app';
  const preview = variant === 'preview';
  const activeId = preview ? activeScreen ?? 'home' : destinations.find(item => item.href === '/app'
    ? pathname === '/app' : pathname === item.href || pathname.startsWith(`${item.href}/`))?.id;
  const group = labLinks.some(item => item.id === activeId) ? 'lab'
    : profileLinks.some(item => item.id === activeId) ? 'profile' : 'home';
  const contextual = group === 'lab' ? labLinks : group === 'profile' ? profileLinks : [];
  const hrefFor = (id: string, href: string) => preview ? `/design/student?screen=${id}` : href;
  const pageLabel = activeLabel ?? destinations.find(item => item.id === activeId)?.label ?? 'Your space';

  return <div className={`member-shell member-shell--topnav${preview ? ' member-shell--preview' : ''}`}>
    <header className="member-topbar">
      <Link className="member-brand" href={preview ? '/' : '/app'}>
        <span className="member-brand-mark" aria-hidden="true">IM</span>
        <span className="member-brand-name"><strong>IDEALAB</strong><small>MEC · MAKER SPACE</small></span>
      </Link>
      <nav className="member-primary-nav" aria-label="Primary workspace navigation">
        {primary.map(({ id, href, label, icon: Icon }) => <Link key={id} href={hrefFor(id, href)}
          aria-current={group === id ? activeId === id ? 'page' : 'location' : undefined}>
          <Icon size={18} aria-hidden="true" /><span>{label}</span>
        </Link>)}
      </nav>
      <div className="member-topbar-actions">
        {preview && <span className="member-preview-mode">Preview</span>}
        <ThemePicker />
        <Link className="member-notifications" href={hrefFor('notifications', '/app/notifications')}
          aria-label="Notifications" aria-current={activeId === 'notifications' ? 'page' : undefined}>
          <Bell size={20} aria-hidden="true" />
        </Link>
      </div>
    </header>
    {contextual.length > 0 && <div className="member-context-bar">
      <nav aria-label={`${group === 'lab' ? 'Lab' : 'Profile'} pages`}>
        {contextual.map(({ id, href, label, icon: Icon }) => <Link key={id} href={hrefFor(id, href)}
          aria-current={activeId === id ? 'page' : undefined}><Icon size={16} aria-hidden="true" />{label}</Link>)}
      </nav>
      {group === 'profile' && !preview && <div className="member-sign-out">{signOutControl}</div>}
    </div>}
    <div className="member-main-column">
      <div className="member-breadcrumb"><Link href="/">Public website</Link><span aria-hidden="true">/</span><span>{pageLabel}</span></div>
      <main className="member-main-content" id="main-content" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
