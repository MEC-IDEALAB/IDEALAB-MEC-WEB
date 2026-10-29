import Link from 'next/link';
import { CalendarDays, ClipboardList, DoorOpen, FolderKanban } from 'lucide-react';

/** Grow's compact four-action pattern; destinations never imply live service. */
export function MemberQuickActions() {
  return <nav className="member-quick-actions" aria-label="Quick actions">
    {[
      { href: '/app/visits', label: 'Visit the lab', icon: DoorOpen, tone: 'yellow' },
      { href: '/app/requests', label: 'Requests', icon: ClipboardList, tone: 'blue' },
      { href: '/app/projects', label: 'Projects', icon: FolderKanban, tone: 'green' },
      { href: '/app/events', label: 'Events', icon: CalendarDays, tone: 'pink' },
    ].map(({ href, label, icon: Icon, tone }) => <Link href={href} key={href}>
      <span className={`quick-action-icon quick-action-icon--${tone}`}><Icon size={23} aria-hidden="true" /></span>
      <span>{label}</span>
    </Link>)}
  </nav>;
}
