import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowUpRight, CalendarDays, ClipboardList, DoorOpen, FolderKanban, Package } from 'lucide-react';

const destinations = {
  requests: { href: '/app/requests', icon: ClipboardList, title: 'Work requests', text: 'Prepare machine work or Operations support. Keep your draft together before talking to the lab.', detail: 'Browser drafts · online submission unavailable', accent: 'var(--accent-yellow)' },
  borrowing: { href: '/app/borrowing', icon: Package, title: 'Borrowing', text: 'Find the next step for shared tools, equipment handoffs and returns.', detail: 'Live catalog not connected', accent: 'var(--accent-blue)' },
  events: { href: '/app/events', icon: CalendarDays, title: 'Events & workshops', text: 'Make time to learn, experiment and meet other makers.', detail: 'Live registration not connected', accent: 'var(--accent-pink)' },
  visits: { href: '/app/visits', icon: DoorOpen, title: 'Visit the lab', text: 'Check the opening status, record your visit and see your own history.', detail: 'Your check-in, checkout & history', accent: 'var(--accent-green)' },
  projects: { href: '/app/projects', icon: FolderKanban, title: 'Projects', text: 'Bring your curiosity to a build, start a team or request to join with a code.', detail: 'Discover · create · request to join', accent: 'var(--accent-purple)' },
} as const;

export function WorkspaceDestinations({ items, testRequestIntake = false }: { items: Array<keyof typeof destinations>; testRequestIntake?: boolean }) {
  return <div className="workspace-grid">{items.map(id => {
    const { href, icon: Icon, title, text, detail, accent } = destinations[id];
    return <Link className="workspace-card" href={href} key={id} style={{ '--card-accent': accent } as CSSProperties}>
      <span className="workspace-card-icon"><Icon size={24} aria-hidden="true" /></span>
      <ArrowUpRight className="workspace-card-arrow" size={21} aria-hidden="true" />
      <h3>{title}</h3><p>{id === 'requests' && testRequestIntake ? 'Prepare a private test request, view its saved details and track your own history.' : text}</p><span className="workspace-card-kicker">{id === 'requests' && testRequestIntake ? 'Isolated test intake · no staff review' : detail}</span>
    </Link>;
  })}</div>;
}
