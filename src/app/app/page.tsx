import Link from 'next/link';
import { ArrowUpRight, FilePlus2, FolderOpen, CalendarDays, FlaskConical } from 'lucide-react';
import { requireMember } from '@/lib/member';
export const metadata = { title: 'Your space' };
export default async function MemberHome({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { profile } = await requireMember();
  const { notice } = await searchParams;
  return <div className="workspace-page"><span className="eyebrow">A SPACE FOR YOUR IDEAS</span><h1>Hello, {profile?.name || 'maker'}.</h1><p>What will you work on today?</p><div className="workspace-hero"><div><span className="eyebrow">FROM IDEA TO SOMETHING REAL</span><h2>Bring your next<br />idea to the lab.</h2><p>Request machine work or support from Operations. Your responsible head reviews the next steps.</p><Link className="button button-primary" href="/app/requests/new">Start a Work Request <ArrowUpRight size={18} /></Link></div><FilePlus2 size={100} strokeWidth={1} aria-hidden="true" /></div>
    {notice === 'signout' && <div className="notice" role="alert">We couldn’t sign you out. You are still signed in. Please try Sign out again.</div>}
    <div className="workspace-grid">{[{ href: '/app/lab', icon: FlaskConical, title: 'Lab & visits', text: 'Check-in and access information.' }, { href: '/app/projects', icon: FolderOpen, title: 'Your projects', text: 'A place for what you’re building.' }, { href: '/app/events', icon: CalendarDays, title: 'Events & workshops', text: 'Learn, meet and make together.' }].map(({ href, icon: Icon, title, text }) => <Link className="workspace-card" key={href} href={href}><Icon /><h3>{title}</h3><p>{text}</p><ArrowUpRight size={20} /></Link>)}</div>
  </div>;
}
