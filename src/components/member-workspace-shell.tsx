'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  DoorOpen,
  FlaskConical,
  FolderKanban,
  Home,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  UserRound,
} from 'lucide-react';
import { ThemePicker } from '@/components/theme-picker';

const primary = [
  { id: 'home', href: '/app', label: 'Home', icon: Home },
  { id: 'lab', href: '/app/lab', label: 'Lab', icon: FlaskConical },
  { id: 'requests', href: '/app/requests', label: 'Requests', sidebarLabel: 'Work requests', icon: ClipboardList },
  { id: 'profile', href: '/app/profile', label: 'Profile', icon: UserRound },
] as const;

const moreLinks = [
  { id: 'projects', href: '/app/projects', label: 'Projects', icon: FolderKanban },
  { id: 'events', href: '/app/events', label: 'Events', icon: CalendarDays },
  { id: 'notifications', href: '/app/notifications', label: 'Notifications', icon: Bell },
  { id: 'visits', href: '/app/visits', label: 'Visits', icon: DoorOpen },
  { id: 'borrowing', href: '/app/borrowing', label: 'Borrowing', icon: Package },
  { id: 'settings', href: '/app/settings', label: 'Settings', icon: Settings2 },
] as const;

type NavigationId = (typeof primary)[number]['id'] | (typeof moreLinks)[number]['id'];

export function MemberWorkspaceShell({
  children,
  signOutControl,
  variant = 'member',
  activeScreen,
  activeLabel,
}: {
  children: ReactNode;
  signOutControl?: ReactNode;
  variant?: 'member' | 'preview';
  activeScreen?: string;
  activeLabel?: string;
}) {
  const pathname = usePathname() ?? '/app';
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpenPath, setMoreOpenPath] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const preview = variant === 'preview';
  const navigation = [...primary, ...moreLinks];
  const activeId: NavigationId | undefined = preview
    ? navigation.find(item => item.id === activeScreen)?.id
    : navigation.find(item => item.href === '/app' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`))?.id;
  const isCurrent = (id: NavigationId) => activeId === id;
  const hrefFor = (id: NavigationId, href: string) => preview ? `/design/student?screen=${id}` : href;
  const moreIsCurrent = moreLinks.some(item => isCurrent(item.id));
  const labelFor = (id: NavigationId) => [...primary, ...moreLinks].find(item => item.id === id)?.label ?? 'Your space';
  const pageLabel = preview ? activeLabel ?? labelFor(activeId ?? 'home') : labelFor(activeId ?? 'home');
  const currentPath = preview ? activeScreen ?? 'home' : pathname;
  const moreOpen = moreOpenPath === currentPath;

  useEffect(() => {
    if (!moreOpen) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !moreRef.current?.contains(event.target)) setMoreOpenPath(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setMoreOpenPath(null);
      moreButtonRef.current?.focus();
    }
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [moreOpen]);

  useEffect(() => {
    function closeOnHistoryNavigation() {
      setMoreOpenPath(null);
    }
    window.addEventListener('popstate', closeOnHistoryNavigation);
    return () => window.removeEventListener('popstate', closeOnHistoryNavigation);
  }, []);

  return (
    <div className={`member-shell${preview ? ' member-shell--preview student-preview-app' : ''}${collapsed ? ' member-shell--collapsed student-preview-sidebar-collapsed' : ''}`}>
      <aside className={`member-sidebar${preview ? ' student-preview-sidebar' : ''}`} aria-label={preview ? 'Student workspace navigation' : 'Member workspace navigation'}>
        <div className="member-sidebar-heading">
          <Link className={`member-brand${preview ? ' student-preview-brand' : ''}`} href={preview ? '/' : '/app'} aria-label={preview ? 'IDEALAB MEC public homepage' : 'IDEALAB MEC workspace home'}>
            <span className={`member-brand-mark${preview ? ' student-preview-brand-mark' : ''}`} aria-hidden="true">IM</span>
            <span className="member-brand-name"><strong>IDEALAB</strong><small>MODEL ENGINEERING COLLEGE</small></span>
          </Link>
          <button
            className={`member-sidebar-toggle${preview ? ' student-preview-sidebar-toggle' : ''}`}
            type="button"
            aria-label={collapsed ? 'Expand workspace sidebar' : 'Collapse workspace sidebar'}
            aria-expanded={!collapsed}
            aria-controls="member-sidebar-navigation"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(value => !value)}
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
        </div>

        <nav className={`member-sidebar-nav${preview ? ' student-preview-side-nav' : ''}`} id="member-sidebar-navigation" aria-label="Workspace pages">
          <span className="member-nav-label student-preview-nav-label">YOUR SPACE</span>
          {primary.map(item => {
            const { id, href, label, icon: Icon } = item;
            const sidebarLabel = 'sidebarLabel' in item ? item.sidebarLabel : label;
            return (
              <Link className={`member-nav-link${preview ? ' student-preview-nav-link' : ''}`} href={hrefFor(id, href)} aria-label={sidebarLabel} title={collapsed ? sidebarLabel : undefined} aria-current={isCurrent(id) ? 'page' : undefined} key={href}>
                <Icon size={19} aria-hidden="true" /><span className={`member-nav-copy${preview ? ' student-preview-nav-text' : ''}`}>{sidebarLabel}</span>
              </Link>
            );
          })}
          <span className="member-nav-label member-nav-label-modules student-preview-nav-label student-preview-nav-label-modules">MORE PAGES</span>
          {moreLinks.filter(item => item.id !== 'settings').map(({ id, href, label, icon: Icon }) => (
            <Link className={`member-nav-link${preview ? ' student-preview-nav-link' : ''}`} href={hrefFor(id, href)} aria-label={label} title={collapsed ? label : undefined} aria-current={isCurrent(id) ? 'page' : undefined} key={href}>
              <Icon size={19} aria-hidden="true" /><span className={`member-nav-copy${preview ? ' student-preview-nav-text' : ''}`}>{label}</span>
            </Link>
          ))}
        </nav>

        <div className={`member-sidebar-bottom${preview ? ' student-preview-sidebar-bottom' : ''}`}>
          <Link className={`member-nav-link member-nav-settings${preview ? ' student-preview-nav-link student-preview-settings-link' : ''}`} href={hrefFor('settings', '/app/settings')} aria-label="Settings" title={collapsed ? 'Settings' : undefined} aria-current={isCurrent('settings') ? 'page' : undefined}>
            <Settings2 size={19} aria-hidden="true" /><span className={`member-nav-copy${preview ? ' student-preview-nav-text' : ''}`}>Settings</span>
          </Link>
          {preview ? (
            <><span className="student-preview-sidebar-caption">MADE FOR MAKERS</span><span className="student-preview-side-doodle" aria-hidden="true">✳ <span>IDEA → LAB</span></span></>
          ) : (
            <><Link className="member-sidebar-utility" href="/">Visit public website</Link><div className="member-sidebar-utility member-sign-out">{signOutControl ?? <span><LogOut size={18} aria-hidden="true" /> Sign out</span>}</div></>
          )}
        </div>
      </aside>

      <div className={`member-main-column${preview ? ' student-preview-main-column' : ''}`}>
        <header className={`member-topbar${preview ? ' student-preview-topbar' : ''}`}>
          <div className="member-breadcrumb"><span>{preview ? 'Student space' : 'IDEALAB MEC'}</span><span aria-hidden="true">/</span><strong>{pageLabel}</strong></div>
          <div className={`member-topbar-actions${preview ? ' student-preview-topbar-actions' : ''}`}>
            {preview && <span className="member-preview-mode student-preview-user"><UserRound size={17} aria-hidden="true" /><span>Preview mode</span></span>}
            <ThemePicker />
            <Link className={`member-notifications${preview ? ' student-preview-notification-button' : ''}`} href={hrefFor('notifications', '/app/notifications')} aria-label="Notifications" title="Notifications" aria-current={isCurrent('notifications') ? 'page' : undefined}>
              <Bell size={20} aria-hidden="true" /><span>Notifications</span>
            </Link>
          </div>
        </header>
        <main className="member-main-content" id="main-content" tabIndex={-1}>{children}</main>
      </div>

      <nav className={`member-mobile-nav${preview ? ' student-preview-mobile-nav' : ''}`} aria-label={preview ? 'Student primary navigation' : 'Primary workspace navigation'}>
        {primary.map(({ id, href, label, icon: Icon }) => (
          <Link className="member-mobile-link" href={hrefFor(id, href)} aria-current={isCurrent(id) ? 'page' : undefined} key={href}>
            <Icon size={19} aria-hidden="true" /><span>{label}</span>
          </Link>
        ))}
        <div
          className="member-mobile-more"
          ref={moreRef}
          onBlurCapture={event => {
            const next = event.relatedTarget;
            if (!(next instanceof Node) || !event.currentTarget.contains(next)) setMoreOpenPath(null);
          }}
        >
          <button
            className={`member-mobile-link member-mobile-more-button${preview ? ' student-preview-mobile-more-button' : ''}`}
            type="button"
            aria-expanded={moreOpen}
            aria-controls="member-mobile-more-links"
            aria-current={moreIsCurrent ? 'location' : undefined}
            aria-label={moreOpen ? 'Close more workspace pages' : 'More workspace pages'}
            ref={moreButtonRef}
            onClick={() => setMoreOpenPath(value => value === currentPath ? null : currentPath)}
          >
            <span className="member-more-icon"><ChevronDown size={17} aria-hidden="true" /></span><span>More</span>
          </button>
          <ul className="member-mobile-more-links" id="member-mobile-more-links" hidden={!moreOpen}>
            {moreLinks.map(({ id, href, label, icon: Icon }) => (
              <li key={href}><Link href={hrefFor(id, href)} onClick={() => setMoreOpenPath(null)} aria-current={isCurrent(id) ? 'page' : undefined}><Icon size={17} aria-hidden="true" /><span>{label}</span></Link></li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}
