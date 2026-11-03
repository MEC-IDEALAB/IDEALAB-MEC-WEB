'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Bell, CalendarDays, ClipboardList, DoorOpen, FlaskConical, FolderKanban, Home, Package, Settings2, UserRound } from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';
import { LabOverviewBanner, LabMotionSetting } from '@/components/lab-overview-banner';
import { HomeTickerBottom } from '@/components/home-ticker-bands';

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

export function MemberWorkspaceShell({ children, signOutControl, variant = 'member', activeScreen, activeLabel, previewPath = '/design/student' }: {
  children: ReactNode;
  signOutControl?: ReactNode;
  variant?: 'member' | 'preview';
  activeScreen?: string;
  activeLabel?: string;
  previewPath?: '/design/student' | '/design/member-space';
}) {
  const pathname = usePathname() ?? '/app';
  const preview = variant === 'preview';
  const cleanPreview = preview && previewPath === '/design/member-space';
  const activeId = preview ? activeScreen ?? 'home' : destinations.find(item => item.href === '/app'
    ? pathname === '/app' : pathname === item.href || pathname.startsWith(`${item.href}/`))?.id;
  const group = labLinks.some(item => item.id === activeId) ? 'lab'
    : profileLinks.some(item => item.id === activeId) ? 'profile' : 'home';
  const contextual = group === 'lab' ? labLinks : group === 'profile' ? profileLinks : [];
  const hrefFor = (id: string, href: string) => {
    if (!preview) return href;
    if (previewPath === '/design/member-space' && id === 'settings') return '/design/member-settings';
    return `${previewPath === '/design/member-space' && ['home', 'lab', 'profile'].includes(id) ? previewPath : '/design/student'}?screen=${id}`;
  };
  const pageLabel = activeLabel ?? destinations.find(item => item.id === activeId)?.label ?? 'Your space';
  const showLabBanner = activeId === 'lab' && (!preview || cleanPreview);

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
        {preview && !cleanPreview && <span className="member-preview-mode">Preview</span>}
        <ThemePicker />
        <Link className="member-notifications" href={hrefFor('notifications', '/app/notifications')}
          aria-label="Notifications" aria-current={activeId === 'notifications' ? 'page' : undefined}>
          <Bell size={20} aria-hidden="true" />
        </Link>
      </div>
    </header>
    {showLabBanner && <LabOverviewBanner />}
    {contextual.length > 0 && <div className={group === 'lab' ? 'member-lab-quick-access' : 'member-context-bar'}>
      {group === 'lab' && <h2>Quick access</h2>}
      <nav aria-label={`${group === 'lab' ? 'Lab' : 'Profile'} pages`}>
        {contextual.map(({ id, href, label, icon: Icon }) => <Link key={id} href={hrefFor(id, href)}
          aria-current={activeId === id ? 'page' : undefined}><Icon size={group === 'lab' ? 24 : 16} aria-hidden="true" /><span>{label}</span></Link>)}
      </nav>
      {group === 'profile' && !preview && <div className="member-sign-out">{signOutControl}</div>}
    </div>}
    <div className="member-main-column">
      {!cleanPreview && <div className="member-breadcrumb"><Link href="/">Public website</Link><span aria-hidden="true">/</span><span>{pageLabel}</span></div>}
      <main className="member-main-content" id="main-content" tabIndex={-1}>
        {children}
        {showLabBanner && <div className="playful-site discovery-landing-band"><HomeTickerBottom /></div>}
      </main>
      {showLabBanner && <LabMotionSetting />}
    </div>
  </div>;
}
